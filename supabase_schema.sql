-- Supabase SQL Editorにて実行するスキーマ(データベース構造)作成用SQLスクリプト

-- 1. Histories テーブル (履歴 / トランザクション記録)
CREATE TABLE public.histories (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  date date NOT NULL,
  item text NOT NULL,
  account text NOT NULL,
  amount numeric NOT NULL,
  balance numeric NOT NULL,
  type text NOT NULL, -- 'income' or 'expense'
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Accounts テーブル (現在の口座・残高管理)
CREATE TABLE public.accounts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id text NOT NULL, -- 'cash', 'banks', 'cards' etc.
  name text NOT NULL,
  balance numeric NOT NULL,
  brand_color text,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ※ この後、APIのRow Level Security (RLS) を無効化するか、適切に設定する必要があります。
--    とりあえずパブリックに動作させる場合は、Dashboardの「Authentication」>「Policies」からRLSを無効（Disable）にしてください。
