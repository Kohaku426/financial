'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Home, Wallet, List, Calculator, Bot,
    ChevronDown, ChevronLeft, ChevronRight, Send, AlertTriangle, Loader2,
    Landmark, CreditCard, Banknote, Camera,
    PlusCircle, ScanLine, Smartphone, CheckCircle2,
    X, Plus, FileDown, CalendarDays, Settings, Paperclip, ArrowUpRight, ArrowDownRight, Sparkles, ArrowDownUp, PiggyBank, History, Trash, Trash2, TrendingUp, PieChart as PieChartIcon
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
    const [editingTransaction, setEditingTransaction] = useState<any>(null);

    const [assetsData, setAssetsData] = useState(() => {
        const empty = JSON.parse(JSON.stringify(MOCK_ASSETS));
        empty.categories.forEach((c: any) => { c.items = []; c.total = 0; });
        empty.totalAssets = 0;
        return empty;
    });
    const [historyData, setHistoryData] = useState<any[]>([]);
    const [shiftsData, setShiftsData] = useState<any[]>([]);
    const [incomeCategories, setIncomeCategories] = useState(INCOME_CATEGORIES);
    const [expenseCategories, setExpenseCategories] = useState(EXPENSE_CATEGORIES);
    const [workplaces, setWorkplaces] = useState<any[]>([]);
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
        const uid = user.id; // Capture and refine
        let isMounted = true;
        async function fetchSupabaseData() {
            try {
                let { data: accounts } = await supabase.from('accounts').select('*').eq('user_id', uid);

                // NO SEEDING: Start with a clean slate
                if (!accounts) accounts = [];
                const { data: histories } = await supabase.from('histories').select('*').eq('user_id', uid).order('date', { ascending: false });

                if (!isMounted) return;

                // Reconstruct Assets State dynamically
                const clonedAssets = JSON.parse(JSON.stringify(MOCK_ASSETS));
                clonedAssets.totalAssets = 0;

                if (accounts && accounts.length > 0) {
                    clonedAssets.categories.forEach((cat: any) => {
                        cat.items = accounts!.filter((a: any) => a.category_id === cat.id);
                        cat.total = cat.items.reduce((sum: number, c: any) => sum + Number(c.balance), 0);
                        clonedAssets.totalAssets += cat.total;
                    });
                } else {
                    // Empty state for categories
                    clonedAssets.categories.forEach((cat: any) => {
                        cat.items = [];
                        cat.total = 0;
                    });
                }
                setAssetsData(clonedAssets);

                if (histories && histories.length > 0) {
                    setHistoryData(histories);
                } else {
                    setHistoryData([]);
                }

                // --- Load Salary Data ---
                const { data: dbWorkplaces } = await supabase.from('workplaces').select('*').eq('user_id', uid);
                if (dbWorkplaces) setWorkplaces(dbWorkplaces);

                const { data: dbShifts } = await supabase.from('shifts').select('*').eq('user_id', uid);
                if (dbShifts) {
                    const mappedShifts: Record<string, any> = {};
                    dbShifts.forEach(s => {
                        // If multiple shifts exist on the same day (different workplaces), we store them in a way the UI can handle.
                        // For the summary/total calculation, we need all shifts.
                        // For the simple calendar grid display, we'll show the sum or the first one.
                        if (mappedShifts[s.date]) {
                            mappedShifts[s.date].hours += s.hours;
                            // Note: This loses individual workplace attribution for the *calendar click* if we just store an object.
                            // Better: Store an array of shifts for that date.
                        } else {
                            mappedShifts[s.date] = { hours: s.hours, workplace_id: s.workplace_id, id: s.id };
                        }
                    });
                    setShiftsData(mappedShifts);
                }
            } catch (err) {
                console.error("Supabase load error:", err);
            } finally {
                if (isMounted) setIsSupabaseLoading(false);
            }
        }
        fetchSupabaseData();
        return () => { isMounted = false; };
    }, [user]);

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
        const onEdit = (t: any) => { setEditingTransaction(t); setIsAddTransactionOpen(true); };
        switch (activeTab) {
            case 'home': return <HomeTab historyData={historyData} assetsData={assetsData} onEditTransaction={onEdit} />;
            case 'assets': return <AssetsTab user={user} expandedCategories={expandedCategories} toggleCategory={toggleCategory} assetsData={assetsData} setAssetsData={setAssetsData} historyData={historyData} onDeleteHistory={handleDeleteHistory} />;
            case 'salary': return <SalaryTab shiftsData={shiftsData} setShiftsData={setShiftsData} workplaces={workplaces} setWorkplaces={setWorkplaces} user={user} />;
            case 'report': return <ReportTab historyData={historyData} onDeleteHistory={handleDeleteHistory} onEditTransaction={onEdit} />;
            case 'history': return <HistoryTab historyData={historyData} onDeleteHistory={handleDeleteHistory} assetsData={assetsData} onEditTransaction={onEdit} />;
            case 'ai': return <AITab historyData={historyData} assetsData={assetsData} user={user} />;
            default: return <HomeTab historyData={historyData} assetsData={assetsData} onEditTransaction={onEdit} />;
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
                        onClose={() => { setIsAddTransactionOpen(false); setEditingTransaction(null); }}
                        incomeCategories={incomeCategories}
                        setIncomeCategories={setIncomeCategories}
                        expenseCategories={expenseCategories}
                        setExpenseCategories={setExpenseCategories}
                        assetsData={assetsData}
                        setAssetsData={setAssetsData}
                        setHistoryData={setHistoryData}
                        user={user}
                        editingTransaction={editingTransaction}
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
function AddTransactionModal({ onClose, incomeCategories, setIncomeCategories, expenseCategories, setExpenseCategories, assetsData, setAssetsData, setHistoryData, user, editingTransaction }: any) {
    const [amount, setAmount] = useState(editingTransaction ? Math.abs(editingTransaction.amount).toString() : '');
    const [account, setAccount] = useState(editingTransaction ? editingTransaction.account : '三菱UFJ銀行');
    const [date, setDate] = useState(editingTransaction ? editingTransaction.date : new Date().toISOString().split('T')[0]);
    const [isIncome, setIsIncome] = useState(editingTransaction ? editingTransaction.amount > 0 : false);
    const displayedCategories = isIncome ? incomeCategories : expenseCategories;
    const [category, setCategory] = useState(editingTransaction ? (editingTransaction.item.includes(' - ') ? editingTransaction.item.split(' - ')[0] : editingTransaction.item) : expenseCategories[0]);
    const [memo, setMemo] = useState(editingTransaction ? (editingTransaction.item.includes(' - ') ? editingTransaction.item.split(' - ')[1] : '') : '');
    const [isAdvance, setIsAdvance] = useState(false);

    const [isMultiDate, setIsMultiDate] = useState(false);
    const [selectedDates, setSelectedDates] = useState<string[]>([]);
    const [isOcrLoading, setIsOcrLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleSave = async () => {
        if (!amount || !user) return;
        const uid = user.id;
        const numAmount = parseInt(amount, 10) * (isIncome ? 1 : -1);

        const datesToProcess = isMultiDate && selectedDates.length > 0 ? selectedDates : [date];
        let finalAssets = JSON.parse(JSON.stringify(assetsData));

        // Helper to update account balance on server & locally
        const syncAccountBalance = async (accName: string, diff: number) => {
            const targetCat = finalAssets.categories.find((c: any) => c.items.some((i: any) => i.name === accName));
            if (targetCat) {
                const acct = targetCat.items.find((i: any) => i.name === accName);
                if (acct) {
                    acct.balance = Number(acct.balance) + diff;
                    targetCat.total = targetCat.items.reduce((sum: number, i: any) => sum + Number(i.balance), 0);
                    finalAssets.totalAssets = finalAssets.categories.reduce((sum: number, c: any) => sum + Number(c.total), 0);

                    // Persist to DB
                    await supabase.from('accounts').update({ balance: acct.balance }).eq('id', acct.id);
                }
            }
        };

        try {
            if (editingTransaction) {
                // Revert old amount
                await syncAccountBalance(editingTransaction.account, -editingTransaction.amount);
                // Apply new amount
                await syncAccountBalance(account, numAmount);

                const { data, error } = await supabase.from('histories').update({
                    date,
                    item: memo ? `${category} - ${memo}` : category,
                    account,
                    amount: numAmount,
                    type: isIncome ? 'income' : 'expense'
                }).eq('id', editingTransaction.id).select();

                if (error) throw error;
                if (data) setHistoryData((prev: any) => prev.map((h: any) => h.id === editingTransaction.id ? data[0] : h));

            } else {
                let dbTransactions: any[] = [];
                for (const d of datesToProcess) {
                    dbTransactions.push({
                        user_id: uid,
                        date: d,
                        item: memo ? `${category} - ${memo}` : category,
                        account,
                        amount: numAmount,
                        type: isIncome ? 'income' : 'expense'
                    });

                    await syncAccountBalance(account, numAmount);

                    if (isAdvance && !isIncome) {
                        // Reimbursement handling
                        const advanceCategory = finalAssets.categories.find((c: any) => c.id === 'advances');
                        // Simplified: assuming '立替金' account exists
                        const advAcc = advanceCategory?.items.find((i: any) => i.name === '立替金');
                        if (advAcc) {
                            await syncAccountBalance('立替金', Math.abs(numAmount));
                        }
                    }
                }
                const { data, error } = await supabase.from('histories').insert(dbTransactions).select();
                if (error) throw error;
                if (data) setHistoryData((prev: any) => [...data, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
            }

            setAssetsData(finalAssets);
            onClose();
        } catch (err) {
            console.error("Failed to save transaction:", err);
            alert("保存に失敗しました");
        }
    };

    const handleCameraClick = () => fileInputRef.current?.click();

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsOcrLoading(true);
        const reader = new FileReader();
        reader.onloadend = async () => {
            try {
                const base64 = reader.result as string;
                const res = await fetch('/api/ocr', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ image: base64 })
                });
                const data = await res.json();
                if (data.amount) setAmount(data.amount.toString());
                if (data.date) setDate(data.date);
                if (data.item) setMemo(data.item);
                if (data.category && (incomeCategories.includes(data.category) || expenseCategories.includes(data.category))) {
                    setCategory(data.category);
                }
            } catch (err) {
                console.error("OCR failed:", err);
            } finally {
                setIsOcrLoading(false);
            }
        };
        reader.readAsDataURL(file);
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-100/60 backdrop-blur-md z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="bg-white border border-slate-200 w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-slate-900 tracking-tight">取引を作成</h3>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-900 p-2 bg-white shadow-sm rounded-full"><X size={20} /></button>
                </div>

                <div className="flex bg-slate-100 p-1 rounded-xl mb-6 shadow-inner">
                    <button onClick={() => { setIsIncome(false); setCategory(expenseCategories[0]); }} className={cn("flex-1 py-2 text-sm font-bold rounded-lg transition-colors", !isIncome ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900")}>支出</button>
                    <button onClick={() => { setIsIncome(true); setCategory(incomeCategories[0]); }} className={cn("flex-1 py-2 text-sm font-bold rounded-lg transition-colors", isIncome ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900")}>収入</button>
                </div>

                <div className="space-y-6">
                    <div>
                        <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1 block">金額</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-xl font-mono">¥</span>
                            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" className={cn("w-full bg-slate-50 border border-slate-200 rounded-xl py-4 pl-12 pr-12 text-3xl font-mono focus:border-slate-400 focus:bg-white outline-none transition-all", !isIncome ? "text-slate-900" : "text-cyan-600")} autoFocus />
                            <button onClick={handleCameraClick} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-2">
                                {isOcrLoading ? <Loader2 size={24} className="animate-spin text-indigo-500" /> : <Camera size={24} />}
                            </button>
                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                        </div>
                    </div>

                    {!isIncome && (
                        <div className="space-y-3">
                            <label className="flex items-center gap-3 p-4 bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/20 rounded-xl cursor-pointer transition-colors">
                                <input type="checkbox" checked={isAdvance} onChange={e => setIsAdvance(e.target.checked)} className="rounded text-amber-500 focus:ring-amber-500 bg-slate-50 border-amber-500/50 w-5 h-5 accent-amber-500" />
                                <div className="flex flex-col">
                                    <span className="text-sm font-bold text-amber-600">立替フラグ (後で返ってくるお金)</span>
                                    <span className="text-[10px] text-amber-600/60 mt-0.5">立替金資産として同額を自動計上します</span>
                                </div>
                            </label>

                            <label className="flex items-center gap-3 p-4 bg-indigo-500/5 hover:bg-indigo-500/10 border border-indigo-500/20 rounded-xl cursor-pointer transition-colors">
                                <input type="checkbox" checked={isMultiDate} onChange={e => { setIsMultiDate(e.target.checked); if (!e.target.checked) setSelectedDates([]); }} className="rounded text-indigo-500 focus:ring-indigo-500 bg-slate-50 border-indigo-500/50 w-5 h-5 accent-indigo-500" />
                                <div className="flex flex-col">
                                    <span className="text-sm font-bold text-indigo-600">同じ金額を複数日に一括登録</span>
                                    <span className="text-[10px] text-indigo-600/60 mt-0.5">毎日ランチなど、同じ内容の記録に便利です</span>
                                </div>
                            </label>
                        </div>
                    )}

                    {!isMultiDate ? (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1 block">口座</label>
                                <select value={account} onChange={e => setAccount(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-3 text-sm text-slate-900 focus:border-slate-400 focus:bg-white outline-none appearance-none">
                                    {assetsData.categories.flatMap((cat: any) => cat.items).map((item: any) => (
                                        <option key={item.id} value={item.name}>{item.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1 block">日付</label>
                                <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-3 text-sm text-slate-900 focus:border-slate-400 focus:bg-white outline-none appearance-none block" />
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1 block">日付を選択 ({selectedDates.length}件)</label>
                            <div className="grid grid-cols-7 gap-1 bg-slate-50 p-3 rounded-xl border border-slate-200">
                                {Array.from({ length: 31 }).map((_, i) => {
                                    const d = i + 1;
                                    const dateStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                                    const isSelected = selectedDates.includes(dateStr);
                                    return (
                                        <button key={d} onClick={() => setSelectedDates(prev => isSelected ? prev.filter(x => x !== dateStr) : [...prev, dateStr])} className={cn("h-10 rounded-lg text-xs font-bold transition-all border", isSelected ? "bg-indigo-600 border-indigo-600 text-white" : "bg-white border-slate-100 text-slate-600 hover:border-slate-300")}>
                                            {d}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1 flex justify-between">
                                <span>カテゴリ</span>
                            </label>
                            <select value={category} onChange={e => setCategory(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-3 text-sm text-slate-900 focus:border-slate-400 focus:bg-white outline-none appearance-none">
                                {displayedCategories.map((c: string) => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1 block">メモ</label>
                            <input type="text" value={memo} onChange={e => setMemo(e.target.value)} placeholder="例: スタバ, 定期券" className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm text-slate-900 focus:border-slate-400 focus:bg-white outline-none" />
                        </div>
                    </div>

                    <button onClick={handleSave} className="w-full bg-slate-900 hover:bg-slate-800 text-white shadow-xl font-bold py-4 rounded-xl mt-4 transition-all active:scale-[0.98]">
                        {editingTransaction ? '変更を保存' : (isMultiDate ? `${selectedDates.length}件の記録を一括保存` : '記録を保存')}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}

// ----------------------------------------------------------------------
// HOME TAB (Money Forward ME Clone)
// ----------------------------------------------------------------------
function HomeTab({ historyData, assetsData, onEditTransaction }: { historyData: any[], assetsData: any, onEditTransaction: (t: any) => void }) {
    const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
    const [groupNameInput, setGroupNameInput] = useState('');

    // Account Filtering Logic
    const [assetGroups, setAssetGroups] = useState<{ name: string, ids: string[] | null }[]>([
        { name: 'すべての口座', ids: null },
        { name: '現金・銀行', ids: ['acc1', 'acc2', 'acc3'] },
        { name: '電子マネー除外', ids: ['acc1', 'acc2', 'acc3', 'acc6', 'acc7'] }
    ]);
    const [selectedGroupIndex, setSelectedGroupIndex] = useState(0);

    const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
    const [budgetLimits, setBudgetLimits] = useState<Record<string, number>>({ '食費': 40000, '交際費': 15000, '交通費': 10000 });

    const currentGroup = assetGroups[selectedGroupIndex];

    // Calculate current month's income/expense
    const currentDate = new Date();
    const currentMonthStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

    const monthEvents = historyData.filter(h => h.date.startsWith(currentMonthStr));
    const income = monthEvents.filter(h => h.amount > 0).reduce((sum, h) => sum + h.amount, 0);
    const expense = monthEvents.filter(h => h.amount < 0).reduce((sum, h) => sum + Math.abs(h.amount), 0);
    const net = income - expense;

    // Detailed Transaction View for Home Calendar
    const [selectedHomeDate, setSelectedHomeDate] = useState<string | null>(null);
    const dayTransactions = historyData.filter(h => h.date === selectedHomeDate);

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

    const expByCategory: Record<string, number> = {};
    monthEvents.filter(h => h.amount < 0).forEach(h => {
        const cat = getCategory(h.item);
        expByCategory[cat] = (expByCategory[cat] || 0) + Math.abs(h.amount);
    });

    const pieData = Object.keys(expByCategory).map(name => ({ name, value: expByCategory[name] })).sort((a, b) => b.value - a.value);
    const PIE_COLORS = ['#4f46e5', '#ec4899', '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#64748b'];

    const totalBudget = Object.values(budgetLimits).reduce((a, b) => a + b, 0);
    const totalBudgetExpense = Object.keys(budgetLimits).reduce((a, k) => a + (expByCategory[k] || 0), 0);
    const mainOverBudget = totalBudgetExpense > totalBudget;

    return (
        <>
            <div className="space-y-4 pt-2 pb-16 bg-slate-100 min-h-screen -m-3 md:-m-6 p-4">
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm mt-4">
                    <div className="flex justify-between items-center mb-4 text-slate-700 font-bold text-xs uppercase tracking-widest opacity-60">
                        <h3>総資産</h3>
                    </div>
                    <div className="text-right">
                        <p className="text-4xl font-sans font-black tracking-tighter text-slate-900">
                            <span className="text-2xl mr-1 opacity-50 font-medium">¥</span>
                            {assetsData.totalAssets.toLocaleString()}
                        </p>
                    </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                    <div className="flex justify-between items-center text-slate-700 mb-2">
                        <h3 className="font-bold flex items-center gap-2">家計簿 <span className="text-xs font-normal text-slate-500">{currentDate.getMonth() + 1}月1日〜末日</span></h3>
                    </div>
                    <div className="flex items-center mt-6">
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

                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mb-4">Cashflow Forecast</h3>
                    <div className="h-32 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={Array.from({ length: 7 }).map((_, i) => ({ name: i, val: assetsData.totalAssets + (net * (i / 30)) }))}>
                                <defs>
                                    <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <Area type="monotone" dataKey="val" stroke="#4f46e5" fillOpacity={1} fill="url(#colorVal)" strokeWidth={3} />
                                <Tooltip hideCursor labelStyle={{ display: 'none' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} formatter={(v: any) => `¥${Math.floor(v).toLocaleString()}`} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                    <div className="flex justify-between items-center text-slate-700 mb-4">
                        <h3 className="font-bold">予算（変動費）</h3>
                        <button onClick={() => setIsBudgetModalOpen(true)} className="text-slate-400 hover:text-slate-600"><Settings size={16} /></button>
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

                <div className="bg-white border text-center border-slate-200 rounded-xl p-5 shadow-sm overflow-hidden">
                    <h3 className="text-xs font-bold text-slate-900/40 mb-4 flex items-center gap-2 uppercase tracking-[0.2em]">
                        <CalendarDays size={14} /> April 2026
                    </h3>
                    <div className="grid grid-cols-7 gap-1">
                        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                            <div key={i} className="text-[10px] text-center text-slate-400 font-bold mb-2">{day}</div>
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
                                    onClick={() => (inc > 0 || exp < 0) && setSelectedHomeDate(dateStr)}
                                    className={cn(
                                        "relative flex flex-col p-1 rounded-xl border transition-all h-[58px] cursor-pointer",
                                        dayNum === 25 ? "bg-slate-900 border-slate-900 text-white" : "bg-white border-slate-50 hover:border-slate-300 shadow-sm",
                                    )}
                                >
                                    <span className={cn("text-[10px] font-bold text-left", dayNum === 25 ? "text-white/80" : "text-slate-400")}>{dayNum}</span>
                                    <div className="mt-auto flex flex-col items-end gap-0">
                                        {inc > 0 && <div className="text-[8px] text-blue-500 font-bold leading-none">+{Math.floor(inc / 1000)}k</div>}
                                        {exp < 0 && <div className="text-[8px] text-rose-500 font-bold leading-none">-{Math.floor(Math.abs(exp) / 1000)}k</div>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {selectedHomeDate && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
                        <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 30, stiffness: 300 }} className="bg-white border border-slate-200 w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl relative max-h-[80vh] overflow-y-auto">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-slate-900">{selectedHomeDate.split('-')[1]}月{selectedHomeDate.split('-')[2]}日の取引</h3>
                                <button onClick={() => setSelectedHomeDate(null)} className="text-slate-500 hover:text-slate-900 p-2 bg-slate-50 rounded-full"><X size={20} /></button>
                            </div>
                            <div className="space-y-3">
                                {dayTransactions.length > 0 ? dayTransactions.map((h: any) => (
                                    <div key={h.id} onClick={() => { setSelectedHomeDate(null); onEditTransaction(h); }} className="p-4 bg-slate-50 rounded-2xl flex justify-between items-center hover:bg-slate-100 transition-colors cursor-pointer active:scale-95 transition-transform">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{h.account}</span>
                                            <span className="font-bold text-slate-800">{h.item}</span>
                                        </div>
                                        <span className={cn("font-mono font-bold text-lg", h.amount > 0 ? "text-blue-600" : "text-slate-900")}>
                                            {h.amount > 0 ? '+' : ''}{h.amount.toLocaleString()}
                                        </span>
                                    </div>
                                )) : (
                                    <p className="text-center py-10 text-slate-400 font-bold">この日の取引はありません</p>
                                )}
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
function ReportTab({ historyData, onDeleteHistory, onEditTransaction }: { historyData: any[], onDeleteHistory: (id: string | number) => void, onEditTransaction: (t: any) => void }) {
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
                                        <div key={h.id} onClick={() => onEditTransaction(h)} className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex justify-between items-center group transition-all hover:bg-slate-100 cursor-pointer">
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
function HistoryTab({ historyData, onDeleteHistory, assetsData, onEditTransaction }: { historyData: any[], onDeleteHistory: (id: string | number) => void, assetsData: any, onEditTransaction: (t: any) => void }) {
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
                                    <div key={row.id} onClick={() => onEditTransaction(row)} className="flex justify-between items-center px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer">
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



function AccountDetailView({ account, onClose, historyData, onUpdateAccount, onDeleteAccount, onDeleteHistory }: { account: any, onClose: () => void, historyData: any[], onUpdateAccount: (id: string, updates: any) => void, onDeleteAccount: (id: string) => void, onDeleteHistory: (id: string) => void }) {
    const isCard = account.name.includes('カード') || account.category_id === 'cards';
    const [isEditing, setIsEditing] = useState(false);
    const [editBalance, setEditBalance] = useState(account.balance.toString());
    const [editClosingDay, setEditClosingDay] = useState(account.closing_day?.toString() || "");
    const [editPaymentDay, setEditPaymentDay] = useState(account.payment_day?.toString() || "");

    const handleSave = () => {
        onUpdateAccount(account.id, {
            balance: parseInt(editBalance, 10),
            closing_day: editClosingDay ? parseInt(editClosingDay, 10) : null,
            payment_day: editPaymentDay ? parseInt(editPaymentDay, 10) : null
        });
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
                {isEditing ? (
                    <div className="space-y-4 w-full mt-4">
                        <div>
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">現在の残高</p>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    autoFocus
                                    value={editBalance}
                                    onChange={(e) => setEditBalance(e.target.value)}
                                    className="bg-slate-100 border border-slate-300 rounded-lg p-2 text-slate-900 font-mono text-2xl w-full"
                                />
                            </div>
                        </div>
                        {isCard && (
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">締め日</p>
                                    <select value={editClosingDay} onChange={e => setEditClosingDay(e.target.value)} className="bg-slate-100 border border-slate-300 rounded-lg p-2 text-slate-900 text-sm w-full">
                                        <option value="">未設定</option>
                                        {Array.from({ length: 30 }).map((_, i) => <option key={i + 1} value={i + 1}>{i + 1}日</option>)}
                                        <option value="31">月末</option>
                                    </select>
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">支払日</p>
                                    <div className="flex flex-col gap-1">
                                        <input type="number" value={editPaymentDay} onChange={e => setEditPaymentDay(e.target.value)} placeholder="10" className="bg-slate-100 border border-slate-300 rounded-lg p-2 text-slate-900 font-mono w-full text-sm" />
                                        <label className="flex items-center gap-2 text-[8px] font-bold text-slate-400 mt-1">
                                            <input type="checkbox" checked={account.payment_adjustment === 'forward'} onChange={(e) => onUpdateAccount(account.id, { payment_adjustment: e.target.checked ? 'forward' : 'none' })} /> 土日なら後ろ倒し
                                        </label>
                                    </div>
                                </div>
                            </div>
                        )}
                        <button onClick={handleSave} className="w-full bg-slate-900 text-white px-4 py-3 rounded-lg font-bold text-sm shadow-lg shadow-slate-900/20">設定を保存する</button>
                    </div>
                ) : (
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-3">
                            <p className={cn("text-4xl font-black font-mono tabular-nums tracking-tighter", account.balance < 0 ? "text-rose-600" : "text-slate-900")}>
                                {account.balance < 0 ? ("-¥" + Math.abs(account.balance).toLocaleString()) : ("¥" + account.balance.toLocaleString())}
                            </p>
                            <button onClick={() => setIsEditing(true)} className="text-slate-500 hover:text-slate-900 transition-colors p-2 bg-white shadow-sm rounded-full"><Settings size={14} /></button>
                        </div>
                        {isCard && (account.closing_day || account.payment_day) && (
                            <div className="flex gap-4 mt-1">
                                {account.closing_day && <p className="text-[10px] font-bold text-slate-400">締め: {parseInt(String(account.closing_day), 10) === 31 ? '月末' : account.closing_day + '日'}</p>}
                                {account.payment_day && <p className="text-[10px] font-bold text-slate-400">支払: {account.payment_day}日</p>}
                            </div>
                        )}
                    </div>
                )}
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

    const handleUpdateAccount = async (accountId: string, updates: any) => {
        if (!user) return;
        const uid = user.id;
        let targetAccountName = "";
        const cloned = JSON.parse(JSON.stringify(assetsData));
        for (const cat of cloned.categories) {
            const item = cat.items.find((i: any) => i.id === accountId);
            if (item) {
                targetAccountName = item.name;
                if (updates.balance !== undefined) {
                    const diff = updates.balance - item.balance;
                    item.balance = updates.balance;
                    cat.total += diff;
                    cloned.totalAssets += diff;
                }
                if (updates.closing_day !== undefined) item.closing_day = updates.closing_day;
                if (updates.payment_day !== undefined) item.payment_day = updates.payment_day;
                break;
            }
        }
        setAssetsData(cloned);
        setSelectedAccount((prev: any) => ({ ...prev, ...updates }));

        if (targetAccountName) {
            try {
                await supabase.from('accounts').update(updates).eq('id', accountId).eq('user_id', uid);
            } catch (err) {
                console.error("Failed to update account on DB:", err);
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
        return <AccountDetailView account={selectedAccount} onClose={() => setSelectedAccount(null)} historyData={historyData} onUpdateAccount={handleUpdateAccount} onDeleteAccount={handleDeleteAccount} onDeleteHistory={onDeleteHistory} />;
    }

    const handleSaveNewAccount = async () => {
        if (!draftForm.name || !draftAccount || !user) return;
        const uid = user.id;
        const balanceNum = parseInt(draftForm.balance || "0", 10) || 0;

        try {
            const newDbAcct = { user_id: uid, category_id: draftAccount.catId, name: draftForm.name, balance: balanceNum };
            const { data, error } = await supabase.from('accounts').insert([newDbAcct]).select('*');

            if (error) throw error;

            if (data && data.length > 0) {
                const cloned = JSON.parse(JSON.stringify(assetsData));
                const cat = cloned.categories.find((c: any) => c.id === draftAccount.catId);
                if (cat) {
                    cat.items.push({ id: data[0].id, name: draftForm.name, balance: balanceNum });
                    cat.total += balanceNum;
                    cloned.totalAssets += balanceNum;
                    setAssetsData(cloned);
                }
            } else {
                alert("保存されましたがデータが取得できませんでした。再読み込みしてください。");
            }
        } catch (err) {
            console.error(err);
            alert("保存に失敗しました。SQLが正しく実行されているか確認してください。");
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
function SalaryTab({ shiftsData, setShiftsData, workplaces, setWorkplaces, user }: any) {
    const [isFreelancer, setIsFreelancer] = useState(false);
    const [targetAmount, setTargetAmount] = useState(70000);
    const [currentMonthOffset, setCurrentMonthOffset] = useState(0);
    const [closingDay, setClosingDay] = useState(25);

    const [viewMode, setViewMode] = useState<'month' | 'year'>('month');

    // Modals
    const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
    const [closingDayInput, setClosingDayInput] = useState(closingDay.toString());

    const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);
    const [targetInput, setTargetInput] = useState(targetAmount.toString());

    const [shiftModalDate, setShiftModalDate] = useState<string | null>(null);
    const [startTime, setStartTime] = useState("10:00");
    const [endTime, setEndTime] = useState("19:00");
    const [breakMinutes, setBreakMinutes] = useState("60");
    const [selectedWorkplaceId, setSelectedWorkplaceId] = useState<string>("");

    // Helper to calculate hours from times
    const calcHours = (s: string, e: string, b: string) => {
        if (!s || !e) return 0;
        const [sH, sM] = s.split(':').map(Number);
        const [eH, eM] = e.split(':').map(Number);
        let startMin = sH * 60 + sM;
        let endMin = eH * 60 + eM;
        if (endMin < startMin) endMin += 24 * 60; // Overnight
        const total = endMin - startMin - (parseInt(b, 10) || 0);
        return Math.max(0, total / 60);
    };

    const [isWorkplaceModalOpen, setIsWorkplaceModalOpen] = useState(false);
    const [newWorkplaceName, setNewWorkplaceName] = useState("");
    const [newWorkplaceWage, setNewWorkplaceWage] = useState("1100");
    const [newWorkplaceTransport, setNewWorkplaceTransport] = useState("0");

    const [isBulkMode, setIsBulkMode] = useState(false);
    const [selectedBulkDates, setSelectedBulkDates] = useState<string[]>([]);
    const [isBulkSaveModalOpen, setIsBulkSaveModalOpen] = useState(false);

    const baseDate = new Date();
    baseDate.setMonth(baseDate.getMonth() + currentMonthOffset);
    const m = baseDate.getMonth() + 1;
    const y = baseDate.getFullYear();

    // Default workplace selection
    useEffect(() => {
        if (workplaces.length > 0 && !selectedWorkplaceId) {
            setSelectedWorkplaceId(workplaces[0].id);
        }
    }, [workplaces, selectedWorkplaceId]);

    const handleSaveWorkplace = async () => {
        if (!newWorkplaceName || !user) return;
        const wage = parseInt(newWorkplaceWage, 10) || 0;
        const transport = parseInt(newWorkplaceTransport, 10) || 0;
        try {
            const { data, error } = await supabase.from('workplaces').insert([{ user_id: user.id, name: newWorkplaceName, hourly_wage: wage, transportation_fee: transport }]).select('*');
            if (error) throw error;
            if (data) setWorkplaces((prev: any) => [...prev, data[0]]);
            setIsWorkplaceModalOpen(false);
            setNewWorkplaceName("");
            setNewWorkplaceTransport("0");
        } catch (err) { console.error(err); }
    };

    const handleDeleteWorkplace = async (id: string) => {
        if (!confirm("この勤務地を削除しますか？関連するシフトも削除されます。")) return;
        try {
            await supabase.from('workplaces').delete().eq('id', id);
            setWorkplaces((prev: any) => prev.filter((w: any) => w.id !== id));
            // Also cleanup shifts locally if needed, or rely on next refresh
        } catch (err) { console.error(err); }
    };

    const submitShift = async () => {
        if (!shiftModalDate || !user || !selectedWorkplaceId) return;
        const h = calcHours(startTime, endTime, breakMinutes);

        try {
            if (h === 0) {
                await supabase.from('shifts').delete().eq('date', shiftModalDate).eq('workplace_id', selectedWorkplaceId).eq('user_id', user.id);
                const copy = { ...shiftsData };
                delete copy[shiftModalDate];
                setShiftsData(copy);
            } else {
                const dbShift = {
                    user_id: user.id,
                    workplace_id: selectedWorkplaceId,
                    date: shiftModalDate,
                    hours: h,
                    start_time: startTime,
                    end_time: endTime,
                    break_minutes: parseInt(breakMinutes, 10) || 0
                };
                const { data, error } = await supabase.from('shifts').upsert(dbShift, { onConflict: 'user_id,workplace_id,date' }).select('*');

                if (error) throw error;
                if (data) setShiftsData((prev: any) => ({ ...prev, [shiftModalDate]: { ...dbShift, id: data[0].id } }));
            }
        } catch (err) { console.error(err); }
        setShiftModalDate(null);
    };

    const handleBulkSave = async () => {
        if (selectedBulkDates.length === 0 || !user || !selectedWorkplaceId) return;
        const h = calcHours(startTime, endTime, breakMinutes);
        if (h <= 0) return;

        const bulkData = selectedBulkDates.map(date => ({
            user_id: user.id,
            workplace_id: selectedWorkplaceId,
            date,
            hours: h,
            start_time: startTime,
            end_time: endTime,
            break_minutes: parseInt(breakMinutes, 10) || 0
        }));

        try {
            const { data, error } = await supabase.from('shifts').upsert(bulkData, { onConflict: 'user_id,workplace_id,date' }).select('*');
            if (error) throw error;
            if (data) {
                const updatedShifts = { ...shiftsData };
                data.forEach((s: any) => {
                    updatedShifts[s.date] = { ...s };
                });
                setShiftsData(updatedShifts);
            }
        } catch (err) { console.error(err); }

        setIsBulkSaveModalOpen(false);
        setIsBulkMode(false);
        setSelectedBulkDates([]);
    };

    const toggleBulkDate = (date: string) => {
        setSelectedBulkDates(prev => prev.includes(date) ? prev.filter(d => d !== date) : [...prev, date]);
    };

    const monthlyShifts = useMemo(() => {
        return Object.keys(shiftsData).filter(dateStr => {
            const date = new Date(dateStr);
            const checkYear = date.getFullYear();
            const checkMonth = date.getMonth() + 1;
            const checkDay = date.getDate();

            let effectiveYear = checkYear;
            let effectiveMonth = checkDay > closingDay ? checkMonth + 1 : checkMonth;
            if (effectiveMonth > 12) { effectiveMonth = 1; effectiveYear += 1; }
            return effectiveYear === y && effectiveMonth === m;
        }).map(k => ({ ...shiftsData[k], date: k }));
    }, [shiftsData, y, m, closingDay]);

    // Grouping shifts by workplace for summary
    const workplaceSummaries = useMemo(() => {
        const summaries: Record<string, { hours: number, gross: number }> = {};
        monthlyShifts.forEach(s => {
            if (!summaries[s.workplace_id]) summaries[s.workplace_id] = { hours: 0, gross: 0 };
            const wp = workplaces.find((w: any) => w.id === s.workplace_id);
            const wage = wp ? wp.hourly_wage : 1100;
            const trans = wp ? (wp.transportation_fee || 0) : 0;
            summaries[s.workplace_id].hours += s.hours;
            summaries[s.workplace_id].gross += (s.hours * wage) + trans;
        });
        return summaries;
    }, [monthlyShifts, workplaces]);

    const totalHours = monthlyShifts.reduce((acc, s) => acc + s.hours, 0);
    const currentGross = Object.values(workplaceSummaries).reduce((acc, curr) => acc + curr.gross, 0);
    const annualizedGross = currentGross * 12;

    const standardDeduction = 480000;
    let projectedIncomeTax = 0, projectedResidentTax = 0, currentMonthSocialInsurance = 0, currentMonthPension = 0, currentMonthNHI = 0, currentNet = 0;

    if (isFreelancer) {
        const taxable = Math.max(0, annualizedGross - standardDeduction - 650000);
        projectedIncomeTax = taxable <= 1950000 ? taxable * 0.05 : (1950000 * 0.05) + ((taxable - 1950000) * 0.10);
        projectedResidentTax = taxable > 0 ? taxable * 0.10 : 0;
        currentMonthPension = 16980;
        currentMonthNHI = Math.floor((annualizedGross * 0.09) / 12);
        currentNet = currentGross - (projectedIncomeTax / 12) - (projectedResidentTax / 12) - currentMonthPension - currentMonthNHI;
    } else {
        const ded = Math.min(Math.max(annualizedGross * 0.4, 550000), 1950000);
        const taxable = Math.max(0, annualizedGross - standardDeduction - ded);
        projectedIncomeTax = taxable <= 1950000 ? taxable * 0.05 : (1950000 * 0.05) + ((taxable - 1950000) * 0.10);
        projectedResidentTax = taxable > 0 ? taxable * 0.10 : 0;
        currentMonthSocialInsurance = Math.floor((annualizedGross >= 1060000 ? annualizedGross * 0.15 : 0) / 12);
        currentNet = currentGross - (projectedIncomeTax / 12) - (projectedResidentTax / 12) - currentMonthSocialInsurance;
    }

    return (
        <div className="pb-16 bg-white min-h-screen -m-3 md:-m-6 text-slate-800 relative">
            <header className="bg-white flex justify-between items-center py-3 px-4 shadow-sm border-b border-slate-200 sticky top-0 z-20">
                <div className="text-lg font-bold tracking-tighter text-slate-900">{y}年 {m}月</div>
                <div className="flex gap-2">
                    <button onClick={() => { setIsBulkMode(!isBulkMode); setSelectedBulkDates([]); }} className={cn("text-[10px] font-bold px-3 py-1 rounded-full border transition-all", isBulkMode ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-emerald-600 border-emerald-200")}>一括登録</button>
                    <button onClick={() => setIsConfigModalOpen(true)} className="text-emerald-700 p-2"><Settings size={20} /></button>
                </div>
            </header>

            <div className="flex border-b border-slate-100 bg-white">
                <button onClick={() => setViewMode('month')} className={cn("flex-1 py-3 font-bold transition-all border-b-2", viewMode === 'month' ? "border-emerald-600 text-emerald-600" : "border-transparent text-slate-300")}>月</button>
                <button onClick={() => setViewMode('year')} className={cn("flex-1 py-3 font-bold transition-all border-b-2", viewMode === 'year' ? "border-emerald-600 text-emerald-600" : "border-transparent text-slate-300")}>年</button>
            </div>

            {viewMode === 'year' ? (
                <div className="p-4 space-y-4 bg-slate-50 min-h-screen">
                    <div className="bg-white border rounded-2xl p-6 shadow-sm text-center">
                        <h3 className="text-xs font-bold text-slate-400 uppercase mb-2">年間予測合計</h3>
                        <div className="text-3xl font-black text-slate-900">¥{(currentGross * 12).toLocaleString()}</div>
                    </div>
                </div>
            ) : (
                <div className="p-4 pt-6 text-center space-y-8">
                    <div className="relative mx-auto w-56 h-56 flex items-center justify-center">
                        <ChevronLeft onClick={() => setCurrentMonthOffset(p => p - 1)} className="absolute -left-10 text-slate-300 cursor-pointer" size={28} />
                        <svg className="w-full h-full transform -rotate-90 absolute">
                            <circle cx="112" cy="112" r="100" className="stroke-slate-100" strokeWidth="15" fill="none" />
                            <circle cx="112" cy="112" r="100" className="stroke-emerald-500" strokeWidth="15" strokeDasharray="628" strokeDashoffset={628 - (Math.min(currentGross / targetAmount, 1) * 628)} strokeLinecap="round" fill="none" style={{ transition: 'all 1s ease' }} />
                        </svg>
                        <div className="z-10 flex flex-col">
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Target Hit</span>
                            <span className="text-3xl font-black text-slate-900">¥{currentGross.toLocaleString()}</span>
                            <span className="text-[10px] text-slate-500 mt-1">/ ¥{targetAmount.toLocaleString()}</span>
                        </div>
                        <ChevronRight onClick={() => setCurrentMonthOffset(p => p + 1)} className="absolute -right-10 text-slate-300 cursor-pointer" size={28} />
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm text-left">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-sm text-slate-800">勤務地別サマリー</h3>
                            <button onClick={() => setIsWorkplaceModalOpen(true)} className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">+ 追加</button>
                        </div>
                        <div className="space-y-4">
                            {workplaces.map((wp: any) => {
                                const stats = workplaceSummaries[wp.id] || { hours: 0, gross: 0 };
                                return (
                                    <div key={wp.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl group relative">
                                        <div>
                                            <div className="font-bold text-sm text-slate-800">{wp.name}</div>
                                            <div className="text-[10px] text-slate-400">時給 ¥{wp.hourly_wage.toLocaleString()} / 交通費 ¥{(wp.transportation_fee || 0).toLocaleString()}</div>
                                        </div>
                                        <div className="text-right flex items-center gap-4">
                                            <div>
                                                <div className="font-bold text-sm text-emerald-600">¥{stats.gross.toLocaleString()}</div>
                                                <div className="text-[10px] text-slate-500">{stats.hours}h</div>
                                            </div>
                                            <button onClick={() => handleDeleteWorkplace(wp.id)} className="text-slate-300 hover:text-rose-500 transition-colors"><Trash2 size={14} /></button>
                                        </div>
                                    </div>
                                );
                            })}
                            {workplaces.length === 0 && <div className="text-center py-4 text-[10px] text-slate-400 italic">勤務地が登録されていません</div>}
                        </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                        <div className="flex justify-between items-center mb-4 px-1">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{isBulkMode ? "日付を複数選択してください" : "シフトカレンダー"}</h3>
                            {isBulkMode && <span className="text-[10px] font-bold text-emerald-600">{selectedBulkDates.length}件選択中</span>}
                        </div>
                        <div className="grid grid-cols-7 gap-1">
                            {['日', '月', '火', '水', '木', '金', '土'].map(d => <div key={d} className="text-[10px] font-bold text-slate-400 mb-2">{d}</div>)}
                            {Array.from({ length: new Date(y, m - 1, 1).getDay() }).map((_, i) => <div key={'empty-' + i} className="h-10" />)}
                            {Array.from({ length: new Date(y, m, 0).getDate() }).map((_, i) => {
                                const d = i + 1;
                                const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                                const shift = shiftsData[dateStr];
                                const isSelected = selectedBulkDates.includes(dateStr);

                                return (
                                    <div key={d} onClick={() => {
                                        if (isBulkMode) {
                                            toggleBulkDate(dateStr);
                                        } else {
                                            setShiftModalDate(dateStr);
                                            if (shift) {
                                                setStartTime(shift.start_time || "10:00");
                                                setEndTime(shift.end_time || "19:00");
                                                setBreakMinutes(String(shift.break_minutes || 60));
                                                setSelectedWorkplaceId(shift.workplace_id);
                                            } else {
                                                setStartTime("10:00");
                                                setEndTime("19:00");
                                                setBreakMinutes("60");
                                            }
                                        }
                                    }} className={cn("h-10 flex flex-col items-center justify-center rounded-lg border text-[10px] font-bold cursor-pointer transition-all",
                                        isSelected ? "bg-emerald-600 border-emerald-600 text-white scale-95" :
                                            shift ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "border-slate-50 bg-slate-50/30 hover:bg-slate-100")}>
                                        {d}
                                        {!isSelected && shift && <span>{shift.hours}h</span>}
                                        {isSelected && <CheckCircle2 size={12} className="mt-0.5" />}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Bulk Mode Action Bar */}
            <AnimatePresence>
                {isBulkMode && selectedBulkDates.length > 0 && (
                    <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 200 }} className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[80] w-[90%] max-w-sm">
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-2xl flex items-center justify-between">
                            <div className="text-white">
                                <div className="text-[10px] font-bold opacity-50 uppercase">Selected</div>
                                <div className="text-sm font-black">{selectedBulkDates.length} days</div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => setSelectedBulkDates([])} className="px-4 py-2 text-xs font-bold text-slate-400">クリア</button>
                                <button onClick={() => setIsBulkSaveModalOpen(true)} className="px-6 py-2 bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-500/20">次へ進む</button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Modals */}
            <AnimatePresence>
                {shiftModalDate && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-end justify-center">
                        <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="bg-white rounded-t-3xl w-full max-w-sm p-6 pb-12 shadow-2xl">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-bold text-slate-800">{shiftModalDate} の勤務</h3>
                                <button onClick={() => setShiftModalDate(null)}><X size={20} /></button>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 mb-2 block">勤務地を選択</label>
                                    <select value={selectedWorkplaceId} onChange={e => setSelectedWorkplaceId(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-emerald-500">
                                        {workplaces.map((wp: any) => <option key={wp.id} value={wp.id}>{wp.name} (¥{wp.hourly_wage})</option>)}
                                        {workplaces.length === 0 && <option disabled>先に勤務地を追加してください</option>}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 mb-2 block">開始時間</label>
                                        <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-emerald-500" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 mb-2 block">終了時間</label>
                                        <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-emerald-500" />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 mb-2 block">休憩 (分)</label>
                                    <input type="number" value={breakMinutes} onChange={e => setBreakMinutes(e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-emerald-500" />
                                </div>

                                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex justify-between items-center">
                                    <span className="text-sm font-bold text-emerald-700">合計勤務時間</span>
                                    <span className="text-xl font-black text-emerald-800 tabular-nums">{calcHours(startTime, endTime, breakMinutes).toFixed(2)}h</span>
                                </div>

                                <button onClick={submitShift} disabled={workplaces.length === 0} className="w-full bg-emerald-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-emerald-600/20 active:scale-[0.98] transition-all disabled:opacity-50">保存する</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}

                {isBulkSaveModalOpen && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-end justify-center">
                        <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="bg-white rounded-t-3xl w-full max-w-sm p-6 pb-12 shadow-2xl">
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="font-bold text-slate-800">一括登録 ({selectedBulkDates.length}日間)</h3>
                                <button onClick={() => setIsBulkSaveModalOpen(false)}><X size={20} /></button>
                            </div>
                            <p className="text-[10px] text-slate-400 mb-6">選択した全日程に同じシフト時間を適用します</p>

                            <div className="space-y-6">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 mb-2 block">共通の勤務地</label>
                                    <select value={selectedWorkplaceId} onChange={e => setSelectedWorkplaceId(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-emerald-500">
                                        {workplaces.map((wp: any) => <option key={wp.id} value={wp.id}>{wp.name} (¥{wp.hourly_wage})</option>)}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 mb-2 block">開始時間</label>
                                        <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-emerald-500" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 mb-2 block">終了時間</label>
                                        <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-emerald-500" />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 mb-2 block">休憩 (分)</label>
                                    <input type="number" value={breakMinutes} onChange={e => setBreakMinutes(e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-emerald-500" />
                                </div>

                                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex justify-between items-center">
                                    <span className="text-sm font-bold text-emerald-700">合計勤務時間</span>
                                    <span className="text-xl font-black text-emerald-800 tabular-nums">{calcHours(startTime, endTime, breakMinutes).toFixed(2)}h</span>
                                </div>

                                <button onClick={handleBulkSave} className="w-full bg-emerald-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-emerald-600/20 active:scale-[0.98] transition-all">一括保存する</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}

                {isWorkplaceModalOpen && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-white rounded-2xl w-full max-w-xs p-6 shadow-2xl">
                            <h3 className="font-bold text-slate-800 mb-4">新規勤務地の追加</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 mb-1 block">名前</label>
                                    <input type="text" value={newWorkplaceName} onChange={e => setNewWorkplaceName(e.target.value)} placeholder="例: カフェmozu" className="w-full p-3 bg-slate-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-emerald-500 text-sm" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 mb-1 block">時給 (円)</label>
                                    <input type="number" value={newWorkplaceWage} onChange={e => setNewWorkplaceWage(e.target.value)} className="w-full p-3 bg-slate-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-mono" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 mb-1 block">交通費 (往復)</label>
                                    <input type="number" value={newWorkplaceTransport} onChange={e => setNewWorkplaceTransport(e.target.value)} className="w-full p-3 bg-slate-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-mono" />
                                </div>
                                <div className="flex gap-2 pt-2">
                                    <button onClick={() => setIsWorkplaceModalOpen(false)} className="flex-1 py-3 text-sm font-bold text-slate-400">閉じる</button>
                                    <button onClick={handleSaveWorkplace} className="flex-1 py-3 text-sm font-bold bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-600/20">追加する</button>
                                </div>
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
function AITab({ historyData, assetsData, user }: { historyData: any[], assetsData: any, user: User | null }) {
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
        if (!file || !user) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const csvText = event.target?.result as string;
            setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', text: "📎 " + file.name + " をアップロードしました" }]);
            setIsTyping(true);

            try {
                // 1. Send CSV text to AI for analysis
                const res = await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        messages: [{ role: 'user', content: `以下のCSVデータを解析して取引履歴JSON配列に変換してください:\n\n${csvText}` }],
                        contextData: { totalAssets: assetsData?.totalAssets || 0, categorizedSpending: [], recentHistory: [], currentMonthNet: 0 }
                    })
                });

                const data = await res.json();

                // AI route should return JSON string in its response
                let transactions: any[] = [];
                try {
                    // Extract JSON from response (handling potential markdown code blocks)
                    const jsonMatch = data.response.match(/\[[\s\S]*\]/);
                    if (jsonMatch) {
                        transactions = JSON.parse(jsonMatch[0]);
                    }
                } catch (parseErr) {
                    console.error("Failed to parse AI response as JSON:", parseErr);
                }

                if (transactions.length > 0) {
                    // 2. Insert into Supabase
                    const insertData = transactions.map(t => ({
                        user_id: user.id,
                        date: t.date,
                        item: t.item,
                        amount: t.amount,
                        type: t.type,
                        account: t.account || 'CSV Import'
                    }));

                    const { error: insertError } = await supabase.from('histories').insert(insertData);
                    if (insertError) throw insertError;

                    setMessages(prev => [...prev, {
                        id: Date.now().toString() + 'ai',
                        role: 'ai',
                        text: `ファイルの解析が完了しました。${transactions.length}件の取引履歴を抽出し、データベースへの登録を成功裏に終えました。`
                    }]);

                    // Trigger refresh if needed (this component works on props, ideally we'd refresh parent)
                    window.location.reload(); // Quickest way to sync state for now
                } else {
                    setMessages(prev => [...prev, { id: Date.now().toString() + 'ai', role: 'ai', text: "ファイルの解析に失敗しました。対応しているCSV形式か確認してください。" }]);
                }
            } catch (err: any) {
                console.error("CSV Upload Error:", err);
                setMessages(prev => [...prev, { id: Date.now().toString() + 'ai', role: 'ai', text: "エラーが発生しました: " + err.message }]);
            } finally {
                setIsTyping(false);
            }
        };
        reader.readAsText(file);
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
