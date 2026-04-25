# Deployment Guide (Vercel)

このアプリケーションをVercelにデプロイして、友達と共有する方法を説明します。

## 1. 準備
1. GitHubアカウントを持っていない場合は作成します。
2. このプロジェクトをGitHubのリポジトリにプッシュします。

## 2. Vercelへのデプロイ
1. [Vercel Dashboard](https://vercel.com/dashboard) にアクセスし、「Add New」 > 「Project」を選択します。
2. GitHubリポジトリを選択して「Import」をクリックします。
3. **重要: 環境変数の設定**
   「Environment Variables」セクションで、以下の変数を設定してください（`.env.local` からコピーします）。
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `GEMINI_API_KEY`
4. 「Deploy」をクリックします。

## 3. PWAとしてインストール
デプロイ後、発行されたURLにスマートフォン（SafariやChrome）でアクセスします。
- **iOS**: 「共有」アイコン ➔ 「ホーム画面に追加」
- **Android**: 「︙」メニュー ➔ 「ホーム画面に追加」 または 「アプリをインストール」

これで、オフラインに近い感覚でどこでもアクセスできるようになります！

## 4. Supabaseのマイグレーション
`migration.sql` の内容を Supabase Dashboard の SQL Editor で実行するのを忘れないでください。
これにより、ユーザーごとのデータ分離が有効になります。
