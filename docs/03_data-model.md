# データモデル

本システムはJSONファイルをデータソースとして利用する。

MVPではデータベースを利用しない。

---

# 設計方針

本システムの中心エンティティは Photo とする。

地域、都道府県、撮影地点は写真を分類するための情報として扱う。

将来的に以下の閲覧方法へ対応できる構造とする。

- 地域別
- 都道府県別
- 撮影地点別
- タグ別
- キャラクター別
- 季節別

---

# ID命名規則

全データ共通。

以下のみ利用可能。

```text
英小文字
数字
アンダースコア(_)
```

例

```text
kanto

kanagawa

yokohama_station

photo001

hatsune_miku
```

禁止例

```text
横浜駅

YokohamaStation

yokohama-station
```

---

# Area

地域を表す。

```typescript
type Area = {
  id: string;
  name: string;
  description?: string;
};
```

例

```json
{
  "id": "kanto",
  "name": "関東",
  "description": "首都圏を中心とした地域"
}
```

---

# Prefecture

都道府県を表す。

```typescript
type Prefecture = {
  id: string;
  name: string;
  areaId: string;
};
```

---

# Location

撮影地点を表す。

```typescript
type Location = {
  id: string;

  name: string;

  prefectureId: string;

  /** 都道府県内の細分地域（例: 北海道の道央）。任意 */
  subregionId?: string;

  address?: string;

  lat?: number;

  lng?: number;
};
```

例

```json
{
  "id": "yokohama_station",
  "name": "横浜駅",
  "prefectureId": "kanagawa",
  "address": "神奈川県横浜市西区高島2丁目16",
  "lat": 35.465,
  "lng": 139.622
}
```

---

# Subregion

都道府県内の細分地域を表す（任意データ）。

現在は北海道（道央・道南・道北・道東）のみ。
他の都道府県も subregions.json へ追記するだけで分割できる。

```typescript
type Subregion = {
  id: string;

  name: string;

  prefectureId: string;

  /** 都道府県の外接矩形を 0〜1 に正規化した地図上の描画範囲（多角形の頂点列） */
  mapClip?: [number, number][];
};
```

例

```json
{
  "id": "hokkaido_doo",
  "name": "道央",
  "prefectureId": "hokkaido",
  "mapClip": [[0, 0.45], [0.45, 0.45], [0.5, 0.6], [0.5, 1], [0.28, 1], [0.28, 0.6], [0, 0.6]]
}
```

注意

- Photo中心設計は変更しない。Subregion は Location の任意の分類である。
- mapClip は既存の都道府県SVGを切り抜く近似であり、実際の行政境界ではない。

---

# Tag

タグ情報。

```typescript
type Tag = {
  id: string;

  name: string;

  category?: string;

  color?: string;
};
```

例

```json
{
  "id": "night_view",
  "name": "夜景",
  "category": "scene",
  "color": "#1D4ED8"
}
```

---

# Character

キャラクター情報。

```typescript
type Character = {
  id: string;

  name: string;

  series?: string;
};
```

例

```json
{
  "id": "hatsune_miku",
  "name": "初音ミク",
  "series": "VOCALOID"
}
```

---

# Photo

写真データ。

```typescript
type Photo = {
  id: string;

  title: string;

  image: string;

  thumbnail: string;

  date?: string;

  createdAt: string;

  locationId: string;

  tags: string[];

  characterIds?: string[];

  comment?: string;

  isCover?: boolean;
};
```

`characterIds` は設定された Character.id の配列。1枚の写真に複数のキャラクターを設定でき、未設定の場合は省略する。

---

## isCover

撮影地点の代表写真。

任意。

trueの場合のみ設定する（falseは設定しない）。

同一locationIdで true は最大1枚とする。

Photo Import Toolが書き込む。MVPのUIでは未使用。

---

## date

撮影日。

```text
YYYY-MM-DD
```

形式。

古い写真など撮影日不明の場合は未設定を許可する。

---

## createdAt

登録日時。

必須。

```text
ISO8601
```

形式。

---

# Photo.tags

Tag.idを保持する。

例

```json
{
  "tags": [
    "ar_photo",
    "night_view"
  ]
}
```

表示時

```text
ARフォト

夜景
```

へ変換する。

---

# JapanMapRegion

日本地図表示用データ。

```typescript
type JapanMapRegion = {
  id: string;

  name: string;

  prefectureIds: string[];
};
```

---

# JapanMapRegion設計

日本地図SVGは都道府県単位で保持する。

地域表示は

```text
北海道
東北
関東
中部
近畿
中国
四国
九州
```

を都道府県グループとして表現する。

---

# AreaTooltipData

地図ホバー時の表示情報。

```typescript
type AreaTooltipData = {
  areaId: string;
  prefectures: string[];
};
```

---

# Statistics

TOPページ表示用。

実行時に算出する。

```typescript
type Statistics = {
  photoCount: number;
  locationCount: number;
  prefectureCount: number;
};
```

---

# 集計定義

photoCount

```text
登録写真総数
```

---

locationCount

```text
写真が1枚以上存在する撮影地点数
```

---

prefectureCount

```text
写真が1枚以上存在する都道府県数
```

---

# 撮影地点統計

```typescript
type LocationStatistics = {
  photoCount: number;

  firstPhotoDate?: string;

  latestPhotoDate?: string;
};
```

---

# 写真並び順

全画面共通。

```text
撮影日降順
```

撮影日不明の写真は最後尾。

---

# データ関連図

```text
Photo
 ├ Location
 │   ├ Subregion（任意）
 │   └ Prefecture
 │       └ Area
 │
 ├ Tag
 │
 └ Character

Area
 └ JapanMapRegion
```

---

# JSON構成

```text
src/data/

areas.json
prefectures.json
locations.json
photos.json
tags.json
characters.json
japan-map-regions.json
subregions.json
```

---

# MVP対象

- Area
- Prefecture
- Location
- Photo
- Tag
- Character
- JapanMapRegion