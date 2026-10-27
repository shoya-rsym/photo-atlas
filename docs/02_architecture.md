# アーキテクチャ

---

# システム構成

```text
Next.js

│

├─ UI
│
├─ JSON Data
│
├─ SVG Japan Map
│
└─ Leaflet
```

---

# 技術スタック

## Frontend

```text
Next.js

React

TypeScript

Tailwind CSS
```

---

## Map

```text
SVG

Leaflet

React Leaflet
```

---

## Hosting

```text
GitHub Pages
```

---

# データ構成

```text
areas.json

prefectures.json

locations.json

photos.json

tags.json

characters.json

japan-map-regions.json
```

---

# データ設計思想

中心エンティティ

```text
Photo
```

---

関連図

```text
Photo
 ├ Location
 │   └ Prefecture
 │       └ Area
 │
 ├ Tag
 │
 └ Character
```

---

# 日本地図

SVG方式。

---

配置

```text
public/maps/japan-regions.svg
```

---

仕様

```text
都道府県単位SVG
```

---

表示時

```text
都道府県
 ↓
地域グループ化
```

を行う。

---

# 状態管理

MVPではローカル状態のみ利用する。

利用候補

```text
useState

useMemo
```

---

グローバル状態管理ライブラリは使用しない。

---

# データ取得

MVPではJSON直接読込。

```text
src/data/
```

利用。

---

# 将来移行可能な構造

```text
JSON

↓

API

↓

DB
```

変更可能とする。

---

# 品質方針

- TypeScript Error 0
- ESLint Error 0
- Build Success