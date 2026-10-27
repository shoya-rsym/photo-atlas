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