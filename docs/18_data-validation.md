# データ検証ルール

本ドキュメントはJSON整合性を定義する。

---

# 基本方針

全参照データは存在すること。

孤立データは禁止。

---

# Area

areas.json

---

id

- 必須
- 一意

---

name

- 必須

---

# Prefecture

prefectures.json

---

areaId

areas.json に存在すること。

---

# Location

locations.json

---

id

- 必須
- 一意

---

name

- 必須

---

prefectureId

prefectures.json に存在すること。

---

subregionId

任意

指定する場合

- subregions.json に存在すること
- そのSubregionの prefectureId が Location.prefectureId と一致すること

---

address

任意

---

lat

任意

---

lng

任意

---

# Subregion

subregions.json

---

id

- 必須
- 一意
- 英小文字・数字・アンダースコア

---

name

- 必須

---

prefectureId

prefectures.json に存在すること。

---

mapClip

任意

指定する場合

- 3点以上の [x, y] 座標であること
- 各値が 0 以上 1 以下であること

---

# Tag

tags.json

---

id

- 必須
- 一意

---

name

- 必須

---

category

任意

---

color

任意

---

# Character

characters.json

---

id

- 必須
- 一意

---

name

- 必須

---

series

任意

---

# Photo

photos.json

---

id

- 必須
- 一意

---

title

- 必須

---

image

- 必須

---

thumbnail

- 必須

---

locationId

locations.json に存在すること。

---

tags

tags.json に存在すること。

---

characterId

設定時のみ。

characters.json に存在すること。

---

isCover

任意

- 設定する場合は true のみ
- 同一locationIdで true は最大1枚

---

date

任意

形式

```text
YYYY-MM-DD
```

---

createdAt

必須

形式

```text
ISO8601
```

---

# JapanMapRegion

japan-map-regions.json

---

id

areas.json に存在すること。

---

prefectureIds

prefectures.json に存在すること。

---

# SVG

全都道府県パスは一意であること。

例

```text
pref-tokyo
pref-kanagawa
pref-saitama
```

---

# 禁止事項

- 重複ID
- 孤立Photo
- 孤立Location

---

# MVP検証対象

- Area
- Prefecture
- Location
- Tag
- Character
- Photo
- JapanMapRegion

整合性エラー0件であること。