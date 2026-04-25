-- 1. accountsテーブルの作成 (存在しない場合)
CREATE TABLE IF NOT EXISTS public.accounts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) DEFAULT auth.uid(),
  category_id text NOT NULL,
  name text NOT NULL,
  balance numeric DEFAULT 0 NOT NULL,
  closing_day integer,
  payment_day integer,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. historiesテーブルの作成 (存在しない場合)
CREATE TABLE IF NOT EXISTS public.histories (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) DEFAULT auth.uid(),
  date date NOT NULL,
  item text NOT NULL,
  account text NOT NULL,
  amount numeric NOT NULL,
  balance numeric DEFAULT 0 NOT NULL,
  type text NOT NULL, -- 'income' or 'expense'
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. RLSを有効化
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.histories ENABLE ROW LEVEL SECURITY;

-- 4. ポリシーの設定 (既存のものを削除してから再作成)
DROP POLICY IF EXISTS "Users can manage their own accounts" ON public.accounts;
CREATE POLICY "Users can manage their own accounts" ON public.accounts
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own histories" ON public.histories;
CREATE POLICY "Users can manage their own histories" ON public.histories
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 5. シフトテーブルの拡張 (時間形式の入力をサポート)
ALTER TABLE public.shifts ADD COLUMN IF NOT EXISTS start_time text;
ALTER TABLE public.shifts ADD COLUMN IF NOT EXISTS end_time text;
ALTER TABLE public.shifts ADD COLUMN IF NOT EXISTS break_minutes numeric DEFAULT 0;

COMMENT ON COLUMN public.shifts.start_time IS '勤務開始時間 (HH:mm)';
COMMENT ON COLUMN public.shifts.end_time IS '勤務終了時間 (HH:mm)';
COMMENT ON COLUMN public.shifts.break_minutes IS '休憩時間 (分)';
