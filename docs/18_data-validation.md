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

characterIds

設定時のみ。配列内でIDが重複しないこと。

各IDが characters.json に存在すること。

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

photoMemory

任意。設定する場合は文字列で120文字以内。

---

# SessionMemory

session-memories.json

---

- id は必須・一意
- locationId は locations.json に存在すること
- sessionDate は YYYY-MM-DD 形式
- 同じ locationId + sessionDate は最大1件
- text は必須、120文字以内
- generatedBy は template / ai / manual のいずれか
- createdAt と updatedAt は ISO8601 形式

---

# MemoryReview

memory-library.json

---

- id は必須・一意
- sessionMemoryId は英小文字・数字・アンダースコアで構成すること
- locationName は必須
- rating は A / B / C / NG のいずれか
- text は必須、120文字以内
- memo は任意、500文字以内
- reviewedAt は ISO8601 形式

---

# MemoryCandidate

memory-candidates.json

---

- 1〜120文字の文字列配列
- 完全一致する候補の重複は禁止

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