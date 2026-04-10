# AI秘書 導入マニュアル

このマニュアルに沿って進めると、LINEで話しかけるだけでGoogle Calendar・Gmail・TODOを操作できるAI秘書を自分専用に構築できます。

**所要時間の目安**: 約60〜90分（初めての方）

---

## 必要なアカウント（すべて無料）

| サービス | 用途 | 登録URL |
|---|---|---|
| Google | Calendar・Gmail API | 既存アカウントでOK |
| Google Cloud Console | API有効化・OAuth設定 | https://console.cloud.google.com |
| LINE Developers | LINEボット作成 | https://developers.line.biz |
| Anthropic | Claude API（AI本体） | https://console.anthropic.com |
| GitHub | コード管理・自動通知 | https://github.com |
| Render.com | サーバーホスティング | https://render.com |
| UptimeRobot | スリープ防止 | https://uptimerobot.com |

---

## Step 1: リポジトリの準備

### 1-1. GitHubでFork

1. https://github.com/kabanmochi-tech/ai-secretary を開く
2. 右上の「**Fork**」ボタンをクリック
3. 自分のGitHubアカウントにコピーされる

### 1-2. ローカルにClone

```bash
git clone https://github.com/あなたのユーザー名/ai-secretary.git
cd ai-secretary
npm install
cp .env.example .env
```

---

## Step 2: Google Cloud 設定

> ⚠️ このステップが最も重要です。設定を誤ると認証エラーが繰り返し発生します。

### 2-1. プロジェクト作成

1. https://console.cloud.google.com にアクセス
2. 上部の「プロジェクトを選択」→「**新しいプロジェクト**」
3. プロジェクト名（例: `ai-secretary`）を入力して作成

### 2-2. APIの有効化

1. 左メニュー「**APIとサービス**」→「**ライブラリ**」
2. 検索して以下の2つを有効化：
   - `Google Calendar API`
   - `Gmail API`

### 2-3. OAuthクライアントID作成

1. 「**APIとサービス**」→「**認証情報**」
2. 「**認証情報を作成**」→「**OAuthクライアントID**」
3. アプリケーションの種類: **ウェブアプリケーション**
4. 名前: `ai-secretary`（任意）
5. 「承認済みのリダイレクトURI」に追加:
   ```
   http://localhost:3000/oauth/callback
   ```
6. 「作成」→ **クライアントID** と **クライアントシークレット** をメモ

### 2-4. ⚠️ 公開ステータスを「本番環境」に変更（必須）

1. 「**APIとサービス**」→「**OAuth同意画面**」
2. 公開ステータスが「**テスト**」になっている場合は「**本番環境に公開**」をクリック

> **なぜ重要か**: テストモードのままだとrefresh_tokenが**7日で自動失効**します。本番環境にすれば無期限になります。

---

## Step 3: LINE設定

### 3-1. チャネル作成

1. https://developers.line.biz にアクセス
2. 「**コンソール**」→「プロバイダー作成」（初回のみ）
3. 「**チャネル作成**」→「**Messaging API**」を選択
4. 必要事項を入力して作成

### 3-2. 必要な情報を取得

「チャネル設定」画面から以下をメモ：

| 項目 | 場所 |
|---|---|
| チャネルシークレット | 「基本設定」タブ |
| チャネルアクセストークン（長期） | 「Messaging API設定」タブ → 一番下 |
| あなたのUser ID | 「Messaging API設定」タブ → 「Your user ID」 |

### 3-3. Webhookの準備（後で設定）

Webhook URLはRenderデプロイ後に設定します（Step 7で案内）。

---

## Step 4: Anthropic APIキー取得

1. https://console.anthropic.com にアクセス
2. 「**API Keys**」→「**Create Key**」
3. 生成されたキーをメモ（一度しか表示されません）

---

## Step 5: .envファイルの記入

```bash
# プロジェクトフォルダの .env を開いて編集
```

```env
# LINE
LINE_CHANNEL_ACCESS_TOKEN=（Step 3でメモしたトークン）
LINE_CHANNEL_SECRET=（Step 3でメモしたシークレット）
LINE_USER_ID=（Step 3でメモしたUser ID）

# Claude API
ANTHROPIC_API_KEY=（Step 4でメモしたキー）

# Google OAuth
GOOGLE_CLIENT_ID=（Step 2-3でメモしたクライアントID）
GOOGLE_CLIENT_SECRET=（Step 2-3でメモしたシークレット）
GOOGLE_REDIRECT_URI=http://localhost:3000/oauth/callback

# Render用（Step 6完了後に追加）
RENDER_GOOGLE_TOKEN_JSON=
```

---

## Step 6: Google OAuth認証（ローカルで1回だけ実行）

```bash
node tools/setup.js
```

1. ブラウザが自動で開く
2. Googleアカウントでログイン
3. カレンダーとGmailへのアクセスを許可
4. 「認証完了」と表示されたら成功

成功すると `tokens/google_token.json` が生成されます。

```bash
# 確認コマンド
cat tokens/google_token.json
```

> このファイルの中身は次のステップで使います。コピーしておいてください。

---

## Step 7: Render.com デプロイ

### 7-1. GitHubにpush

```bash
git add .
git commit -m "initial setup"
git push origin main
```

