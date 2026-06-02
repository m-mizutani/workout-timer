# workout-timer

ブラウザで動くワークアウト・インターバルタイマーです。メニュー（スロースクワット → ヒップヒンジ → その場足踏み／ニーアップ → 休憩 を3周＋整理運動、計10分）を、音と画面表示でガイドします。メニューは構造化データ（`src/timeline/`）として定義しています。

## 特徴

- **常時 60 BPM の tick 音**（1秒ごと）。セグメントの拍頭はアクセントを付けて区別。
- **動作の系統ごとに音色が変わる**合成音（Web Audio API 生成。音源ファイル不要）。スロースクワットは「下ろす／止める／上げる」でも音程が変化します。
- **移行時に音声案内**（事前生成した WAV を同梱）。
- **開始 / 中断（一時停止・再開）/ リセット**と、周回・レップ・残り時間・全体進捗の表示。
- **タイムラインは構造化データ**（`src/timeline/`）。メニューを追加して選択実行できます。

## 開発

Node.js 22 以上（ピン留めした pnpm 11 の要件）と [Corepack](https://nodejs.org/api/corepack.html) を使ってください（pnpm のグローバルインストールは不要）。

```sh
corepack enable
pnpm install          # 依存をインストール（ロックファイル更新はこのときだけ）
pnpm dev              # 開発サーバ
pnpm test             # Vitest（ユニットテスト）
pnpm lint             # ESLint
pnpm typecheck        # tsc --noEmit
pnpm build            # 本番ビルド（dist/）
```

CI など非対話の入口では必ず `pnpm install --frozen-lockfile` を使います。

## 音声案内の生成

移行時の音声は macOS の `say` コマンドで生成し、`afconvert` で 16bit/22.05kHz モノラル WAV に変換して `public/voices/` に同梱しています。再生成は次の通り（macOS 必須）:

```sh
pnpm gen:voices          # 既定の音声（Kyoko）で生成
pnpm gen:voices Otoya    # 音声名を指定する場合
```

読み上げテキストとキュー ID は `scripts/gen-voices.mjs` の `CUES` に定義しています（タイムラインの `voiceIn` と対応）。TTS エンジンはこのスクリプトに隔離してあるため、将来オープンソースの音声合成へ差し替えられます。

> 音は「再配布可能なもの」を使う方針です。tick・動作音は実行時に合成するためファイル配布の懸念はありません。音声案内は生成物を同梱しています。

## タイムラインの追加

1. `src/timeline/schema.ts` の型に沿って新しい `Timeline` を作成（例: `src/timeline/timelines/your-menu.ts`）。
2. `src/timeline/index.ts` の `timelines` 配列に追加。
3. UI のメニュー選択に自動で表示されます。

ブロック種別は `squat`（フェーズ付き）/ `reps`（単純反復）/ `timed`（単一の時間ブロック）/ `group`（周回ラップ）。`expandTimeline` が絶対時刻付きのセグメント列に展開します。

## 公開（GitHub Pages）

`main` への push で `.github/workflows/deploy.yml` がビルドして GitHub Pages にデプロイします。リポジトリの Settings → Pages で Source を「GitHub Actions」に設定してください。プロジェクトページ（`/workout-timer/`）配信を前提に Vite の `base` を設定済みです。別パスで配信する場合は環境変数 `BASE_PATH` で上書きできます。

## 設計

```
src/
  timeline/   構造化タイムライン（schema / expand / 各メニュー / レジストリ）
  engine/     スケジューラ（時間→イベント導出は純関数でテスト）
  audio/      Web Audio エンジン・tick・系統別動作音・音声WAV再生
  ui/         表示モデル（純関数）
  main.ts     DOM 配線
```
