# Photo Import Tool

管理者専用のローカル写真登録ツール。静的サイト（GitHub Pages）には含まれない。

```bash
npm run import      # http://127.0.0.1:4321 （PORT で変更可）
```

## 使い方（撮影セッション単位）

1. 撮影場所を入力（Enter で先頭候補。未登録なら「新しい撮影地点」を開いて入力）
2. 撮影日を入力（`202604` / `20260415` / `2026-04-15`、空欄=撮影日不明）
3. タグ・キャラクターを選択（絞り込み欄で Enter、なければ新規追加）
4. 画像 or フォルダをドラッグ＆ドロップ
5. 「登録前確認へ」→「登録実行」

前回と同じ設定は「最近使った設定」から1クリックで復元できる。
登録後も設定は保持されるので、次の画像を続けてドロップできる。

## 登録時の処理

- `src/data/photos.json` に追記（ID は `photoNNNN`）、必要に応じ `tags.json` / `characters.json` / `locations.json` も追記
- `public/photos/`（原寸。PNG・4K超は JPEG へ変換）、`public/thumbnails/`（長辺512px webp）へ配置
- 完了後に `scripts/validate-data.mjs` を実行。失敗時はファイル・JSON をロールバック
- EXIF / GPS は使用しない

## 重複チェック

画像の SHA-256 を `tools/photo-import/data/hashes.json` で管理（コミット対象）。
登録済み・選択内重複は初期状態で除外され、チェックを入れれば承知の上で登録できる。

## 代表写真

星アイコンで1枚指定すると `isCover: true` を photos.json に書き込む。
`Photo` 型・docs は未変更（設計変更提案待ち）。

## フォルダ名解析（設計のみ）

`lib/folder-name.mjs` の `parseFolderName()` が現在 `null` を返すスタブ。
`202604_横浜駅_初音ミク` → `{ date, locationQuery, characterQuery }` を返す実装に差し替えれば、
`app.js` の `applyFolderHint()` が入力欄へ自動反映する。

## セキュリティ

127.0.0.1 のみ待ち受け、Host ヘッダ検証と POST のカスタムヘッダ必須で CSRF/DNS rebinding を防止。
