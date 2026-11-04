# 受入基準

本ドキュメントはMVP完了条件を定義する。

---

# Build

成功すること。

```bash
npm run build
```

---

# Lint

成功すること。

```bash
npm run lint
```

---

# TypeScript

条件

```text
型エラー 0件
```

---

# TOPページ

URL

```text
/
```

確認項目

- 表示成功
- 統計表示
- SVG地図表示
- 最近追加した写真表示

---

# SVG地図

確認項目

- Hover成功
- Highlight成功
- 地域情報表示
- 地域クリック遷移

---

# 地域ページ

URL

```text
/area/kanto
```

確認項目

- 地域名表示
- 地域説明表示
- 都道府県一覧表示

---

# 都道府県ページ

URL

```text
/prefecture/kanagawa
```

確認項目

- 都道府県名表示
- Leaflet表示
- 撮影地点一覧表示

---

# 撮影地点ページ

URL

```text
/location/yokohama_station
```

確認項目

- 地点名表示
- 住所表示
- 写真枚数表示
- 初回撮影日表示
- 最新撮影日表示
- 写真一覧表示

---

# 写真ページ

URL

```text
/photo/photo001
```

確認項目

- 写真表示
- タイトル表示
- タグ表示
- キャラクター表示
- コメント表示

---

# タグ表示

Tag.nameが表示されること。

例

```text
ARフォト
夜景
```

Tag.idを直接表示しないこと。

---

# キャラクター表示

Character.nameが表示されること。

例

```text
初音ミク
```

Character.idを直接表示しないこと。

---

# 撮影日未設定

Photo.date が存在しない場合

```text
撮影日不明
```

を表示すること。

---

# パンくず

全ページ表示。

例

```text
TOP
>
関東
>
神奈川県
>
横浜駅
>
横浜駅AR
```

---

# 写真0件地点

表示

```text
写真が登録されていません
```

---

# 404

以下へアクセス。

```text
/area/test
/prefecture/test
/location/test
/photo/test
```

結果

```text
404 Not Found
```

表示。

---

# レスポンシブ

対象

```text
320px
768px
1024px
1440px
```

レイアウト崩れがないこと。

---

# ダークモード

正常表示すること。

---

# SEO

全ページで設定済み。

```text
title
description
OpenGraph
```

---

# GitHub Pages

公開環境で正常表示すること。

---

# MVP完了条件

以下をすべて満たすこと。

- Build成功
- Lint成功
- 型エラー0件
- 日本地図表示
- 地域遷移
- 都道府県遷移
- 撮影地点遷移
- 写真表示
- パンくず表示
- ダークモード対応
- レスポンシブ対応
- GitHub Pages公開成功

---

# Memory System

- Session Memoryは `locationId + sessionDate` ごとに最大1件である
- 撮影日が既知で写真が1枚以上の全セッションを管理画面で生成・再生成対象にできる
- Session Memory v3はセッションの全画像を視覚確認し、他セッションと区別できる特徴をSession Summaryに含める
- Session Summaryは `dominantPatterns`、`uniqueFeatures`、`visualRhythm`、`colorCharacter`、`spaceCharacter`、`memorySeeds` を含む
- Session MemoryはSession Summaryの分析結果を直接書かず、特徴から得た印象を見終わったあとに残る短い断片として出力する
- 色・光・距離感・視線の流れ・反復要素から生じる印象は利用できるが、構図などの説明や分析用語、特徴の列挙を避ける
- 時間表現は補助要素とし、時間や感情だけで成立する文、画像に根拠のない抽象概念だけで成立する文を避ける
- Memoryの根拠は `memorySeeds`、`uniqueFeatures`、`dominantPatterns` の優先順とし、`uniqueFeatures`だけに依存しない
- Session Summary内では、可能な限り同一特徴を繰り返し参照しない。`memorySeeds`には重複しない要素を2つ以上含める
- 各候補は異なる `memorySeeds` を最低2項目使い、単一特徴だけを膨らませない
- 3候補で同じ `memorySeed` を中心として繰り返さず、それぞれ別の種または組み合わせを軸にする
- 候補を、単一特徴への依存、時間・記憶だけの成立、他セッションへの流用可能性、複数 `memorySeeds` の反映について自己確認し、該当する場合は作り直す
- Summaryと異なる視点の候補3件を表示し、人が1件を選択して明示的に保存できる
- 既存Memoryも生成対象とし、再生成結果で置き換えられる
- 画像や情報をCopilot Chatへ自動送信せず、場所・タグから写真内容を推測しない
- 完全一致や高い表現類似度のSession Memoryは保存を拒否する
- 生成元、解析画像数、代表画像、Session Summaryを管理画面で確認でき、解析情報は一般公開しない
- Session Memoryは地点ページの該当日付の写真一覧より前に、控えめに表示する
- Photo MemoryはPhoto-Manageで編集・削除でき、120文字を超える内容は保存できない
- Photo Memoryは写真右上のアイコンを押した場合だけ表示される
- Memory表示設定は初期値ONで、選択をブラウザーに保持する
- Memory表示をOFFにするとSession MemoryとPhoto Memoryの両方が閲覧ページで非表示になる
- Photo-ManageでSession MemoryをA / B / C / NG評価し、任意コメントを保存できる
- 評価済みMemoryを検索でき、Memory Candidate Poolへ候補文を重複なく追加・削除できる
- Analyticsに総Memory数、評価分布、平均文字数、よく使われる単語、重複Memory、偏り警告を表示する
- 重複Memoryの使用回数、ベストMemory TOP10、NG Memory、未評価Memoryを管理画面で確認できる
- `npm run export-memory` が評価区分別の `memory-review.md` を出力する
- `npm run memory-report` が指定月または当月の `memory-report.md` を出力する