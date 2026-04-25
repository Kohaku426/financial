-- 1. historiesテーブルをユーザーごとに分離するための変更
-- user_idカラムを追加（auth.usersテーブルと紐付け）
ALTER TABLE public.histories ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) DEFAULT auth.uid();

-- 2. accountsテーブルをユーザーごとに分離するための変更
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) DEFAULT auth.uid();

-- 3. Row Level Security (RLS) を有効化
ALTER TABLE public.histories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

-- 4. histories用のポリシー（自分のデータのみ操作可能）
CREATE POLICY "Users can manage their own histories"
ON public.histories
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 5. accounts用のポリシー
CREATE POLICY "Users can manage their own accounts"
ON public.accounts
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ※ すでにデータがある場合、既存データに現在のユーザーIDを割り当てる必要がありますが、
-- 新規ユーザーを想定している場合はこれで問題ありません。