### 7-2. Renderでサービス作成

1. https://render.com でアカウント作成・ログイン
2. 「**New +**」→「**Web Service**」
3. 「Connect a repository」でForkしたリポジトリを選択
4. 設定：
   - **Name**: `ai-secretary`（任意）
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free

### 7-3. 環境変数を登録

「**Environment**」タブで以下を1つずつ追加：

| キー | 値 |
|---|---|
| `LINE_CHANNEL_ACCESS_TOKEN` | Step 3の値 |
| `LINE_CHANNEL_SECRET` | Step 3の値 |
| `LINE_USER_ID` | Step 3の値 |
| `ANTHROPIC_API_KEY` | Step 4の値 |
| `GOOGLE_CLIENT_ID` | Step 2の値 |
| `GOOGLE_CLIENT_SECRET` | Step 2の値 |
| `RENDER_GOOGLE_TOKEN_JSON` | `tokens/google_token.json` の中身をそのまま貼り付け |

### 7-4. デプロイ完了を確認

デプロイが完了すると `https://ai-secretary-xxxx.onrender.com` のようなURLが発行されます。

### 7-5. LINE WebhookURLを設定

1. LINE Developers → チャネル → 「Messaging API設定」
2. Webhook URL: `https://ai-secretary-xxxx.onrender.com/webhook`
3. 「Webhookの利用」をONにする
4. 「検証」ボタンで成功を確認

---

## Step 8: UptimeRobot でスリープ防止

Render無料プランは15分間アクセスがないとスリープします。これを防ぎます。

1. https://uptimerobot.com でアカウント作成（無料）
2. 「**Add New Monitor**」
3. 設定：
   - **Monitor Type**: HTTP(s)
   - **Friendly Name**: AI秘書
   - **URL**: `https://ai-secretary-xxxx.onrender.com/health`
   - **Monitoring Interval**: 5 minutes
4. 「Create Monitor」で保存

---

## Step 9: GitHub Actions 設定（朝夜の自動通知）

リポジトリの「**Settings**」→「**Secrets and variables**」→「**Actions**」で以下を登録：

| Secret名 | 値 |
|---|---|
| `LINE_CHANNEL_ACCESS_TOKEN` | Step 3の値 |
| `LINE_CHANNEL_SECRET` | Step 3の値 |
| `LINE_USER_ID` | Step 3の値 |
| `ANTHROPIC_API_KEY` | Step 4の値 |
| `GOOGLE_CLIENT_ID` | Step 2の値 |
| `GOOGLE_CLIENT_SECRET` | Step 2の値 |
| `RENDER_GOOGLE_TOKEN_JSON` | `tokens/google_token.json` の中身 |
| `GH_PAT` | ※下記参照 |

#### GH_PAT の作成方法
1. GitHub右上アイコン → 「Settings」
2. 左メニュー最下部「**Developer settings**」→「**Personal access tokens**」→「**Fine-grained tokens**」
3. 「Generate new token」
4. Repository access: このリポジトリのみ選択
5. Permissions: 「Secrets」→ **Read and write**
6. 生成されたトークンをコピーして `GH_PAT` に登録

---

## Step 10: 動作確認

### ブリーフィング手動テスト
```bash
node src/briefing.js morning
```
LINEに朝のブリーフィングが届けば成功です。

### LINEから話しかけてみる

AI秘書をLINEの友達追加して、以下を送ってみてください：

```
明日の予定教えて
```

```
未読メール見せて
```

```
TODOに〇〇を追加して
```

---

## トラブルシューティング

### ❌ INVALID_GRANT エラーが発生する

**原因**: Google OAuthがテストモードのままでトークンが失効  
**解決**:
1. Google Cloud Console → OAuth同意画面 → 「本番環境に公開」
2. ローカルで再実行: `node tools/setup.js`
3. 新しく生成された `tokens/google_token.json` の中身を Render と GitHub Secrets の `RENDER_GOOGLE_TOKEN_JSON` に上書き

### ❌ LINEから返信が来ない

1. RenderのLogsタブでエラー確認
2. LINE DevelopersでWebhook URLが正しいか確認
3. `https://ai-secretary-xxxx.onrender.com/health` をブラウザで開いてOKが返るか確認

### ❌ 朝の通知が来ない

1. GitHubリポジトリの「Actions」タブで実行ログを確認
2. `RENDER_GOOGLE_TOKEN_JSON` が最新のトークンになっているか確認
3. 手動でテスト: Actionsタブ → 「ブリーフィング」→「Run workflow」

### ❌ Renderのデプロイが失敗する

Renderの「Logs」タブでエラーメッセージを確認してください。多くの場合は環境変数の設定漏れです。

---

## Claude Code を使っている場合

このリポジトリをクローンしてClaude Codeで開いている場合、セットアップアシスタントを呼び出せます：

```
/balance-ai-secretary-setup
```

対話形式で現在の状態を確認しながらセットアップをガイドします。

---

## 自動通知のスケジュール

| 時刻 | 内容 |
|---|---|
| 毎朝 8:00（JST） | 今日の予定・未読メール・TODO一覧 |
| 毎夜 20:00（JST） | 明日の予定・未読メール・TODO一覧 |

---

## ライセンス

MIT License — 自由に改変・再配布できます。
