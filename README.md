# ARフォト図鑑

地図から辿る写真図鑑

---

# コンセプト

利用者は日本地図から写真へ辿り着く。

```text
TOP
 ↓
日本地図
 ↓
地域
 ↓
都道府県
 ↓
撮影地点
 ↓
写真
```

---

# システム思想

Photoを中心エンティティとして設計する。

Location中心設計ではない。

将来的に以下へ拡張可能。

- タグ別閲覧
- キャラクター別閲覧
- 季節別閲覧

---

# MVP機能

- SVG日本地図
- 地域ページ
- 都道府県ページ
- Leaflet地図
- 撮影地点ページ
- 写真詳細
- 検索
- フィルター
- 1枚の写真への複数キャラクター設定
- セッション単位のSession Memoryと写真単位のPhoto Memory

---

# 技術スタック

```text
Next.js
TypeScript
Tailwind CSS
Leaflet
React Leaflet
GitHub Pages
```

---

# データ

```text
areas.json
prefectures.json
locations.json
photos.json
tags.json
characters.json
japan-map-regions.json
session-memories.json
```

Memoryは写真の説明ではなく、閲覧者が想像を広げるための短い余白です。Session Memoryは撮影場所・撮影日・タグ・写真枚数などからテンプレート候補を作り、画像や外部AIサービスは利用しません。Photo Memoryは管理ツールから手動設定します。

---

# SVG地図

配置

```text
public/maps/japan-regions.svg
```

---

重要

```text
都道府県単位SVG
```

で構築する。

---

# 画像

原寸

```text
public/photos
```

---

サムネイル

```text
public/thumbnails
```

---

# MVP対象外

- AI
- 認証
- DB
- 管理画面
- ランキング
- 達成率

---

# ドキュメント

詳細は docs/ 配下を参照。

特に以下を優先。

```text
03_data-model.md
04_routing.md
05_ui-spec.md
06_feature-spec.md
13_acceptance-criteria.md
19_mvp-scope.md
20_copilot-task-list.md
```

# 地図素材

日本地図SVGは以下を利用しています。

geolonia/japanese-prefectures

https://github.com/geolonia/japanese-prefectures

License:
GFDL