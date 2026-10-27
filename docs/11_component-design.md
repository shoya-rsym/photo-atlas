# コンポーネント設計

---

# 設計方針

Photoを中心とした設計とする。

Location中心設計にしない。

将来的な

- タグ別閲覧
- キャラクター別閲覧
- 季節別閲覧

への拡張を考慮する。

---

# Layout

## Header

責務

- タイトル表示
- ナビゲーション表示

---

## Footer

責務

- コピーライト表示
- SNSリンク表示

---

# Navigation

## Breadcrumb

責務

パンくず表示

例

```text
TOP > 関東 > 神奈川県 > 横浜駅 > 横浜駅AR
```

---

# Japan Map

## JapanMap

責務

TOPページの日本地図表示

利用データ

```text
japan-map-regions.json
```

利用SVG

```text
public/maps/japan-regions.svg
```

---

### 設計ルール

SVGは都道府県単位で管理する。

地域表示は複数都道府県をグループ化して表現する。

将来用途

- 地域選択
- 達成率表示
- 訪問済み表示
- ヒートマップ

---

## PrefecturePolygon

責務

都道府県単位SVG描画

機能

- Hover
- Highlight
- Select

---

## AreaTooltip

責務

地域情報表示

表示内容

- 地域名
- 都道府県一覧

---

## AreaOverlay

責務

地域ハイライト

---

# Statistics

## StatisticsPanel

責務

統計表示

内容

- 写真数
- 撮影地点数
- 都道府県数

---

# Cards

## PrefectureCard

責務

都道府県表示

---

## LocationCard

責務

撮影地点表示

内容

- 地点名
- 写真枚数
- 最新撮影日

---

## PhotoCard

責務

写真表示

内容

- サムネイル
- タイトル

---

# Photo Components

## PhotoGrid

責務

写真一覧表示

---

## PhotoDetail

責務

写真詳細表示

---

## PhotoTags

責務

タグ表示

Tag.idからTag.nameへ変換する

---

## CharacterInfo

責務

キャラクター情報表示

Character.idからCharacter.nameへ変換する

---

# Search

## SearchBox

責務

キーワード検索

---

## TagFilter

責務

タグ絞り込み

---

## YearFilter

責務

撮影年絞り込み

---

## PrefectureFilter

責務

都道府県絞り込み

---

# Map

## MapView

責務

Leaflet地図表示

利用画面

- 都道府県ページ

---

## MapMarker

責務

撮影地点表示

---

# Modal

## PhotoModal

責務

写真拡大表示

機能

- 前へ
- 次へ
- 閉じる
- ESC対応

---

# Error

## NotFoundPage

責務

404表示

---

# Design Rules

## 1責務1コンポーネント

必須

---

## Props駆動

ハードコード禁止

---

## 分割基準

300行超で分割検討

---

## 再利用性

同じUIは共通化する