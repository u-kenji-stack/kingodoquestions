# 金吾堂まるわかり検定（Next.js版）

株式会社金吾堂製菓のビジョン・社名由来・製品特徴を学べる、選択式クイズアプリです。
Next.js 14（App Router / TypeScript）で構成しており、Vercelへそのままデプロイできます。

## 構成

```
app/
  layout.tsx      # フォント読み込み・メタデータ
  globals.css     # デザイントークン・スタイル一式
  page.tsx        # トップページ（QuizAppを描画）
components/
  QuizApp.tsx     # クイズ本体（画面遷移・採点ロジック）
lib/
  questions.ts    # カテゴリ・設問データ（ここを編集すれば内容を更新できます）
```

## ローカルで動かす

```bash
npm install
npm run dev
```

http://localhost:3000 で確認できます。

## Vercelへのデプロイ

### 方法A：Vercel CLIを使う（最速）

```bash
npm install -g vercel
vercel login
vercel        # プレビューデプロイ
vercel --prod # 本番デプロイ
```

### 方法B：GitHub経由（チーム運用ならこちら推奨）

1. このフォルダの中身をGitHubリポジトリにpush
2. https://vercel.com/new でそのリポジトリをImport
3. フレームワークは自動的に「Next.js」と検出されます（追加設定は不要）
4. 「Deploy」をクリック

以降はmainブランチにpushするたびに自動で再デプロイされます。

## 独自ドメインを使う場合

Vercelのプロジェクト設定 → Domains から `kingodo.co.jp` のサブドメイン（例：`quiz.kingodo.co.jp`）を追加し、
表示されるDNSレコード（CNAMEなど）を御社のDNS管理画面に追加してください。

## 内容を編集する

- 設問・カテゴリの追加や修正は `lib/questions.ts` を編集するだけで反映されます。
- 配色やフォントなどのデザインは `app/globals.css` の `:root` 内の変数（`--accent` など）で調整できます。

## ロゴを追加する

現在はエンブレム部分に「金」の文字を表示しています。正式ロゴ画像（SVGまたは透過PNG）が用意でき次第、
以下の対応で差し替え可能です。

1. ロゴ画像を `public/logo.svg`（または `.png`）として配置
2. `components/QuizApp.tsx` の以下の箇所を書き換え

```tsx
// 変更前
<div className="emblem" aria-hidden="true">金</div>

// 変更後（例）
import Image from "next/image";
...
<div className="emblem" aria-hidden="true">
  <Image src="/logo.svg" alt="" width={76} height={76} />
</div>
```

対応が必要であれば、ロゴファイルをお送りいただければこちらで反映します。

## 自己ベストの保存について

各カテゴリの自己ベストスコアは、閲覧者のブラウザのlocalStorageに保存されます（サーバーには送信されません）。
ブラウザやデバイスが変わるとリセットされます。
