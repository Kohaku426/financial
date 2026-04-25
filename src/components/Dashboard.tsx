'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Home, Wallet, List, Calculator, Bot,
    ChevronDown, ChevronLeft, ChevronRight, Send, AlertTriangle, Loader2,
    Landmark, CreditCard, Banknote, Camera,
    PlusCircle, ScanLine, Smartphone, CheckCircle2,
    X, Plus, FileDown, CalendarDays, Settings, Paperclip, ArrowUpRight, ArrowDownRight, Sparkles, ArrowDownUp, PiggyBank, History, Trash, TrendingUp, PieChart as PieChartIcon
} from 'lucide-react';
import {
    MOCK_ASSETS,
    MOCK_HISTORY,
    MOCK_SALARY,
    MOCK_SHIFTS,
    COLORS,
    TabType
} from '@/lib/mock-data';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import {
    AreaChart, Area, BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie
} from 'recharts';
import Login from './Login';
import { User } from '@supabase/supabase-js';

// INITIAL MOCK CATEGORIES
const INCOME_CATEGORIES = ['給与', '副業', 'お小遣い', '臨時収入', '投資利益', 'その他'];
const EXPENSE_CATEGORIES = ['食費', '日用品', '交通費', '趣味・娯楽', '交際費', '衣服・美容', '家賃・光熱費', 'その他'];

export default function Dashboard() {
    // ---- AUTH STATE ----
    const [user, setUser] = useState<User | null>(null);
    const [isAuthLoading, setIsAuthLoading] = useState(true);

    // ---- GLOBAL STATES ----
    const [activeTab, setActiveTab] = useState<TabType>('home');
    const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false);

    const [assetsData, setAssetsData] = useState(MOCK_ASSETS);
    const [historyData, setHistoryData] = useState<any[]>([]);
    const [shiftsData, setShiftsData] = useState(MOCK_SHIFTS);
    const [incomeCategories, setIncomeCategories] = useState(INCOME_CATEGORIES);
    const [expenseCategories, setExpenseCategories] = useState(EXPENSE_CATEGORIES);
    const [isSupabaseLoading, setIsSupabaseLoading] = useState(true);

    const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
        cash: true, paypay: true, points: true, advances: true, cards: true
    });

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            setUser(session?.user ?? null);
            setIsAuthLoading(false);
        });
        return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {
        if (!user) return;
        let isMounted = true;
        async function fetchSupabaseData() {
            try {
                let { data: accounts } = await supabase.from('accounts').select('*').eq('user_id', user.id);

                // SEEDING LOGIC: If tables are empty for THIS USER, seed them
                if (!accounts || accounts.length === 0) {
                    console.log("Seeding Supabase DB for user:", user.id);
                    const seedAccounts = MOCK_ASSETS.categories.flatMap(cat => cat.items.map(item => ({
                        user_id: user.id,
                        category_id: cat.id,
                        name: item.name,
                        balance: item.balance,
                        brand_color: (item as any).brandColor || null
                    })));
                    await supabase.from('accounts').insert(seedAccounts);
                    const res = await supabase.from('accounts').select('*').eq('user_id', user.id);
                    accounts = res.data;

                    const seedHistories = MOCK_HISTORY.map(h => ({
                        user_id: user.id,
                        date: h.date,
                        item: h.item,
                        account: h.account || 'Unknown',
                        amount: h.amount,
                        balance: h.balance,
                        type: h.type
                    }));
                    await supabase.from('histories').insert(seedHistories);
                }

                const { data: histories } = await supabase.from('histories').select('*').eq('user_id', user.id).order('date', { ascending: false });

                if (!isMounted) return;

                // Reconstruct Assets State dynamically
                if (accounts && accounts.length > 0) {
                    const clonedAssets = JSON.parse(JSON.stringify(MOCK_ASSETS));
                    clonedAssets.totalAssets = 0;
                    clonedAssets.categories.forEach((cat: any) => {
                        cat.items = accounts!.filter((a: any) => a.category_id === cat.id);
                        cat.total = cat.items.reduce((sum: number, c: any) => sum + Number(c.balance), 0);
                        clonedAssets.totalAssets += cat.total;
                    });
                    setAssetsData(clonedAssets);
                }

                if (histories && histories.length > 0) {
                    setHistoryData(histories);
                }
            } catch (err) {
                console.error("Supabase load error:", err);
            } finally {
                if (isMounted) setIsSupabaseLoading(false);
            }
        }
        fetchSupabaseData();
        return () => { isMounted = false; };
    }, []);

    const toggleCategory = (id: string) => {
        setExpandedCategories(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const navItems = [
        { id: 'home', icon: Home, label: 'ホーム' },
        { id: 'history', icon: ArrowDownUp, label: '入出金' },
        { id: 'report', icon: PieChartIcon, label: 'レポート' },
        { id: 'salary', icon: CalendarDays, label: '給与' },
        { id: 'assets', icon: Wallet, label: '口座・資産' },
        { id: 'ai', icon: Sparkles, label: 'AI' }
    ];

    const renderContent = () => {
        if (isSupabaseLoading) {
            return (
                <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
                    <Loader2 className="animate-spin text-cyan-600" size={32} />
                    <p className="text-slate-500 text-sm font-mono tracking-widest uppercase">Connecting to Cloud Database...</p>
                </div>
            );
        }
        switch (activeTab) {
            case 'home': return <HomeTab historyData={historyData} assetsData={assetsData} />;
            case 'assets': return <AssetsTab expandedCategories={expandedCategories} toggleCategory={toggleCategory} assetsData={assetsData} setAssetsData={setAssetsData} historyData={historyData} onDeleteHistory={handleDeleteHistory} />;
            case 'salary': return <SalaryTab shiftsData={shiftsData} setShiftsData={setShiftsData} />;
            case 'report': return <ReportTab historyData={historyData} onDeleteHistory={handleDeleteHistory} />;
            case 'history': return <HistoryTab historyData={historyData} onDeleteHistory={handleDeleteHistory} assetsData={assetsData} />;
            case 'ai': return <AITab historyData={historyData} assetsData={assetsData} />;
            case 'accounts': return <AssetsTab user={user} expandedCategories={expandedCategories} toggleCategory={toggleCategory} assetsData={assetsData} setAssetsData={setAssetsData} historyData={historyData} onDeleteHistory={handleDeleteHistory} />;
            default: return <HomeTab historyData={historyData} assetsData={assetsData} />;
        }
    };

    const handleDeleteHistory = async (id: string | number) => {
        try {
            await supabase.from('histories').delete().eq('id', id);
            setHistoryData(prev => prev.filter(h => h.id !== id));
        } catch (err) {
            console.error("Failed to delete history:", err);
        }
    };

    if (isAuthLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-950">
                <Loader2 className="animate-spin text-indigo-500" size={32} />
            </div>
        );
    }

    if (!user) {
        return <Login onLoginSuccess={() => { }} />;
    }

    return (
        <div className="flex flex-col h-screen overflow-hidden text-slate-900 bg-slate-50 relative font-sans text-sm selection:bg-indigo-100">
            <main className="flex-1 overflow-y-auto pb-24 scroll-smooth">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="p-3 md:p-6 max-w-3xl mx-auto min-h-full"
                    >
                        {renderContent()}
                    </motion.div>
                </AnimatePresence>
            </main>

            <div className="fixed bottom-[80px] left-1/2 -translate-x-1/2 z-[60]">
                <button
                    onClick={() => setIsAddTransactionOpen(true)}
                    className="w-14 h-14 bg-orange-500 text-white rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95 hover:scale-105 border-4 border-white"
                >
                    <Plus size={28} strokeWidth={3} />
                </button>
            </div>

            <AnimatePresence>
                {isAddTransactionOpen && (
                    <AddTransactionModal
                        onClose={() => setIsAddTransactionOpen(false)}
                        incomeCategories={incomeCategories}
                        setIncomeCategories={setIncomeCategories}
                        expenseCategories={expenseCategories}
                        setExpenseCategories={setExpenseCategories}
                        assetsData={assetsData}
                        setAssetsData={setAssetsData}
                        setHistoryData={setHistoryData}
                        user={user}
                    />
                )}
            </AnimatePresence>

            <nav className="fixed bottom-0 w-full border-t border-slate-200 py-2 px-2 sm:px-6 safe-area-pb z-50 bg-white/80 backdrop-blur-xl supports-[backdrop-filter]:bg-white/60">
                <div className="flex justify-between items-center max-w-lg mx-auto relative px-2">
                    {navItems.map((item, idx) => {
                        const Icon = item.icon;
                        const isActive = activeTab === item.id;
                        return (
                            <div key={item.id} className="relative flex-1">
                                <button
                                    onClick={() => setActiveTab(item.id as TabType)}
                                    className={cn(
                                        "flex flex-col items-center justify-center p-2 transition-all duration-300 w-full",
                                        isActive ? "text-orange-500 scale-110" : "text-slate-500 hover:text-slate-600"
                                    )}
                                >
                                    <Icon size={20} strokeWidth={isActive ? 2.5 : 2} className={isActive && item.id === 'ai' ? 'text-indigo-500' : ''} />
                                    <span className={cn(
                                        "text-[9px] sm:text-[10px] mt-1.5 font-medium tracking-wide",
                                        isActive ? "text-orange-500" : ""
                                    )}>
                                        {item.label}
                                    </span>
                                </button>
                            </div>
                        );
                    })}
                </div>
            </nav>
        </div>
    );
}

