export type TabType = 'home' | 'assets' | 'salary' | 'history' | 'ai' | 'report' | 'accounts';

export const COLORS = {
    primary: '#22d3ee', // Cyan
    secondary: '#a855f7', // Purple
    success: '#10b981', // Green
    background: '#0a0a0f', // Pitch black
    paypayBrand: '#22d3ee', // Cyan for PayPay balance
    paypayPoints: '#10b981', // Green for PayPay points
    debt: '#e11d48', // Red
};

export const MOCK_ASSETS = {
    totalAssets: 4250000,
    liability: 150000,
    netWorth: 4100000,
    categories: [
        {
            id: 'cash',
            name: '預金・現金',
            total: 2800000,
            color: COLORS.primary,
            items: [
                { id: 'acc1', name: '三菱UFJ銀行', balance: 2500000 },
                { id: 'acc2', name: '三井住友銀行', balance: 280000 },
                { id: 'acc3', name: '現金', balance: 20000 },
            ]
        },
        {
            id: 'paypay',
            name: 'PayPay (残高/Point)',
            total: 180000,
            color: COLORS.paypayBrand,
            items: [
                { id: 'acc4', name: 'PayPay マネー/ライト', balance: 150000, brandColor: COLORS.paypayBrand },
                { id: 'acc5', name: 'PayPay ポイント', balance: 30000, brandColor: COLORS.paypayPoints },
            ]
        },
        {
            id: 'cards',
            name: 'カード・負債',
            total: -150000,
            color: COLORS.debt,
            items: [
                { id: 'acc6', name: '三井住友カード (NL)', balance: -80000 },
                { id: 'acc7', name: '楽天カード', balance: -70000 },
            ]
        }
    ]
};

export const MOCK_HISTORY = [
    { id: 'f2', date: '2026-06-26', item: 'クレカ引落 (予定)', account: 'olive', amount: -65400, balance: -45262, type: 'future' }, // Future simulation
    { id: 'f1', date: '2026-06-25', item: '給与振込 (予定)', account: 'olive', amount: 35000, balance: 20138, type: 'future' }, // Future simulation
    { id: '1', date: '2026-05-26', item: 'クレカ引き落とし', account: 'olive', amount: -100806, balance: 20138, type: 'expense' },
    { id: '2', date: '2026-05-25', item: '給与振込 (MOZU)', account: 'olive', amount: 28241, balance: 120944, type: 'income' },
    { id: '3', date: '2026-04-27', item: '家賃支払', account: 'olive', amount: -23811, balance: 92703, type: 'expense' },
    { id: '4', date: '2026-04-20', item: 'スタバ', account: 'olive', amount: -650, balance: 116514, type: 'expense' },
    { id: '5', date: '2026-04-18', item: '生活費入金', account: 'olive', amount: 50000, balance: 117164, type: 'income' }
];

export const MOCK_SHIFTS: Record<string, { start: string, end: string, hours: number }> = {
    '2026-04-05': { start: '10:00', end: '18:00', hours: 7 }, // 1h break
    '2026-04-12': { start: '12:00', end: '20:00', hours: 7 },
    '2026-04-18': { start: '22:00', end: '05:00', hours: 6 }, // Night shift
};

export const MOCK_SALARY = {
    hourlyWage: 1500,
    transportation: 500, // per day
    ytdIncome: 850000,
    limit106: { total: 1060000 },
    limit130: { total: 1300000 }
};
