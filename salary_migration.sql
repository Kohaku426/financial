-- 1. 勤務地テーブルの作成
CREATE TABLE IF NOT EXISTS public.workplaces (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) DEFAULT auth.uid(),
  name text NOT NULL,
  hourly_wage numeric DEFAULT 1100 NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. シフトテーブルの作成
CREATE TABLE IF NOT EXISTS public.shifts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) DEFAULT auth.uid(),
  workplace_id uuid REFERENCES public.workplaces(id) ON DELETE CASCADE,
  date date NOT NULL,
  hours numeric DEFAULT 0 NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. RLSを有効化
ALTER TABLE public.workplaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;

-- 4. ポリシーの設定 (既存のものを削除してから再作成)
DROP POLICY IF EXISTS "Users can manage their own workplaces" ON public.workplaces;
CREATE POLICY "Users can manage their own workplaces" ON public.workplaces
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own shifts" ON public.shifts;
CREATE POLICY "Users can manage their own shifts" ON public.shifts
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