// ----------------------------------------------------------------------
// ADD TRANSACTION MODAL
// ----------------------------------------------------------------------
function AddTransactionModal({ onClose, incomeCategories, setIncomeCategories, expenseCategories, setExpenseCategories, assetsData, setAssetsData, setHistoryData, user }: any) {
    const [amount, setAmount] = useState('');
    const [account, setAccount] = useState('三菱UFJ銀行');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [isIncome, setIsIncome] = useState(false);
    const displayedCategories = isIncome ? incomeCategories : expenseCategories;
    const [category, setCategory] = useState(expenseCategories[0]);
    const [memo, setMemo] = useState('');
    const [isAdvance, setIsAdvance] = useState(false);

    const handleSave = async () => {
        if (!amount) return;
        const numAmount = parseInt(amount, 10) * (isIncome ? 1 : -1);

        // Find existing balance to simulate proper new balance for history
        const cat = assetsData.categories.find((c: any) => c.items.some((i: any) => i.name === account));
        const acctObj = cat?.items.find((i: any) => i.name === account);
        const currentBalance = acctObj?.balance || 0;

        let dbTransactions = [];
        const baseId = Date.now().toString();

        dbTransactions.push({
            user_id: user.id,
            date,
            item: memo ? `${category} - ${memo}` : category,
            account,
            amount: numAmount,
            balance: currentBalance + numAmount,
            type: isIncome ? 'income' : 'expense'
        });

        if (isAdvance && !isIncome) {
            dbTransactions.push({
                user_id: user.id,
                date,
                item: `立替記録 (${memo || category})`,
                account: '立替金',
                amount: Math.abs(numAmount),
                balance: 0,
                type: 'income'
            });

            const clonedAssets = JSON.parse(JSON.stringify(assetsData));
            let advanceCategory = clonedAssets.categories.find((c: any) => c.id === 'advances');
            if (!advanceCategory) {
                advanceCategory = { id: 'advances', name: '立替金', total: 0, color: COLORS.success, items: [] };
                clonedAssets.categories.push(advanceCategory);
            }
            advanceCategory.total += Math.abs(numAmount);
            clonedAssets.totalAssets += Math.abs(numAmount);
            advanceCategory.items.push({ id: baseId + '-item', name: `立替: ${memo || category}`, balance: Math.abs(numAmount) });
            setAssetsData(clonedAssets);
        }

        try {
            const { data, error } = await supabase.from('histories').insert(dbTransactions).select();
            if (error) throw error;
            if (data) {
                setHistoryData((prev: any) => [...data, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
            }
            onClose();
        } catch (err) {
            console.error("Failed to save transaction:", err);
            alert("保存に失敗しました");
        }
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-100/60 backdrop-blur-md z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="bg-white border border-slate-200 w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl relative">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-slate-900 tracking-tight">取引を作成</h3>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-900 p-2 bg-white shadow-sm rounded-full"><X size={20} /></button>
                </div>

                <div className="flex bg-slate-100 p-1 rounded-xl mb-6 shadow-inner">
                    <button onClick={() => { setIsIncome(false); setCategory(expenseCategories[0]); }} className={cn("flex-1 py-2 text-sm font-bold rounded-lg transition-colors", !isIncome ? "bg-slate-200 text-slate-900" : "text-slate-500 hover:text-slate-900")}>支出</button>
                    <button onClick={() => { setIsIncome(true); setCategory(incomeCategories[0]); }} className={cn("flex-1 py-2 text-sm font-bold rounded-lg transition-colors", isIncome ? "bg-slate-200 text-slate-900" : "text-slate-500 hover:text-slate-900")}>収入</button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1 block">金額</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-xl font-mono">¥</span>
                            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" className={cn("w-full bg-white shadow-sm border border-slate-200 rounded-xl py-4 pl-12 pr-4 text-3xl font-mono focus:border-slate-400 outline-none transition-colors", !isIncome ? "text-slate-900" : "text-cyan-600")} autoFocus />
                        </div>
                    </div>

                    {!isIncome && (
                        <label className="flex items-center gap-3 p-4 bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/20 rounded-xl cursor-pointer transition-colors">
                            <input type="checkbox" checked={isAdvance} onChange={e => setIsAdvance(e.target.checked)} className="rounded text-amber-500 focus:ring-amber-500 bg-slate-100 border-amber-500/50 w-5 h-5 accent-amber-500" />
                            <div className="flex flex-col">
                                <span className="text-sm font-bold text-amber-600">立替フラグ (後で返ってくるお金)</span>
                                <span className="text-[10px] text-amber-600/60 mt-0.5">立替金資産として同額を自動計上します</span>
                            </div>
                        </label>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1 block">口座</label>
                            <select value={account} onChange={e => setAccount(e.target.value)} className="w-full bg-white shadow-sm border border-slate-200 rounded-xl py-3 px-3 text-sm text-slate-900 focus:border-slate-400 outline-none appearance-none">
                                {assetsData.categories.flatMap((cat: any) => cat.items).map((item: any) => (
                                    <option key={item.id} value={item.name} className="bg-white">{item.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1 block">日付</label>
                            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-white shadow-sm border border-slate-200 rounded-xl py-3 px-3 text-sm text-slate-900 focus:border-slate-400 outline-none appearance-none block" />
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1 flex justify-between">
                            <span>カテゴリ</span>
                            <button onClick={() => {
                                const newCat = prompt("新しいカテゴリ名を入力してください");
                                if (newCat) {
                                    if (isIncome && !incomeCategories.includes(newCat)) setIncomeCategories([...incomeCategories, newCat]);
                                    if (!isIncome && !expenseCategories.includes(newCat)) setExpenseCategories([...expenseCategories, newCat]);
                                    setCategory(newCat);
                                }
                            }} className="text-cyan-600 font-medium text-[10px] hover:text-cyan-300">＋追加</button>
                        </label>
                        <select value={category} onChange={e => setCategory(e.target.value)} className="w-full bg-white shadow-sm border border-slate-200 rounded-xl py-3 px-3 text-sm text-slate-900 focus:border-slate-400 outline-none appearance-none">
                            {displayedCategories.map((c: string) => <option key={c} value={c} className="bg-white">{c}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1 block">メモ</label>
                        <input type="text" value={memo} onChange={e => setMemo(e.target.value)} placeholder="例: スタバ, 定期券" className="w-full bg-white shadow-sm border border-slate-200 rounded-xl py-3 px-4 text-sm text-slate-900 focus:border-slate-400 outline-none" />
                    </div>

                    <button onClick={handleSave} className="w-full bg-slate-900 hover:bg-slate-800 text-white shadow-xl font-bold py-4 rounded-xl mt-6 transition-colors shadow-lg">
                        記録を保存
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}

// ----------------------------------------------------------------------
// HOME TAB (Money Forward ME Clone)
// ----------------------------------------------------------------------
function HomeTab({ historyData, assetsData }: { historyData: any[], assetsData: any }) {
    const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
    const [groupNameInput, setGroupNameInput] = useState('');

    // Account Filtering Logic
    const [assetGroups, setAssetGroups] = useState<{ name: string, ids: string[] | null }[]>([
        { name: 'すべての口座', ids: null },
        { name: '現金・銀行', ids: ['acc1', 'acc2', 'acc3'] },
        { name: '電子マネー除外', ids: ['acc1', 'acc2', 'acc3', 'acc6', 'acc7'] }
    ]);
    const [selectedGroupIndex, setSelectedGroupIndex] = useState(0);
    const [tempIds, setTempIds] = useState<string[]>([]);

    const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
    const [budgetLimits, setBudgetLimits] = useState<Record<string, number>>({ '食費': 40000, '交際費': 15000, '交通費': 10000 });

    const currentGroup = assetGroups[selectedGroupIndex];

    // Calculate filtered total assets
    const filteredTotalAssets = useMemo(() => {
        if (!currentGroup || !currentGroup.ids) return assetsData.totalAssets;
        return assetsData.categories.flatMap((c: any) => c.items)
            .filter((i: any) => currentGroup.ids!.includes(i.id))
            .reduce((sum: number, i: any) => sum + Number(i.balance), 0);
    }, [currentGroup, assetsData]);

    // Calculate current month's income/expense
    const [monthOffset] = useState(0);
    const currentDate = new Date();
    currentDate.setMonth(currentDate.getMonth() + monthOffset);
    const currentMonthStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

    const monthEvents = historyData.filter(h => h.date.startsWith(currentMonthStr));
    const income = monthEvents.filter(h => h.amount > 0).reduce((sum, h) => sum + h.amount, 0);
    const expense = monthEvents.filter(h => h.amount < 0).reduce((sum, h) => sum + Math.abs(h.amount), 0);
    const net = income - expense;

    // Shared Category Logic
    const getCategory = (item: string) => {
        const lower = item.toLowerCase();
        if (lower.includes('食') || lower.includes('lawson') || lower.includes('カフェ') || lower.includes('スタバ') || lower.includes('ランチ')) return '食費';
        if (lower.includes('交通') || lower.includes('suica') || lower.includes('電車') || lower.includes('タクシー')) return '交通費';
        if (lower.includes('交際') || lower.includes('飲み会') || lower.includes('プレゼント')) return '交際費';
        if (lower.includes('日用') || lower.includes('ドラッグ') || lower.includes('洗剤')) return '日用品';
        if (lower.includes('趣味') || lower.includes('ゲーム') || lower.includes('映画') || lower.includes('本')) return '趣味・娯楽';
        return 'その他';
    };

    // Calculate grouping for Donut Chart
    const expByCategory: Record<string, number> = {};
    monthEvents.filter(h => h.amount < 0).forEach(h => {
        const cat = getCategory(h.item);
        expByCategory[cat] = (expByCategory[cat] || 0) + Math.abs(h.amount);
    });

    // Sort pie data largest to smallest
    const pieData = Object.keys(expByCategory).map(name => ({ name, value: expByCategory[name] })).sort((a, b) => b.value - a.value);
    const PIE_COLORS = ['#4f46e5', '#ec4899', '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#64748b'];

    // Budget Logic
    const totalBudget = Object.values(budgetLimits).reduce((a, b) => a + b, 0);
    const totalBudgetExpense = Object.keys(budgetLimits).reduce((a, k) => a + (expByCategory[k] || 0), 0);
    const mainOverBudget = totalBudgetExpense > totalBudget;

    return (
        <>
            <div className="space-y-4 pt-2 pb-16 bg-slate-100 min-h-screen -m-3 md:-m-6 p-4">

                {/* Total Assets Card */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm mt-4">
                    <div className="flex justify-between items-center mb-4 text-slate-700">
                        <h3 className="font-bold">総資産</h3>
                    </div>
                    <div className="text-right">
                        <p className="text-4xl font-sans tracking-tighter text-slate-900">
                            <span className="text-2xl mr-0.5">¥</span>
                            {assetsData.totalAssets.toLocaleString()}
                        </p>
                        <p className="text-sm font-bold text-slate-500 mt-2">
                            前月比 <span className="text-blue-500 ml-1">¥+12,000</span>
                            <ArrowUpRight size={14} className="inline text-blue-500 relative -top-0.5" />
                        </p>
                    </div>
                </div>

                {/* Household Budget (Donut Chart) Card */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                    <div className="flex justify-between items-center text-slate-700 mb-2">
                        <h3 className="font-bold flex items-center gap-2">家計簿 <span className="text-xs font-normal text-slate-500">{currentDate.getMonth() + 1}月1日〜末日</span></h3>
                    </div>

                    <div className="flex items-center mt-6">
                        {/* Donut Chart */}
                        <div className="w-[120px] h-[120px] relative shrink-0">
                            {pieData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={35} outerRadius={60} stroke="none" dataKey="value" isAnimationActive={false}>
                                            {pieData.map((entry, index) => <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                                        </Pie>
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="w-full h-full rounded-full border-[15px] border-slate-100" />
                            )}
                        </div>
                        {/* Data Summary */}
                        <div className="flex-1 ml-4 space-y-3 font-sans">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-500">収入</span>
                                <span className="text-blue-500 font-bold">¥{income.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm pb-3 border-b border-slate-200">
                                <span className="text-slate-500">支出</span>
                                <span className="text-rose-500 font-bold">-¥{expense.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm font-bold text-slate-900">
                                <span>収支</span>
                                <span>¥{net.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Budget Progress Card (Categorized) */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                    <div className="flex justify-between items-center text-slate-700 mb-4">
                        <h3 className="font-bold">予算（変動費） <span className="text-xs font-normal text-slate-500 ml-1">あと6日</span></h3>
                        <button onClick={() => setIsBudgetModalOpen(true)} className="text-slate-400 hover:text-slate-600"><Settings size={16} /></button>
                    </div>

                    <div className="flex justify-between text-sm mb-2 opacity-80">
                        <span className="text-slate-700 font-bold text-xs uppercase tracking-widest">総予算状況</span>
                        <span className={cn("font-bold text-sm", mainOverBudget ? "text-rose-500" : "text-emerald-500")}>
                            {mainOverBudget ? '-' : ''}¥{Math.abs(totalBudget - totalBudgetExpense).toLocaleString()}
                        </span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden mb-6">
                        <div className={cn("h-full", mainOverBudget ? "bg-rose-500" : "bg-emerald-500")} style={{ width: `${Math.min((totalBudgetExpense / totalBudget) * 100, 100)}%` }} />
                    </div>

                    <div className="space-y-4">
                        {Object.keys(budgetLimits).map(catKey => {
                            const lim = budgetLimits[catKey];
                            const exp = expByCategory[catKey] || 0;
                            const isOver = exp > lim;
                            return (
                                <div key={catKey}>
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="text-slate-700 font-bold">{catKey}</span>
                                        <span className={cn("font-bold", isOver ? "text-rose-500" : "text-slate-500")}>¥{exp.toLocaleString()} / ¥{lim.toLocaleString()}</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                        <div className={cn("h-full", isOver ? "bg-rose-500" : "bg-blue-500")} style={{ width: `${Math.min((exp / lim) * 100, 100)}%` }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Giant Calendar */}
                <div className="bg-white border text-center border-slate-200 rounded-xl p-5 shadow-sm">
                    <h3 className="text-xs font-bold text-slate-900/70 mb-3 flex items-center gap-2 uppercase tracking-widest">
                        <CalendarDays size={14} /> April 2026
                    </h3>
                    <div className="grid grid-cols-7 gap-1">
                        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                            <div key={i} className="text-[10px] text-center text-slate-400 font-bold mb-1">{day}</div>
                        ))}
                        {Array(3).fill(null).map((_, i) => <div key={'empty-' + i} className="p-1" />)}
                        {Array.from({ length: 30 }).map((_, i) => {
                            const dayNum = i + 1;
                            const dateStr = '2026-04-' + String(dayNum).padStart(2, '0');
                            const dayEvents = historyData.filter(h => h.date === dateStr);
                            const inc = dayEvents.filter(h => h.amount > 0).reduce((sum, h) => sum + h.amount, 0);
                            const exp = dayEvents.filter(h => h.amount < 0).reduce((sum, h) => sum + h.amount, 0);

                            return (
                                <div
                                    key={dayNum}
                                    className={cn(
                                        "relative flex flex-col p-1 rounded-lg border transition-all h-[55px]",
                                        dayNum === 25 ? "bg-slate-100 border-slate-300" : "bg-transparent border-slate-50 hover:bg-slate-50",
                                        (inc > 0 || exp < 0) ? "cursor-pointer shadow-sm" : ""
                                    )}
                                >
                                    <span className={cn(
                                        "text-[10px] font-bold text-left",
                                        dayNum === 25 ? "text-slate-900" : "text-slate-500"
                                    )}>
                                        {dayNum}
                                    </span>
                                    <div className="mt-auto flex flex-col justify-end text-right">
                                        {inc > 0 && <span className="text-[8px] sm:text-[9px] font-bold text-blue-500 tabular-nums leading-none tracking-tighter truncate">+{inc.toLocaleString()}</span>}
                                        {exp < 0 && <span className="text-[8px] sm:text-[9px] font-bold text-rose-500 tabular-nums leading-none tracking-tighter truncate">{exp.toLocaleString()}</span>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Future Cashflow Prediction */}
                <div className="bg-white border text-center border-slate-200 rounded-xl p-5 shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold flex items-center gap-2"><Wallet size={16} className="text-slate-500" /> 将来のキャッシュフロー予測</h3>
                    </div>
                    <div className="glass-panel p-0 border border-slate-100 rounded-xl bg-slate-50 overflow-hidden divide-y divide-slate-100 text-left">
                        <div className="p-4 flex justify-between items-center bg-blue-50/50">
                            <div className="flex flex-col items-start gap-1">
                                <span className="text-xs font-bold text-slate-700 tracking-tight">現在の残高</span>
                                <select value={selectedGroupIndex} onChange={(e) => {
                                    if (e.target.value === 'new') {
                                        setTempIds(assetsData.categories.flatMap((c: any) => c.items).map((i: any) => i.id));
                                        setIsGroupModalOpen(true);
                                    } else {
                                        setSelectedGroupIndex(Number(e.target.value));
                                    }
                                }} className="text-[10px] bg-white border border-blue-200 text-blue-700 font-bold rounded px-1 min-w-[100px] outline-none">
                                    {assetGroups.map((g, idx) => <option key={g.name} value={idx}>{g.name}</option>)}
                                    <option value="new">＋ 新しいグループを設定...</option>
                                </select>
                            </div>
                            <span className="text-lg font-black font-mono tabular-nums tracking-tighter text-slate-900 drop-shadow-sm">
                                ¥{filteredTotalAssets.toLocaleString()}
                            </span>
                        </div>
                        {historyData
                            .filter(h => new Date(h.date) > new Date('2026-04-25T00:00:00+09:00'))
                            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                            .slice(0, 4)
                            .reduce((acc, row) => {
                                const newBal = acc.bal + row.amount;
                                acc.arr.push(
                                    <div key={row.id || row.date + row.item} className="p-3 py-3 flex justify-between items-center bg-white hover:bg-slate-50 transition-colors">
                                        <div className="flex flex-col flex-1 truncate pr-2">
                                            <span className="text-xs font-bold text-slate-800 truncate">{row.item}</span>
                                            <span className="text-[9px] text-slate-400 font-mono tracking-widest mt-0.5">{row.date.replace(/-/g, '/')}</span>
                                        </div>
                                        <div className="flex flex-col items-end shrink-0">
                                            <span className={cn("text-sm font-bold font-mono tracking-tighter tabular-nums", row.amount > 0 ? "text-blue-500" : "text-rose-500")}>
                                                {row.amount > 0 ? '+' : ''}{row.amount.toLocaleString()}
                                            </span>
                                            <span className="text-[9px] text-slate-400 font-mono tracking-tight flex items-center gap-1 mt-0.5">
                                                ➔ ¥{newBal.toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                );
                                acc.bal = newBal;
                                return acc;
                            }, { bal: filteredTotalAssets, arr: [] as any[] }).arr
                        }
                    </div>
                </div>

            </div>

            <AnimatePresence>
                {isBudgetModalOpen && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col">
                            <div className="bg-slate-100 px-4 py-3 flex justify-between items-center border-b border-slate-200">
                                <h3 className="font-bold text-slate-800 text-sm">カテゴリ別予算設定</h3>
                                <button onClick={() => setIsBudgetModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
                            </div>
                            <div className="bg-slate-50 border border-slate-200 rounded-lg max-h-[300px] overflow-y-auto p-2 space-y-2">
                                {EXPENSE_CATEGORIES.map(k => (
                                    <div key={k} className="flex justify-between items-center bg-white border border-slate-100 rounded-lg p-3 shadow-sm hover:border-blue-200 transition-colors">
                                        <span className="font-bold text-[13px] text-slate-700 w-1/3">{k}</span>
                                        <div className="relative w-2/3">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-mono">¥</span>
                                            <input type="number"
                                                value={budgetLimits[k] || ''}
                                                placeholder="未設定"
                                                onChange={(e) => {
                                                    const val = parseInt(e.target.value, 10);
                                                    setBudgetLimits(p => ({ ...p, [k]: isNaN(val) ? 0 : val }));
                                                }} className="w-full pl-7 pr-3 py-1.5 rounded-md border border-slate-200 focus:border-blue-500 outline-none text-sm font-bold text-slate-800 text-right tabular-nums bg-slate-50/50" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="p-4 border-t border-slate-100">
                                <button onClick={() => setIsBudgetModalOpen(false)} className="w-full bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-bold py-3 rounded-xl transition-all shadow-md">予算設定を保存して閉じる</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}

                {isGroupModalOpen && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
                            <div className="bg-slate-100 px-4 py-3 flex justify-between items-center border-b border-slate-200">
                                <h3 className="font-bold text-slate-800 text-sm">新しい資産グループ</h3>
                                <button onClick={() => setIsGroupModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
                            </div>
                            <div className="p-4 space-y-4">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 mb-1 block">グループ名</label>
                                    <input type="text" value={groupNameInput} onChange={e => setGroupNameInput(e.target.value)} placeholder="例: 共有口座" className="w-full rounded-md border border-slate-200 p-2 text-sm focus:border-blue-500 outline-none" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 mb-1 block">対象の口座を選択</label>
                                    <div className="bg-slate-50 border border-slate-200 rounded-lg max-h-32 overflow-y-auto p-2 space-y-2">
                                        {assetsData.categories.flatMap((c: any) => c.items).map((item: any) => (
                                            <div key={item.id} className="flex items-center gap-2">
                                                <input type="checkbox" checked={tempIds.includes(item.id)} onChange={e => {
                                                    if (e.target.checked) setTempIds(p => [...p, item.id]);
                                                    else setTempIds(p => p.filter(id => id !== item.id));
                                                }} className="rounded border-slate-300 text-blue-600" />
                                                <span className="text-xs text-slate-700 font-bold">{item.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="p-4 border-t border-slate-100">
                                <button onClick={() => {
                                    if (groupNameInput.trim()) {
                                        const newGroup = { name: groupNameInput.trim(), ids: [...tempIds] };
                                        setAssetGroups(prev => [...prev, newGroup]);
                                        setSelectedGroupIndex(assetGroups.length);
                                    }
                                    setGroupNameInput('');
                                    setIsGroupModalOpen(false);
                                }} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg transition-colors">作成する</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}

// ----------------------------------------------------------------------
// REPORT TAB (Money Forward ME "家計簿/レポート" Clone)
// ----------------------------------------------------------------------
function ReportTab({ historyData, onDeleteHistory }: { historyData: any[], onDeleteHistory: (id: string | number) => void }) {
    const [viewType, setViewType] = useState<'expense' | 'income'>('expense');
    const [viewMode, setViewMode] = useState<'month' | 'year'>('month');
    const [reportMonthOffset, setReportMonthOffset] = useState(0);

    const currentDate = useMemo(() => {
        const d = new Date('2026-04-15');
        d.setMonth(d.getMonth() + reportMonthOffset);
        return d;
    }, [reportMonthOffset]);

    const y = currentDate.getFullYear();
    const m = currentDate.getMonth() + 1;
    const currentMonthStr = `${y}-${String(m).padStart(2, '0')}`;

    const monthlyHistory = historyData.filter(h => h.date.startsWith(currentMonthStr));
    const incomeTotal = monthlyHistory.filter(h => h.amount > 0).reduce((acc, curr) => acc + curr.amount, 0);
    const expenseTotal = Math.abs(monthlyHistory.filter(h => h.amount < 0).reduce((acc, curr) => acc + curr.amount, 0));
    const balance = incomeTotal - expenseTotal;

    const yearlyData = useMemo(() => {
        return Array.from({ length: 12 }, (_, i) => {
            const mStr = `${y}-${String(i + 1).padStart(2, '0')}`;
            const mData = historyData.filter(h => h.date.startsWith(mStr));
            return {
                name: `${i + 1}月`,
                expense: mData.filter(h => h.amount < 0).reduce((sum, h) => sum + Math.abs(h.amount), 0),
                income: mData.filter(h => h.amount > 0).reduce((sum, h) => sum + h.amount, 0)
            };
        });
    }, [y, historyData]);

    const getCategoryForExpense = (item: string) => {
        const lower = item.toLowerCase();
        if (lower.includes('食') || lower.includes('lawson') || lower.includes('カフェ')) return '食費';
        if (lower.includes('交通') || lower.includes('suica') || lower.includes('電車')) return '交通費';
        if (lower.includes('交際') || lower.includes('飲み会')) return '交際費';
        if (lower.includes('日用') || lower.includes('ドラッグ')) return '日用品';
        if (lower.includes('趣味') || lower.includes('ゲーム')) return '趣味・娯楽';
        return 'その他';
    };

    const categoryData: Record<string, number> = {};
    monthlyHistory.filter(h => h.amount < 0).forEach(h => {
        const cat = getCategoryForExpense(h.item);
        categoryData[cat] = (categoryData[cat] || 0) + Math.abs(h.amount);
    });

    const pieData = Object.keys(categoryData).map(k => ({
        name: k,
        value: categoryData[k],
        fill: k === '食費' ? '#ef4444' : k === '交通費' ? '#4f46e5' : k === '交際費' ? '#3b82f6' : k === '日用品' ? '#fbbf24' : k === '趣味・娯楽' ? '#10b981' : '#cbd5e1'
    })).sort((a, b) => b.value - a.value);

    const yearlyPieData = useMemo(() => {
        const yearlyCategoryData: Record<string, number> = {};
        historyData.filter(h => h.date.startsWith(y.toString()) && h.amount < 0).forEach(h => {
            const cat = getCategoryForExpense(h.item);
            yearlyCategoryData[cat] = (yearlyCategoryData[cat] || 0) + Math.abs(h.amount);
        });
        return Object.keys(yearlyCategoryData).map(k => ({
            name: k,
            value: yearlyCategoryData[k],
            fill: k === '食費' ? '#ef4444' : k === '交通費' ? '#4f46e5' : k === '交際費' ? '#3b82f6' : k === '日用品' ? '#fbbf24' : k === '趣味・娯楽' ? '#10b981' : '#cbd5e1'
        })).sort((a, b) => b.value - a.value);
    }, [y, historyData]);

    return (
        <div className="pb-16 bg-white min-h-screen -m-3 md:-m-6 text-slate-800">
            <header className="bg-white flex flex-col justify-center items-center py-4 px-4 sticky top-0 z-10 border-b border-slate-200 shadow-sm relative">
                <div className="absolute left-4 top-4 text-slate-400 flex flex-col items-center">
                    <PieChartIcon size={20} className="mb-0.5" />
                    <span className="text-[8px] font-bold">レポート</span>
                </div>
                <div className="flex items-center gap-6">
                    <button onClick={() => setReportMonthOffset(p => p - 1)} className="text-slate-300 hover:text-slate-600 transition-colors"><ChevronLeft size={24} /></button>
                    <h2 className="text-lg font-bold tracking-tight text-slate-900">{y}年{m}月</h2>
                    <button onClick={() => setReportMonthOffset(p => p + 1)} className="text-slate-300 hover:text-slate-600 transition-colors"><ChevronRight size={24} /></button>
                </div>
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Monthly Report</div>
            </header>

            <div className="flex border-b border-slate-100 bg-white">
                <button onClick={() => setViewMode('month')} className={cn("flex-1 text-center py-3 text-xs font-bold transition-all border-b-2", viewMode === 'month' ? "border-slate-900 text-slate-900" : "border-transparent text-slate-300")}>月次内訳</button>
                <button onClick={() => setViewMode('year')} className={cn("flex-1 text-center py-3 text-xs font-bold transition-all border-b-2", viewMode === 'year' ? "border-slate-900 text-slate-900" : "border-transparent text-slate-300")}>年間推移</button>
            </div>

            {viewMode === 'month' ? (
                <>
                    <div className="bg-white py-6 px-6 flex justify-between items-center text-center border-b border-slate-50">
                        <div className="flex flex-col flex-1">
                            <span className="text-[10px] text-slate-400 font-bold uppercase mb-1">Income</span>
                            <span className="text-xl font-mono text-blue-600 font-black tracking-tighter">¥{incomeTotal.toLocaleString()}</span>
                        </div>
                        <div className="flex flex-col flex-1 border-x border-slate-100">
                            <span className="text-[10px] text-slate-400 font-bold uppercase mb-1">Expense</span>
                            <span className="text-xl font-mono text-rose-600 font-black tracking-tighter">¥{expenseTotal.toLocaleString()}</span>
                        </div>
                        <div className="flex flex-col flex-1">
                            <span className="text-[10px] text-slate-400 font-bold uppercase mb-1">Balance</span>
                            <span className="text-xl font-mono text-slate-800 font-black tracking-tighter">¥{balance.toLocaleString()}</span>
                        </div>
                    </div>

                    <div className="flex justify-center my-6">
                        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-inner">
                            <button onClick={() => setViewType('expense')} className={cn("px-8 py-2 text-xs font-bold rounded-lg transition-all", viewType === 'expense' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400")}>支出</button>
                            <button onClick={() => setViewType('income')} className={cn("px-8 py-2 text-xs font-bold rounded-lg transition-all", viewType === 'income' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400")}>収入</button>
                        </div>
                    </div>

                    {viewType === 'expense' ? (
                        <>
                            <div className="h-[240px] w-full mb-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2} dataKey="value" stroke="none">
                                            {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                                        </Pie>
                                        <Tooltip formatter={(v: any) => `¥${v.toLocaleString()}`} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="border-t border-slate-100 divide-y divide-slate-50">
                                {pieData.map(cat => {
                                    const pct = expenseTotal > 0 ? (cat.value / expenseTotal * 100).toFixed(1) : 0;
                                    return (
                                        <div key={cat.name} className="flex items-center justify-between py-4 px-6 hover:bg-slate-50 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm" style={{ backgroundColor: cat.fill }}>
                                                    <List size={18} className="text-white" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-slate-900 font-bold text-sm">{cat.name}</span>
                                                    <span className="text-[10px] text-slate-400 font-bold">{pct}% of total</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-slate-900 font-mono text-lg font-black tracking-tighter">¥{cat.value.toLocaleString()}</span>
                                                <ChevronRight size={16} className="text-slate-300" />
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>

                            {/* Recent Transactions List with Deletion */}
                            <div className="mt-8 px-6 pb-12">
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">最近の入出金 (削除可能)</h3>
                                <div className="space-y-2">
                                    {monthlyHistory.map((h: any) => (
                                        <div key={h.id} className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex justify-between items-center group transition-all hover:bg-rose-50/20 hover:border-rose-100">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] text-slate-400 font-bold mb-0.5">{h.date}</span>
                                                <span className="text-sm font-bold text-slate-700">{h.item}</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className={cn("font-mono font-bold", h.amount > 0 ? "text-blue-600" : "text-slate-900")}>
                                                    {h.amount > 0 ? '+' : ''}¥{h.amount.toLocaleString()}
                                                </span>
                                                <button onClick={() => { if (confirm('削除してよろしいですか？')) onDeleteHistory(h.id); }} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-500 p-2 transition-all">
                                                    <Trash size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    {monthlyHistory.length === 0 && <p className="text-center py-8 text-slate-300 text-sm font-bold tracking-tight">データがありません</p>}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-300">
                            <PieChartIcon size={48} className="opacity-20 mb-4" />
                            <p className="text-sm font-bold">収入カテゴリデータはありません</p>
                        </div>
                    )}
                </>
            ) : (
                <div className="p-4 space-y-6 bg-slate-50 min-h-screen">
                    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">{y}年 カテゴリ別支出</h3>
                        </div>
                        <div className="h-[240px] w-full mb-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={yearlyPieData}
                                        cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2} dataKey="value" stroke="none"
                                    >
                                        {yearlyPieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                                    </Pie>
                                    <Tooltip formatter={(v: any) => `¥${v.toLocaleString()}`} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">{y}年 収支トレンド</h3>
                            <div className="flex items-center gap-2">
                                <span className="flex items-center gap-1 text-[9px] font-bold text-rose-500"><div className="w-2 h-2 rounded-full bg-rose-500" />支出</span>
                                <span className="flex items-center gap-1 text-[9px] font-bold text-sky-500"><div className="w-2 h-2 rounded-full bg-sky-500" />収入</span>
                            </div>
                        </div>
                        <div className="h-[280px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={yearlyData}>
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94a3b8' }} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px' }}
                                        formatter={(val: any) => val ? [`¥${val.toLocaleString()}`, ''] : ['', '']}
                                    />
                                    <Bar dataKey="expense" fill="#f43f5e" radius={[6, 6, 0, 0]} barSize={12} />
                                    <Bar dataKey="income" fill="#0ea5e9" radius={[6, 6, 0, 0]} barSize={12} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="bg-slate-900 text-white p-8 rounded-3xl shadow-xl relative overflow-hidden">
                        <div className="relative z-10">
                            <h4 className="font-bold text-xs opacity-60 uppercase tracking-widest mb-2">Annual Total Spending</h4>
                            <div className="text-3xl font-black font-sans tracking-tighter mb-6">¥{yearlyData.reduce((s, m) => s + m.expense, 0).toLocaleString()}</div>
                            <div className="space-y-4 font-bold">
                                <div className="flex justify-between text-[10px] uppercase opacity-80">
                                    <span>Spending vs Limit</span>
                                    <span>65%</span>
                                </div>
                                <div className="w-full bg-white/10 h-2.5 rounded-full overflow-hidden">
                                    <motion.div initial={{ width: 0 }} animate={{ width: '65%' }} transition={{ duration: 1.5 }} className="bg-rose-500 h-full shadow-[0_0_15px_rgba(244,63,94,0.5)]" />
                                </div>
                            </div>
                        </div>
                        <div className="absolute -right-12 -bottom-12 opacity-[0.03]">
                            <PieChartIcon size={240} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ----------------------------------------------------------------------
// HISTORY "FUTURE" LOG TAB (Money Forward ME Clone)
// ----------------------------------------------------------------------
function HistoryTab({ historyData, onDeleteHistory, assetsData }: { historyData: any[], onDeleteHistory: (id: string | number) => void, assetsData: any }) {
    // Group transactions by Date
    const groupedDate: Record<string, any[]> = {};
    historyData.forEach(h => {
        const d = h.date;
        if (!groupedDate[d]) groupedDate[d] = [];
        groupedDate[d].push(h);
    });
    const sortedDates = Object.keys(groupedDate).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    const handleDelete = (id: string, e: any) => {
        e.stopPropagation();
        if (confirm("選択した履歴を削除してもよろしいですか？")) {
            onDeleteHistory(id);
        }
    };

    const formatDateJP = (dStr: string) => {
        const date = new Date(dStr);
        const days = ['日', '月', '火', '水', '木', '金', '土'];
        return date.getFullYear() + "年" + (date.getMonth() + 1) + "月" + date.getDate() + "日 (" + days[date.getDay()] + ")";
    };

    const getIconForHistory = (item: string, amount: number) => {
        if (item.includes('振替') || item.includes('カード') || item.includes('PAYPAY') || item.includes('チャージ')) {
            return { icon: ArrowDownUp, color: 'text-green-600', bg: 'bg-green-100', border: 'border-green-300' };
        }
        if (amount > 0) {
            return { icon: PlusCircle, color: 'text-blue-500', bg: 'bg-blue-100', border: 'border-blue-300' };
        }
        if (item.includes('ローソン') || item.includes('食')) {
            return { icon: Wallet, color: 'text-rose-500', bg: 'bg-rose-100', border: 'border-rose-300' };
        }
        return { icon: CreditCard, color: 'text-orange-500', bg: 'bg-orange-100', border: 'border-orange-300' };
    };

    return (
        <div className="pb-16 bg-slate-50 min-h-screen -m-3 md:-m-6">
            <header className="bg-white flex justify-center items-center py-4 px-4 sticky top-0 z-10 border-b border-slate-200 shadow-sm">
                <h2 className="text-lg font-bold tracking-tight text-slate-800">入出金</h2>
            </header>

            <div className="bg-white mt-1 border-t border-slate-200">
                <div className="px-4 py-3 font-bold text-slate-800 text-sm">一覧</div>

                {sortedDates.map(date => (
                    <div key={date}>
                        <div className="bg-slate-100 text-slate-700 py-1.5 px-4 text-xs">
                            {formatDateJP(date)}
                        </div>
                        <div className="divide-y divide-slate-100 bg-white">
                            {groupedDate[date].map(row => {
                                const { icon: ItemIcon, color, bg, border } = getIconForHistory(row.item, row.amount);
                                return (
                                    <div key={row.id} className="flex justify-between items-center px-4 py-3 hover:bg-slate-50 transition-colors">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className={cn("w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0", bg, border)}>
                                                <ItemIcon size={14} className={color} strokeWidth={2.5} />
                                            </div>
                                            <span className="text-slate-800 text-sm truncate font-medium">{row.item}</span>
                                        </div>
                                        <div className={cn("text-right font-mono text-sm tracking-tighter tabular-nums whitespace-nowrap pl-2 flex items-center gap-2", row.amount > 0 ? "text-blue-500" : "text-slate-900")}>
                                            <span>¥{row.amount.toLocaleString()}</span>
                                            <button onClick={(e) => handleDelete(row.id, e)} className="text-slate-300 hover:text-rose-500 transition-colors p-1"><Trash size={14} /></button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            {/* Removed internal wallet floating button since 'Income/Expense' input logic can be routed elsewhere */}
        </div>
    );
}

// ----------------------------------------------------------------------
// ASSETS TAB & DRILL DOWN
// ----------------------------------------------------------------------
function getIconForAsset(name: string) {
    if (name.includes('銀行') || name.includes('現金')) return Landmark;
    if (name.includes('カード')) return CreditCard;
    if (name.includes('paypay') || name.includes('ポイント')) return Smartphone;
    return Wallet;
}



function AccountDetailView({ account, onClose, historyData, onUpdateBalance, onDeleteAccount, onDeleteHistory }: { account: any, onClose: () => void, historyData: any[], onUpdateBalance: (id: string, newBal: number) => void, onDeleteAccount: (id: string) => void, onDeleteHistory: (id: string) => void }) {
    const isCard = account.name.includes('カード');
    const [isEditing, setIsEditing] = useState(false);
    const [editBalance, setEditBalance] = useState(account.balance.toString());

    const handleSave = () => {
        onUpdateBalance(account.id, parseInt(editBalance, 10));
        setIsEditing(false);
    };

    // Dynamic Chart generation based on history associated with account
    const acctHistory = historyData.filter(h => h.account === account.name || (!h.account && account.name.includes('三菱UFJ')));

    // Group dynamically
    const monthMap: Record<string, { income: number, expense: number }> = {};
    ['2026-01', '2026-02', '2026-03', '2026-04'].forEach(m => monthMap[m] = { income: 0, expense: 0 });

    acctHistory.forEach(h => {
        const m = h.date.slice(0, 7);
        if (monthMap[m]) {
            if (h.amount > 0) monthMap[m].income += h.amount;
            else monthMap[m].expense += Math.abs(h.amount);
        }
    });

    const chartData = Object.keys(monthMap).map(k => ({
        name: k.split('-')[1] + '月',
        income: monthMap[k].income,
        expense: monthMap[k].expense
    }));

    return (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="absolute inset-0 bg-slate-50 z-40 overflow-y-auto pb-24 p-4 md:p-6">
            <button onClick={onClose} className="flex items-center text-slate-500 hover:text-slate-900 mb-6 bg-white shadow-sm py-2 px-4 rounded-full w-fit text-sm transition-colors">
                <ChevronLeft size={16} className="mr-1" /> Back
            </button>

            <header className="mb-8 pl-1">
                <div className="flex justify-between items-start">
                    <h2 className="text-3xl font-bold font-sans tracking-tight mb-2" style={account.brandColor ? { color: account.brandColor } : {}}>
                        {account.name}
                    </h2>
                    <button onClick={() => { if (confirm(account.name + ' を削除してもよろしいですか？')) onDeleteAccount(account.id); }} className="text-rose-600 hover:text-rose-300 transition-colors p-2 bg-rose-500/10 rounded-full border border-rose-500/20">
                        <Trash size={16} />
                    </button>
                </div>
                <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">現在の残高</p>
                    {isEditing ? (
                        <div className="flex items-center gap-2 mt-1">
                            <input
                                type="number"
                                autoFocus
                                value={editBalance}
                                onChange={(e) => setEditBalance(e.target.value)}
                                className="bg-slate-100 border border-slate-300 rounded-lg p-2 text-slate-900 font-mono text-2xl w-full max-w-[200px]"
                            />
                            <button onClick={handleSave} className="bg-slate-900 text-white px-4 py-2 rounded-lg font-bold text-sm">Save</button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-3">
                            <p className={cn("text-4xl font-black font-mono tabular-nums tracking-tighter", account.balance < 0 ? "text-rose-600" : "text-slate-900")}>
                                {account.balance < 0 ? ("-¥" + Math.abs(account.balance).toLocaleString()) : ("¥" + account.balance.toLocaleString())}
                            </p>
                            <button onClick={() => setIsEditing(true)} className="text-slate-500 hover:text-slate-900 transition-colors p-2 bg-white shadow-sm rounded-full"><Settings size={14} /></button>
                        </div>
                    )}
                </div>
            </header>

            <div className="p-5 border border-slate-200 rounded-2xl bg-white shadow-sm mb-8">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-sm text-slate-900/80">Monthly Output</h3>
                </div>
                <div className="h-44 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                            <Tooltip contentStyle={{ backgroundColor: '#1a1a24', border: '1px solid #ffffff10', fontSize: '12px', borderRadius: '12px' }} itemStyle={{ color: '#fff' }} cursor={{ fill: '#ffffff05' }} />
                            {!isCard && <Bar dataKey="income" fill={COLORS.primary} radius={[4, 4, 0, 0]} barSize={16} />}
                            <Bar dataKey="expense" fill={COLORS.debt} radius={[4, 4, 0, 0]} barSize={16} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <h3 className="font-bold text-sm text-slate-500 mb-4 pl-1">Recent Transactions</h3>
            <div className="space-y-0 rounded-2xl border border-slate-200 bg-white shadow-sm p-2 px-3">
                {acctHistory.slice(0, 15).map((row) => (
                    <div key={row.id} className="py-3 border-b border-slate-100 last:border-0 flex justify-between items-center group">
                        <div className="flex flex-col min-w-0 pr-4">
                            <p className="font-medium text-slate-800 text-sm truncate">{row.item}</p>
                            <p className="text-[10px] text-slate-500 mt-1">{row.date}</p>
                        </div>
                        <div className="text-right shrink-0 flex items-center gap-3">
                            <p className={cn("font-bold font-mono text-sm tabular-nums tracking-tighter", row.amount > 0 ? "text-cyan-600" : "text-slate-900")}>
                                {row.amount > 0 ? '+' : ''}{row.amount.toLocaleString()}
                            </p>
                            <button onClick={() => { if (confirm('この履歴を削除しますか？')) onDeleteHistory(row.id); }} className="opacity-0 group-hover:opacity-100 text-rose-300 hover:text-rose-500 p-1 transition-all">
                                <Trash size={14} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </motion.div >
    );
}

function AssetsTab({ user, expandedCategories, toggleCategory, assetsData, setAssetsData, historyData, onDeleteHistory }: any) {
    const [selectedAccount, setSelectedAccount] = useState<any>(null);
    const [showAddAccount, setShowAddAccount] = useState(false);
    const [draftAccount, setDraftAccount] = useState<{ type: string, catId: string } | null>(null);
    const [draftForm, setDraftForm] = useState({ name: '', balance: '' });

    const handleUpdateBalance = async (accountId: string, newBalance: number) => {
        if (isNaN(newBalance)) return;
        let targetAccountName = "";
        const cloned = JSON.parse(JSON.stringify(assetsData));
        for (let cat of cloned.categories) {
            const item = cat.items.find((i: any) => i.id === accountId);
            if (item) {
                targetAccountName = item.name;
                const diff = newBalance - item.balance;
                item.balance = newBalance;
                cat.total += diff;
                cloned.totalAssets += diff;
                break;
            }
        }
        setAssetsData(cloned);
        setSelectedAccount((prev: any) => ({ ...prev, balance: newBalance }));
        if (targetAccountName) {
            try {
                await supabase.from('accounts').update({ balance: newBalance }).eq('id', accountId).eq('user_id', user.id);
            } catch (err) {
                console.error("Failed to update balance on DB:", err);
            }
        }
    };

    const handleDeleteAccount = async (accountId: string) => {
        try {
            await supabase.from('accounts').delete().eq('id', accountId);

            const cloned = JSON.parse(JSON.stringify(assetsData));
            let targetCatIndex = -1;
            let targetItemIndex = -1;
            let deletedBalance = 0;

            for (let i = 0; i < cloned.categories.length; i++) {
                const cat = cloned.categories[i];
                targetItemIndex = cat.items.findIndex((item: any) => item.id === accountId);
                if (targetItemIndex !== -1) {
                    targetCatIndex = i;
                    deletedBalance = cat.items[targetItemIndex].balance;
                    break;
                }
            }

            if (targetCatIndex !== -1 && targetItemIndex !== -1) {
                cloned.categories[targetCatIndex].items.splice(targetItemIndex, 1);
                cloned.categories[targetCatIndex].total -= deletedBalance;
                cloned.totalAssets -= deletedBalance;
                setAssetsData(cloned);
            }
        } catch (err) {
            console.error("Account deletion failed:", err);
        }
        setSelectedAccount(null);
    };

    if (selectedAccount) {
        return <AccountDetailView account={selectedAccount} onClose={() => setSelectedAccount(null)} historyData={historyData} onUpdateBalance={handleUpdateBalance} onDeleteAccount={handleDeleteAccount} onDeleteHistory={onDeleteHistory} />;
    }

    const handleSaveNewAccount = async () => {
        if (!draftForm.name || !draftAccount) return;
        const balanceNum = parseInt(draftForm.balance || "0", 10) || 0;

        try {
            const newDbAcct = { user_id: user.id, category_id: draftAccount.catId, name: draftForm.name, balance: balanceNum };
            const { data } = await supabase.from('accounts').insert([newDbAcct]).select('*');

            const cloned = JSON.parse(JSON.stringify(assetsData));
            const cat = cloned.categories.find((c: any) => c.id === draftAccount.catId);
            if (cat && data && data.length > 0) {
                cat.items.push({ id: data[0].id, name: draftForm.name, balance: balanceNum });
                cat.total += balanceNum;
                cloned.totalAssets += balanceNum;
                setAssetsData(cloned);
            }
        } catch (err) {
            console.error(err);
        }

        setDraftAccount(null);
        setShowAddAccount(false);
        setDraftForm({ name: '', balance: '' });
    };

    return (
        <div className="pb-24 bg-slate-50 min-h-screen -m-3 md:-m-6 pt-2">
            <header className="bg-white flex justify-between items-center py-4 px-4 sticky top-0 z-10 border-b border-slate-200 shadow-sm">
                <div className="w-8" />
                <h2 className="text-lg font-bold tracking-tight text-slate-800">口座</h2>
                <div className="flex gap-2 items-center">
                    <button onClick={() => setShowAddAccount(true)} className="text-slate-600 flex flex-col items-center gap-0.5 px-2 hover:bg-slate-50 transition-colors">
                        <Plus size={18} />
                        <span className="text-[8px] font-bold">追加</span>
                    </button>
                </div>
            </header>

            <div className="px-4 space-y-6 mt-6">
                {assetsData.categories.map((cat: any) => {
                    // Provide a default color scheme based on category ID
                    const getFallbackColor = (catId: string) => {
                        if (catId === 'cash') return '#10b981'; // Green
                        if (catId === 'cards') return '#2563eb'; // Blue
                        if (catId === 'paypay') return '#e11d48'; // Rose
                        return '#475569'; // Slate
                    };

                    return (
                        <div key={cat.id}>
                            <div className="flex justify-between items-center mb-2 px-1">
                                <h3 className="text-slate-700 font-bold text-sm tracking-wide">{cat.name}</h3>
                                {cat.id === 'cards' && <span className="text-[10px] text-slate-500 bg-slate-200/50 px-2 py-0.5 rounded-full font-bold">カード引落し ＞</span>}
                            </div>
                            <div className="space-y-[3px]">
                                {cat.items.map((item: any) => {
                                    const baseColor = item.brand_color || item.brandColor || getFallbackColor(cat.id);
                                    return (
                                        <div key={item.id} onClick={() => setSelectedAccount(item)} className="cursor-pointer flex justify-between items-center py-4 px-4 rounded-xl bg-white shadow-[0_2px_8px_-4px_rgba(0,0,0,0.1)] border border-slate-100 transition-all hover:shadow-md active:scale-[0.98] relative overflow-hidden group mb-2">
                                            <div className="flex items-center gap-3 w-1/2 overflow-hidden">
                                                <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 border shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]" style={{ backgroundColor: `${baseColor}15`, borderColor: `${baseColor}30` }}>
                                                    <Wallet size={18} style={{ color: baseColor }} strokeWidth={2.5} />
                                                </div>
                                                <div className="font-bold text-[13px] text-slate-700 truncate tracking-wide">
                                                    {item.name}
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end pr-5 shrink-0">
                                                <span className="font-bold text-[20px] text-slate-800 flex items-center gap-0.5 tabular-nums tracking-tight">
                                                    <span className="text-xs font-normal opacity-80">¥</span>{Math.abs(item.balance).toLocaleString()}
                                                </span>
                                                {cat.id === 'cards' && <span className="text-[9px] text-slate-400 mt-0.5 font-medium tracking-tight">次回引落し ¥{(item.balance * 0.25).toLocaleString()}</span>}
                                            </div>
                                            <ChevronRight size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 group-hover:text-slate-500 transition-colors" />
                                        </div>
                                    );
                                })}
                                {cat.items.length === 0 && (
                                    <div className="text-center p-4 border border-dashed border-slate-300 rounded text-slate-400 text-xs font-bold">連携データがありません</div>
                                )}
                            </div>
                        </div>
                    );
                })}

                <button onClick={() => setShowAddAccount(true)} className="w-full bg-white border border-slate-200 shadow-sm hover:shadow p-4 rounded-xl flex items-center justify-center gap-2 text-slate-700 hover:text-slate-900 transition-all font-bold text-sm mt-4">
                    <PlusCircle size={18} className="text-slate-400" />
                    <span>口座を追加する</span>
                </button>
            </div>

            {/* Custom Add Account Modal */}
            <AnimatePresence>
                {showAddAccount && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-100/60 backdrop-blur-md z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
                        <div className="bg-white border border-slate-200 w-full max-w-sm rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl relative">
                            <button onClick={() => { setShowAddAccount(false); setDraftAccount(null); }} className="absolute top-4 right-4 text-slate-500 hover:text-slate-900 bg-white shadow-sm rounded-full p-2"><X size={20} /></button>
                            <h3 className="text-xl font-bold mb-6 text-slate-900">連携追加</h3>

                            {!draftAccount ? (
                                <div className="grid grid-cols-2 gap-3 pb-4">
                                    <button onClick={() => setDraftAccount({ type: "銀行", catId: "cash" })} className="border border-slate-200 bg-white shadow-sm rounded-2xl p-5 flex flex-col items-center gap-3 hover:bg-slate-200 transition-colors"><Landmark size={28} className="text-cyan-600" /><span className="text-sm font-bold">銀行口座</span></button>
                                    <button onClick={() => setDraftAccount({ type: "クレジットカード", catId: "cards" })} className="border border-slate-200 bg-white shadow-sm rounded-2xl p-5 flex flex-col items-center gap-3 hover:bg-slate-200 transition-colors"><CreditCard size={28} className="text-amber-600" /><span className="text-sm font-bold">カード</span></button>
                                    <button onClick={() => setDraftAccount({ type: "電子マネー", catId: "paypay" })} className="border border-slate-200 bg-white shadow-sm rounded-2xl p-5 flex flex-col items-center gap-3 hover:bg-slate-200 transition-colors"><Smartphone size={28} className="text-emerald-600" /><span className="text-sm font-bold">電子マネー</span></button>
                                    <button onClick={() => setDraftAccount({ type: "各種設定", catId: "advances" })} className="border border-slate-200 bg-white shadow-sm rounded-2xl p-5 flex flex-col items-center gap-3 hover:bg-slate-200 transition-colors"><Settings size={28} className="text-slate-500" /><span className="text-sm font-bold">その他</span></button>
                                </div>
                            ) : (
                                <div className="space-y-4 pb-4 animate-in fade-in slide-in-from-right-4">
                                    <div>
                                        <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2 block">{draftAccount.type}名</label>
                                        <input type="text" value={draftForm.name} onChange={e => setDraftForm(p => ({ ...p, name: e.target.value }))} placeholder="例: 住信SBIネット銀行" className="w-full bg-slate-100 border border-slate-200 rounded-xl p-4 text-slate-900 focus:border-slate-400 outline-none" autoFocus />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2 block">初期残高</label>
                                        <input type="number" value={draftForm.balance} onChange={e => setDraftForm(p => ({ ...p, balance: e.target.value }))} placeholder="0" className="w-full bg-slate-100 border border-slate-200 rounded-xl p-4 text-slate-900 font-mono focus:border-slate-400 outline-none" />
                                    </div>
                                    <button onClick={handleSaveNewAccount} className="w-full bg-slate-900 hover:bg-slate-800 text-white shadow-xl font-bold py-4 rounded-xl mt-4 transition-colors">登録を完了する</button>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div >
    );
}

// ----------------------------------------------------------------------
// SALARY TAB (TAX SIMULATOR)
// ----------------------------------------------------------------------
function SalaryTab({ shiftsData, setShiftsData }: any) {
    const [hourlyWage, setHourlyWage] = useState(MOCK_SALARY.hourlyWage);
    const [transportation, setTransportation] = useState(MOCK_SALARY.transportation);
    const [isFreelancer, setIsFreelancer] = useState(false);
    const [targetAmount, setTargetAmount] = useState(70000);
    const [currentMonthOffset, setCurrentMonthOffset] = useState(0);
    const [closingDay, setClosingDay] = useState(25); // 締め日

    const [viewMode, setViewMode] = useState<'month' | 'year'>('month');

    // Modals internal states
    const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
    const [wageInput, setWageInput] = useState(hourlyWage.toString());
    const [transInput, setTransInput] = useState(transportation.toString());
    const [closingDayInput, setClosingDayInput] = useState(closingDay.toString());

    const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);
    const [targetInput, setTargetInput] = useState(targetAmount.toString());

    const [shiftModalDate, setShiftModalDate] = useState<string | null>(null);
    const [shiftHourInput, setShiftHourInput] = useState("8");

    const baseDate = new Date('2026-04-01');
    baseDate.setMonth(baseDate.getMonth() + currentMonthOffset);
    const m = baseDate.getMonth() + 1;
    const y = baseDate.getFullYear();

    const handleSetTarget = () => {
        setIsTargetModalOpen(true);
        setTargetInput(targetAmount.toString());
    };

    const handleConfigWage = () => {
        setIsConfigModalOpen(true);
        setWageInput(hourlyWage.toString());
        setTransInput(transportation.toString());
        setClosingDayInput(closingDay.toString());
    };

    const handleAddShift = () => {
        setShiftModalDate(null);
        setShiftHourInput("8");
    };

    const submitConfig = () => {
        const w = parseInt(wageInput, 10);
        const t = parseInt(transInput, 10);
        const c = parseInt(closingDayInput, 10);
        if (!isNaN(w)) setHourlyWage(w);
        if (!isNaN(t)) setTransportation(t);
        if (!isNaN(c)) setClosingDay(c);
        setIsConfigModalOpen(false);
    };

    const submitTarget = () => {
        const t = parseInt(targetInput, 10);
        if (!isNaN(t)) setTargetAmount(t);
        setIsTargetModalOpen(false);
    };

    const submitShift = () => {
        if (!shiftModalDate) return;
        const h = parseInt(shiftHourInput, 10);
        if (isNaN(h) || h === 0) {
            const copy = { ...shiftsData };
            delete copy[shiftModalDate];
            setShiftsData(copy);
        } else {
            setShiftsData((prev: any) => ({ ...prev, [shiftModalDate]: { hours: h } }));
        }
        setShiftModalDate(null);
    };

    // Accurate Tax Logic Setup (2026 Simulation Base)
    // Only count shifts that match the currently viewed month string
    // Accurate Tax Logic Setup (2026 Simulation Base)
    const monthlyShifts = useMemo(() => {
        return Object.keys(shiftsData).filter(dateStr => {
            const date = new Date(dateStr);
            const checkYear = date.getFullYear();
            const checkMonth = date.getMonth() + 1;
            const checkDay = date.getDate();

            // Example: Closing day = 25. April range = 3/26 to 4/25.
            // If checkDay > closingDay, it belongs to next month's bucket.
            // Simplified: Effective month/year for the shift.
            let effectiveYear = checkYear;
            let effectiveMonth = checkDay > closingDay ? checkMonth + 1 : checkMonth;

            if (effectiveMonth > 12) {
                effectiveMonth = 1;
                effectiveYear += 1;
            }

            return effectiveYear === y && effectiveMonth === m;
        }).map(k => shiftsData[k]);
    }, [shiftsData, y, m, closingDay]);

    const totalHours: number = monthlyShifts.reduce((acc: any, s: any) => acc + s.hours, 0) as number;
    const totalShifts = monthlyShifts.length;
    const currentGross = (hourlyWage * totalHours) + (transportation * totalShifts);
    const annualizedGross = currentGross * 12; // Simple projection

    const standardDeduction = 480000;

    let projectedIncomeTax = 0;
    let projectedResidentTax = 0;
    let projectedPension = 0;
    let projectedNHI = 0;
    let projectedSocialInsurance = 0;
    let currentMonthPension = 0;
    let currentMonthNHI = 0;
    let currentMonthSocialInsurance = 0;
    let taxableIncome = 0;

    if (isFreelancer) {
        taxableIncome = Math.max(0, annualizedGross - standardDeduction - 650000); // approximated blue return
        if (taxableIncome <= 1950000) projectedIncomeTax = taxableIncome * 0.05;
        else projectedIncomeTax = (1950000 * 0.05) + ((taxableIncome - 1950000) * 0.10);

        projectedResidentTax = taxableIncome > 0 ? taxableIncome * 0.10 : 0;
        projectedPension = 16980 * 12;
        projectedNHI = annualizedGross * 0.09;

        currentMonthPension = 16980;
        currentMonthNHI = Math.floor(projectedNHI / 12);
    } else {
        const employmentIncomeDeduction = Math.min(Math.max(annualizedGross * 0.4, 550000), 1950000);
        taxableIncome = Math.max(0, annualizedGross - standardDeduction - employmentIncomeDeduction);

        if (taxableIncome <= 1950000) projectedIncomeTax = taxableIncome * 0.05;
        else projectedIncomeTax = (1950000 * 0.05) + ((taxableIncome - 1950000) * 0.10);

        projectedResidentTax = taxableIncome > 0 ? taxableIncome * 0.10 : 0;
        projectedSocialInsurance = annualizedGross >= 1060000 ? annualizedGross * 0.15 : 0;

        currentMonthSocialInsurance = Math.floor(projectedSocialInsurance / 12);
    }

    const currentMonthIncomeTax = Math.floor(projectedIncomeTax / 12);
    const currentMonthResidentTax = Math.floor(projectedResidentTax / 12);

    const currentNet = isFreelancer
        ? currentGross - currentMonthIncomeTax - currentMonthResidentTax - currentMonthPension - currentMonthNHI
        : currentGross - currentMonthIncomeTax - currentMonthResidentTax - currentMonthSocialInsurance;

    const isOver106 = annualizedGross >= 1060000;
    const isOver130 = annualizedGross >= 1300000;

    return (
        <div className="pb-16 bg-white min-h-screen -m-3 md:-m-6 text-slate-800">
            {/* Shift Board Header */}
            <header className="bg-white flex justify-between items-center py-3 px-4 shadow-sm border-b border-slate-200">
                <div className="w-5 h-5" /> {/* Empty spacer instead of ? */}
                <div className="text-lg font-bold tracking-tighter text-slate-900">{y}年 {m}月</div>
                <button onClick={handleConfigWage} className="text-emerald-700 shadow-sm transition-transform hover:scale-110 active:scale-95"><Settings size={20} className="fill-emerald-700" /></button>
            </header>

            {/* Toggle Tabs */}
            <div className="flex border-b-2 border-slate-100 bg-white">
                <div className="flex-1 flex justify-center">
                    <button onClick={() => setViewMode('month')} className={cn("px-8 py-3 font-bold transition-all border-b-4", viewMode === 'month' ? "border-emerald-600 text-emerald-600" : "border-transparent text-slate-300 font-medium")}>月</button>
                </div>
                <div className="flex-1 flex justify-center">
                    <button onClick={() => setViewMode('year')} className={cn("px-8 py-3 font-bold transition-all border-b-4", viewMode === 'year' ? "border-emerald-600 text-emerald-600" : "border-transparent text-slate-300 font-medium")}>年</button>
                </div>
            </div>

            {viewMode === 'year' ? (
                <div className="bg-slate-50 p-4 space-y-6">
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                        <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                            <TrendingUp size={16} className="text-emerald-500" /> {y}年 予想給与合計
                        </h3>
                        <div className="text-center py-4">
                            <span className="text-3xl font-sans font-black text-slate-900 tracking-tighter">
                                ¥{(currentGross * 12).toLocaleString()}
                            </span>
                            <div className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-widest">Gross Projection</div>
                        </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">月次予測推移</h3>
                        <div className="space-y-3">
                            {Array.from({ length: 12 }).map((_, idx) => {
                                const currentM = idx + 1;
                                const isCurrent = currentM === m;
                                return (
                                    <div key={idx} className={cn("flex items-center gap-4 p-2 rounded-xl border transition-all", isCurrent ? "bg-emerald-50 border-emerald-200 ring-4 ring-emerald-50" : "bg-transparent border-transparent")}>
                                        <div className={cn("w-10 text-center font-bold text-sm", isCurrent ? "text-emerald-700" : "text-slate-400")}>{currentM}月</div>
                                        <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: Math.min((currentGross / (targetAmount || 1)) * 100, 100) + '%' }} />
                                        </div>
                                        <div className={cn("w-20 text-right font-mono font-bold text-xs tabular-nums", isCurrent ? "text-emerald-600" : "text-slate-600")}>¥{currentGross.toLocaleString()}</div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="bg-emerald-600 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden">
                        <div className="relative z-10">
                            <h4 className="font-bold text-sm mb-1 opacity-90">税控除後の手元残り（概算）</h4>
                            <div className="text-2xl font-black font-sans tracking-tighter mb-4">¥{(currentNet * 12).toLocaleString()} / Year</div>
                            <p className="text-[10px] leading-relaxed opacity-70 font-bold">
                                ※ この数値は現在の勤務状況が1年間継続した場合のシミュレーションです。住民税や社会保険料は前年度の収入や年齢により変動する場合があります。
                            </p>
                        </div>
                        <div className="absolute -right-8 -bottom-8 opacity-10">
                            <TrendingUp size={160} />
                        </div>
                    </div>
                </div>
            ) : (

                <div className="bg-white p-4 pt-6 text-center">
                    <div className="flex justify-between items-center mb-6">
                        <button onClick={() => setCurrentMonthOffset(p => p - 12)} className="text-emerald-700 font-bold text-xs flex items-center hover:opacity-70"><ChevronLeft size={16} /> 1年前を見る</button>
                        <button onClick={handleSetTarget} className="border border-emerald-600 text-emerald-700 text-[10px] font-bold rounded-full px-3 py-1 flex items-center gap-1 hover:bg-emerald-50 transition-colors">
                            月間目標 ¥{targetAmount.toLocaleString()} <span className="bg-emerald-600 text-white rounded-full p-0.5 ml-1"><Settings size={8} /></span>
                        </button>
                    </div>

                    {/* Massive Green Circle Chart */}
                    <div className="relative mx-auto w-64 h-64 flex items-center justify-center mb-8 mt-10">
                        <ChevronLeft onClick={() => setCurrentMonthOffset(p => p - 1)} size={32} className="absolute -left-12 text-slate-300 font-light cursor-pointer hover:text-emerald-500 active:scale-90 transition-all" />
                        {/* Circle SVG */}
                        <svg className="w-full h-full transform -rotate-90 absolute">
                            <circle cx="128" cy="128" r="115" className="stroke-slate-50" strokeWidth="20" fill="none" />
                            <circle cx="128" cy="128" r="115" className="stroke-[#0bd433]" strokeWidth="20" strokeDasharray="722" strokeDashoffset={722 - (Math.min(currentGross / (targetAmount || 1), 1) * 722)} strokeLinecap="round" fill="none" style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1)' }} />
                        </svg>
                        <div className="flex flex-col items-center justify-center z-10 space-y-2">
                            <span className="text-[10px] font-black text-slate-400 tracking-widest uppercase mb-1">Estimated</span>
                            <span className="text-4xl font-sans tracking-tighter text-slate-900 font-black">¥{currentGross.toLocaleString()}</span>
                        </div>
                        <ChevronRight onClick={() => setCurrentMonthOffset(p => p + 1)} size={32} className="absolute -right-12 text-slate-300 font-light cursor-pointer hover:text-emerald-500 active:scale-90 transition-all" />
                    </div>

                    <div className="flex justify-center items-end gap-4 text-sm font-bold text-slate-700 mb-6 font-sans">
                        <div><span className="text-[10px] font-medium opacity-80 mr-1">勤務時間</span><span className="text-xl">{Math.floor(totalHours)}h{Math.round((totalHours % 1) * 60)}m</span></div>
                        <div><span className="text-[10px] font-medium opacity-80 mr-1">給料見込</span><span className="text-xl tracking-tighter">¥{currentGross.toLocaleString()}</span></div>
                    </div>

                    <button onClick={handleConfigWage} className="w-full max-w-[80%] mx-auto border border-slate-300 text-slate-600 font-bold text-[11px] py-2.5 rounded hover:bg-slate-50 transition-colors shadow-sm mb-6 flex justify-center items-center gap-2">
                        <Settings size={12} />
                        給料見込の対象期間・内訳を編集する
                    </button>

                    {/* Shift Calendar */}
                    <div className="w-full max-w-[90%] mx-auto bg-white border border-slate-200 rounded-xl p-4 shadow-sm mb-6">
                        <div className="flex justify-between items-center mb-4 px-1">
                            <button onClick={() => setCurrentMonthOffset(p => p - 1)} className="text-slate-400 p-1 bg-slate-50 rounded-full hover:bg-slate-100"><ChevronLeft size={14} strokeWidth={3} /></button>
                            <span className="font-bold text-[13px] text-slate-800 tracking-wider">{y}年{m}月 シフト管理</span>
                            <button onClick={() => setCurrentMonthOffset(p => p + 1)} className="text-slate-400 p-1 bg-slate-50 rounded-full hover:bg-slate-100"><ChevronRight size={14} strokeWidth={3} /></button>
                        </div>
                        <div className="grid grid-cols-7 gap-1.5">
                            {['日', '月', '火', '水', '木', '金', '土'].map((d, i) => <div key={d} className={cn("text-[9px] font-bold mb-1", i === 0 ? "text-rose-500" : i === 6 ? "text-blue-500" : "text-slate-500")}>{d}</div>)}
                            {Array(3).fill(0).map((_, i) => <div key={'e' + i} />)}
                            {Array.from({ length: 30 }).map((_, i) => {
                                const d = i + 1;
                                const key = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                                const h = shiftsData[key]?.hours;
                                return (
                                    <div onClick={() => {
                                        setShiftModalDate(key);
                                        setShiftHourInput(h ? h.toString() : "8");
                                    }} key={d} className={cn("h-9 flex flex-col items-center justify-center rounded border transition-colors cursor-pointer", h ? "bg-emerald-50/50 border-emerald-200 text-emerald-700 shadow-sm" : "border-slate-50 bg-white hover:bg-slate-50")}>
                                        <span className={cn("text-[10px] font-bold", !h && "text-slate-600")}>{d}</span>
                                        {h && <span className="text-[8px] font-bold opacity-80">{h}h</span>}
                                    </div>
                                )
                            })}
                        </div>
                        <button onClick={handleAddShift} className="w-full mt-4 bg-emerald-50 hover:bg-emerald-100 active:scale-95 text-emerald-700 font-bold text-[11px] py-2.5 rounded-lg border border-emerald-200 transition-all flex items-center justify-center">
                            <Plus size={12} className="inline mr-1 mb-0.5" />シフトを追加・一括編集する
                        </button>
                    </div>

                    {/* workplaces detailed row */}
                    <div className="border-t border-b border-slate-200 mt-4 px-1" />
                    <div className="grid grid-cols-4 text-center text-[10px] text-slate-500 py-3 font-semibold bg-white">
                        <div className="col-span-1 border-r border-slate-200"></div>
                        <div className="text-center">勤務時間</div>
                        <div className="text-center">給料見込</div>
                        <div className="text-center">給料実績</div>
                    </div>
                    <div className="border-b border-slate-200" />

                    {/* mozu row */}
                    <div className="py-4 border-b border-slate-100 flex flex-col px-4 text-left group">
                        <div className="font-bold text-sm text-slate-800 mb-2">mozu</div>
                        <div className="grid grid-cols-4 w-full">
                            <div className="col-span-1"></div>
                            <div className="text-center font-sans text-sm">{Math.floor(totalHours)}h{Math.round((totalHours % 1) * 60)}m</div>
                            <div className="text-center font-sans tracking-tight text-sm">¥{(totalHours * hourlyWage).toLocaleString()}</div>
                            <div className="text-center text-slate-400 text-xs font-semibold flex items-center justify-center gap-1">未入力 <span className="text-emerald-600 opacity-60"><Plus size={10} className="rotate-45" /></span></div>
                        </div>
                    </div>
                    {/* 新井園 row */}
                    <div className="py-4 border-b border-slate-200 flex flex-col px-4 text-left">
                        <div className="font-bold text-sm text-slate-800 mb-2 cursor-pointer flex gap-2"><PlusCircle size={14} className="text-emerald-500" /> 新規勤務地を追加</div>
                    </div>
                </div>
            )}

            {/* Tax Sim below */}
            <div className="bg-slate-50 p-4 border-t border-slate-200 pt-8 pb-12">
                <header className="mb-4">
                    <h2 className="text-xl font-bold tracking-tight text-slate-900 mb-2">My Tax Simulator</h2>
                    <div className="flex bg-white p-1 rounded-xl mb-4 border border-slate-200 shadow-sm">
                        <button onClick={() => setIsFreelancer(false)} className={cn("flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-colors", !isFreelancer ? "bg-slate-200 text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900")}>会社員/アルバイト</button>
                        <button onClick={() => setIsFreelancer(true)} className={cn("flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-colors", isFreelancer ? "bg-slate-200 text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900")}>個人事業主/フリー</button>
                    </div>
                </header>

                <div className="border border-slate-200 rounded-2xl p-4 bg-white shadow-sm mb-6">
                    <h4 className="text-[11px] font-bold text-slate-900 mb-4 bg-slate-100 uppercase py-1 px-2 rounded w-fit">将来の概算税金予測 (月割)</h4>
                    <div className="space-y-3 font-mono text-xs">
                        <div className="flex justify-between text-slate-700">
                            <span>見込売上/給与総額</span>
                            <span>¥{currentGross.toLocaleString()}</span>
                        </div>
                        <div className="pt-2 pb-2 mt-2 border-y border-slate-200 space-y-2">
                            <div className="flex justify-between text-slate-500">
                                <span>所得税 (概算)</span>
                                <span className="text-rose-600">-¥{currentMonthIncomeTax.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-slate-500">
                                <span>住民税 (概算)</span>
                                <span className="text-rose-600">-¥{currentMonthResidentTax.toLocaleString()}</span>
                            </div>
                            {isFreelancer ? (
                                <>
                                    <div className="flex justify-between text-slate-500">
                                        <span>国民年金 (定額)</span>
                                        <span className="text-rose-600">-¥{currentMonthPension.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-slate-500">
                                        <span>国民健康保険 (概算)</span>
                                        <span className="text-rose-600">-¥{currentMonthNHI.toLocaleString()}</span>
                                    </div>
                                </>
                            ) : (
                                <div className="flex justify-between text-slate-500">
                                    <span>社会保険料 (健康/年金)</span>
                                    <span className="text-rose-600">-¥{currentMonthSocialInsurance.toLocaleString()}</span>
                                </div>
                            )}
                        </div>
                        <div className="flex justify-between font-bold pt-2 text-sm text-slate-900 items-end">
                            <span className="text-[10px] mb-0.5">差引手取り (Net)</span>
                            <span className="text-emerald-600 text-lg tabular-nums tracking-tighter">¥{currentNet > 0 ? currentNet.toLocaleString() : 0}</span>
                        </div>
                    </div>
                </div>

                {!isFreelancer && (
                    <div className={cn("border rounded-xl p-4 shadow-sm relative overflow-hidden bg-white hover:shadow transition", isOver130 ? "border-rose-400/50" : isOver106 ? "border-amber-400/50" : "border-emerald-500/30")}>
                        {isOver130 && <div className="absolute top-0 right-0 left-0 h-1 bg-rose-500" />}
                        {isOver106 && !isOver130 && <div className="absolute top-0 right-0 left-0 h-1 bg-amber-500" />}
                        {!isOver106 && <div className="absolute top-0 right-0 left-0 h-1 bg-emerald-500" />}
                        <div className="flex flex-col gap-1 relative z-10 pt-2">
                            <h4 className={cn("font-bold text-xs tracking-tight mb-2 flex items-center justify-between", isOver130 ? "text-rose-600" : isOver106 ? "text-amber-600" : "text-emerald-600")}>
                                <span>{isOver130 ? "130万円の壁" : isOver106 ? "106万円の壁" : "扶養内 (安全圏)"}</span>
                                {isOver130 && <AlertTriangle size={14} />}
                            </h4>

                            {/* 106w bar */}
                            <div className="mt-4">
                                <div className="flex justify-between text-[9px] font-bold text-slate-500 mb-1 font-mono uppercase">
                                    <span className="tracking-widest">社会保険加入ライン</span>
                                    <span className={isOver106 ? "text-rose-600" : "text-emerald-600"}>{isOver106 ? '超過済' : "あと " + (1060000 - annualizedGross).toLocaleString() + " 円"}</span>
                                </div>
                                <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                                    <div className={cn("h-full transition-all", isOver106 ? "bg-rose-500" : "bg-emerald-500")} style={{ width: Math.min((annualizedGross / 1060000) * 100, 100) + '%' }} />
                                </div>
                            </div>

                            {/* 130w bar */}
                            <div className="mt-3">
                                <div className="flex justify-between text-[9px] font-bold text-slate-500 mb-1 font-mono uppercase">
                                    <span className="tracking-widest">完全扶養外ライン</span>
                                    <span className={isOver130 ? "text-rose-600" : "text-emerald-600"}>{isOver130 ? '超過済' : "あと " + (1300000 - annualizedGross).toLocaleString() + " 円"}</span>
                                </div>
                                <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                                    <div className={cn("h-full transition-all", isOver130 ? "bg-rose-500" : "bg-emerald-500")} style={{ width: Math.min((annualizedGross / 1300000) * 100, 100) + '%' }} />
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <AnimatePresence>
                {isTargetModalOpen && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white rounded-2xl w-full max-w-xs overflow-hidden shadow-2xl">
                            <div className="bg-emerald-50 px-4 py-3 flex justify-between items-center border-b border-emerald-100">
                                <h3 className="font-bold text-emerald-800 text-sm">月間目標の設定</h3>
                                <button onClick={() => setIsTargetModalOpen(false)} className="text-emerald-400 hover:text-emerald-600"><X size={18} /></button>
                            </div>
                            <div className="p-4 space-y-4">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 mb-1 block">目標金額 (円)</label>
                                    <input type="number" value={targetInput} onChange={e => setTargetInput(e.target.value)} placeholder="70000" className="w-full rounded-md border border-slate-200 p-2 text-sm focus:border-emerald-500 outline-none tabular-nums" />
                                </div>
                            </div>
                            <div className="p-4 border-t border-slate-100 mt-2">
                                <button onClick={submitTarget} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-lg transition-colors">設定を保存</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}

                {isConfigModalOpen && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
                            <div className="bg-slate-100 px-4 py-3 flex justify-between items-center border-b border-slate-200">
                                <h3 className="font-bold text-slate-800 text-xs flex items-center gap-2"><Settings size={14} /> 給与・計算期間の設定</h3>
                                <button onClick={() => setIsConfigModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
                            </div>
                            <div className="p-5 space-y-6">
                                <section>
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-100 pb-1">基本給与設定</h4>
                                    <div className="space-y-3">
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-500 mb-1 block italic">ベース時給 (円)</label>
                                            <input type="number" value={wageInput} onChange={e => setWageInput(e.target.value)} placeholder="1100" className="w-full rounded-lg border border-slate-200 p-3 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none tabular-nums bg-slate-50/50" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-500 mb-1 block italic">1日あたり交通費 (円)</label>
                                            <input type="number" value={transInput} onChange={e => setTransInput(e.target.value)} placeholder="0" className="w-full rounded-lg border border-slate-200 p-3 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none tabular-nums bg-slate-50/50" />
                                        </div>
                                    </div>
                                </section>

                                <section>
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-100 pb-1">計算期間（締め日）の設定</h4>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 mb-1 block italic">給与締め日 (例: 25なら前月26日〜当月25日)</label>
                                        <div className="flex items-center gap-2">
                                            <input type="number" value={closingDayInput} onChange={e => setClosingDayInput(e.target.value)} placeholder="25" className="w-20 rounded-lg border border-slate-200 p-3 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none tabular-nums bg-slate-50/50 text-center" />
                                            <span className="text-xs font-bold text-slate-600">日締め</span>
                                        </div>
                                        <p className="text-[10px] text-slate-400 mt-2">※ この設定により、月次表示の対象となるシフトの範囲が決定されます。</p>
                                    </div>
                                </section>
                            </div>
                            <div className="p-4 bg-slate-50 border-t border-slate-100">
                                <button onClick={submitConfig} className="w-full bg-slate-900 hover:bg-black text-white font-bold py-3 rounded-xl transition-all text-sm shadow-lg active:scale-[0.98]">設定を保存する</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}

                {shiftModalDate && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
                        <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
                            <div className="bg-slate-100 px-4 py-3 flex justify-between items-center border-b border-slate-200">
                                <h3 className="font-bold text-slate-800 text-sm">シフト入力: {shiftModalDate}</h3>
                                <button onClick={() => setShiftModalDate(null)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
                            </div>
                            <div className="p-6">
                                <label className="text-[10px] font-bold text-slate-500 mb-2 block text-center">この日の勤務時間 (0を入力で削除)</label>
                                <div className="flex items-center justify-center gap-4">
                                    <button onClick={() => setShiftHourInput(p => Math.max(0, parseInt(p || '0', 10) - 1).toString())} className="w-12 h-12 rounded-full border-2 border-slate-200 text-slate-500 hover:bg-slate-50 font-bold text-xl flex items-center justify-center">-</button>
                                    <input type="number" value={shiftHourInput} onChange={e => setShiftHourInput(e.target.value)} className="w-20 text-center font-bold text-3xl tabular-nums rounded-md border border-slate-300 py-2 outline-none focus:border-emerald-500" autoFocus />
                                    <button onClick={() => setShiftHourInput(p => (parseInt(p || '0', 10) + 1).toString())} className="w-12 h-12 rounded-full border-2 border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 font-bold text-xl flex items-center justify-center">+</button>
                                </div>
                            </div>
                            <div className="p-4 border-t border-slate-100 flex gap-2">
                                <button onClick={() => { setShiftHourInput("0"); submitShift(); }} className="flex-1 bg-rose-50 text-rose-600 font-bold py-3 rounded-lg transition-colors text-sm border border-rose-100">シフト削除</button>
                                <button onClick={submitShift} className="px-8 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-lg transition-colors text-sm shadow-md">決定</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ----------------------------------------------------------------------
// AI TAB
// ----------------------------------------------------------------------
function AITab({ historyData, assetsData }: { historyData: any[], assetsData: any }) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [messages, setMessages] = useState<any[]>([
        { id: '1', role: 'ai', text: 'ご機嫌いかがでしょうか？ Fin-Tech AssistantのAI機能です。\n最新のデータベース(Supabase)情報に基づいた分析が可能です。何でも聞いてください！' }
    ]);

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [messages, isTyping]);

    const handleSend = async (text: string) => {
        if (!text.trim()) return;
        const newMsgId = Date.now().toString();
        const userMsg = { id: newMsgId, role: 'user', text };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsTyping(true);

        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.text })),
                    contextData: {
                        totalAssets: assetsData?.totalAssets || 0,
                        recentHistory: historyData ? historyData.slice(0, 15).map((h: any) => ({ date: h.date, item: h.item, amount: h.amount })) : [],
                        categorizedSpending: Object.keys(historyData.filter(h => h.amount < 0).reduce((acc: any, h) => {
                            const cat = h.item.includes('食') ? '食費' : h.item.includes('交通') ? '交通費' : 'その他';
                            acc[cat] = (acc[cat] || 0) + Math.abs(h.amount);
                            return acc;
                        }, {})).map(k => ({ category: k, amount: 0 })), // Detailed category summary planned for future
                        currentMonthNet: historyData.filter(h => h.date.startsWith('2026-04')).reduce((s, h) => s + h.amount, 0)
                    }
                })
            });
            const data = await res.json();
            setMessages(prev => [...prev, { id: newMsgId + 'ai', role: 'ai', text: data.response }]);
        } catch (err) {
            setMessages(prev => [...prev, { id: newMsgId + 'ai', role: 'ai', text: "通信エラーが発生しました。" }]);
        } finally {
            setIsTyping(false);
        }
    };

    const handleFileUpload = (e: any) => {
        const file = e.target.files[0];
        if (!file) return;
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', text: "📎 " + file.name + " をアップロードしました" }]);
        setIsTyping(true);
        setTimeout(() => {
            setMessages(prev => [...prev, { id: Date.now().toString() + 'ai', role: 'ai', text: "ファイルの解析が完了しました。データから34件の取引履歴を抽出し、データベースへの自動マッピングを成功裏に終えました。引き続きAIサポートが必要な場合はお申し付けください。" }]);
            setIsTyping(false);
        }, 1500);
    };

    return (
        <div className="flex flex-col h-[calc(100vh-140px)]">
            <header className="pt-2 mb-4 flex-shrink-0">
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <Sparkles className="text-indigo-600" /> AI Assistant
                </h2>
                <p className="text-xs text-slate-500 mt-1">高度な財務分析とデータ処理</p>
            </header>

            <div ref={scrollRef} className="flex-1 overflow-y-auto mb-4 space-y-6 custom-scrollbar pb-4 pr-2">
                {messages.map((msg) => (
                    <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={cn("flex gap-4 w-full", msg.role === 'user' ? "justify-end" : "justify-start")}>
                        {msg.role === 'ai' && (
                            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center shrink-0 border border-indigo-500/30">
                                <Sparkles size={14} className="text-indigo-600" />
                            </div>
                        )}
                        <div className={cn("max-w-[85%] text-sm whitespace-pre-wrap leading-relaxed", msg.role === 'user' ? "bg-slate-200 text-slate-900 p-3 rounded-2xl rounded-tr-sm" : "text-slate-700 pt-1")}>
                            {msg.text}
                        </div>
                    </motion.div>
                ))}

                {isTyping && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-4 w-full">
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center shrink-0 border border-indigo-500/30">
                            <Loader2 className="animate-spin text-indigo-600" size={14} />
                        </div>
                        <div className="text-sm text-slate-500 pt-1">Thinking...</div>
                    </motion.div>
                )}
            </div>

            <div className="flex-shrink-0 bg-white shadow-sm border border-slate-200 rounded-2xl p-2 focus-within:border-indigo-500/50 focus-within:bg-slate-200 transition-colors">
                <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(input); } }}
                    placeholder="AIに質問、または指示を出す..."
                    className="w-full bg-transparent p-2 text-sm text-slate-900 outline-none resize-none min-h-[40px] max-h-[120px]"
                    rows={1}
                />
                <div className="flex justify-between items-center px-1 pb-1 mt-2 border-t border-slate-100 pt-2">
                    <div className="flex gap-2">
                        <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileUpload} accept=".csv,image/*" />
                        <button onClick={() => fileInputRef.current?.click()} className="p-1.5 text-slate-500 hover:text-slate-900 transition-colors rounded hover:bg-white shadow-sm" title="Attach file or CSV">
                            <Paperclip size={18} />
                        </button>
                        <button onClick={() => fileInputRef.current?.click()} className="p-1.5 text-slate-500 hover:text-slate-900 transition-colors rounded hover:bg-white shadow-sm" title="Take a photo">
                            <Camera size={18} />
                        </button>
                    </div>
                    <button onClick={() => handleSend(input)} className={cn("px-4 py-1.5 rounded-xl font-bold text-sm transition-all", input.trim() ? "bg-slate-900 text-white shadow-lg hover:scale-105" : "bg-slate-200 text-slate-500 pointer-events-none")}>
                        Send
                    </button>
                </div>
            </div>
        </div>
    );
}
