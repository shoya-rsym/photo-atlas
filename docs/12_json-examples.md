# JSONサンプル

本ドキュメントは実際のJSON構造サンプルを定義する。

---

# データ配置

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

# areas.json

```json
[
  {
    "id": "kanto",
    "name": "関東",
    "description": "首都圏を中心とした地域"
  },
  {
    "id": "kinki",
    "name": "近畿",
    "description": "関西地方を中心とした地域"
  }
]
```

---

# prefectures.json

```json
[
  {
    "id": "kanagawa",
    "name": "神奈川県",
    "areaId": "kanto"
  },
  {
    "id": "tokyo",
    "name": "東京都",
    "areaId": "kanto"
  }
]
```

---

# locations.json

```json
[
  {
    "id": "yokohama_station",
    "name": "横浜駅",
    "prefectureId": "kanagawa",
    "address": "神奈川県横浜市西区高島2丁目16",
    "lat": 35.465,
    "lng": 139.622
  },
  {
    "id": "yamashita_park",
    "name": "山下公園",
    "prefectureId": "kanagawa",
    "address": "神奈川県横浜市中区山下町279",
    "lat": 35.443,
    "lng": 139.649
  },
  {
    "id": "sapporo_station",
    "name": "札幌駅",
    "prefectureId": "hokkaido",
    "subregionId": "hokkaido_doo",
    "address": "北海道札幌市北区北6条西4丁目",
    "lat": 43.0687,
    "lng": 141.3508
  }
]
```

subregionId は任意。

---

# subregions.json

```json
[
  {
    "id": "hokkaido_doo",
    "name": "道央",
    "prefectureId": "hokkaido",
    "mapClip": [[0, 0.45], [0.45, 0.45], [0.5, 0.6], [0.5, 1], [0.28, 1], [0.28, 0.6], [0, 0.6]]
  },
  {
    "id": "hokkaido_donan",
    "name": "道南",
    "prefectureId": "hokkaido",
    "mapClip": [[0, 0.6], [0.28, 0.6], [0.28, 1], [0, 1]]
  },
  {
    "id": "hokkaido_dohoku",
    "name": "道北",
    "prefectureId": "hokkaido",
    "mapClip": [[0, 0], [0.62, 0], [0.62, 0.3], [0.45, 0.45], [0, 0.45]]
  },
  {
    "id": "hokkaido_doto",
    "name": "道東",
    "prefectureId": "hokkaido",
    "mapClip": [[0.62, 0], [1, 0], [1, 1], [0.5, 1], [0.5, 0.6], [0.45, 0.45], [0.62, 0.3]]
  }
]
```

---

# tags.json

```json
[
  {
    "id": "ar_photo",
    "name": "ARフォト",
    "category": "photo_type",
    "color": "#9333EA"
  },
  {
    "id": "night_view",
    "name": "夜景",
    "category": "scene",
    "color": "#1D4ED8"
  },
  {
    "id": "event",
    "name": "イベント",
    "category": "event",
    "color": "#EA580C"
  }
]
```

---

# characters.json

```json
[
  {
    "id": "hatsune_miku",
    "name": "初音ミク",
    "series": "VOCALOID"
  },
  {
    "id": "kagamine_rin",
    "name": "鏡音リン",
    "series": "VOCALOID"
  }
]
```

---

# photos.json

```json
[
  {
    "id": "photo001",
    "title": "横浜駅AR",
    "image": "/photos/photo001.jpg",
    "thumbnail": "/thumbnails/photo001.webp",
    "date": "2026-05-20",
    "createdAt": "2026-10-27T12:00:00+09:00",
    "locationId": "yokohama_station",
    "tags": [
      "ar_photo",
      "night_view"
    ],
    "characterIds": ["hatsune_miku", "kagamine_rin"],
    "comment": "横浜駅で撮影",
    "photoMemory": "帰るにはまだ少し早かった。",
    "isFavorite": true,
    "photoMemoryGeneratedAt": "2026-10-28T12:00:00+09:00",
    "photoMemorySource": "copilot",
    "isCover": true
  },
  {
    "id": "photo002",
    "title": "撮影日不明サンプル",
    "createdAt": "2026-10-27T13:00:00+09:00",
    "image": "/photos/photo002.jpg",
    "thumbnail": "/thumbnails/photo002.webp",
    "locationId": "yamashita_park",
    "tags": [
      "event"
    ]
  }
]
```

---

# session-memories.json

撮影場所と撮影日で一意に決まるセッションのMemory。生成元はテンプレート、将来のAI、または手動編集を区別する。

```json
[
  {
    "id": "session_memory_001",
    "locationId": "yokohama_station",
    "sessionDate": "2026-10-27",
    "text": "人の流れが落ち着き、周囲に静かな間が生まれていた。",
    "generatedBy": "template",
    "createdAt": "2026-10-27T12:00:00+09:00",
    "updatedAt": "2026-10-27T12:00:00+09:00"
  }
]
```

`Photo.photoMemory` は任意の120文字以内。テンプレート生成時も画像は読み込まず、閲覧時に生成しない。

---

# memory-library.json

Session Memoryの評価スナップショットとレビュー履歴。本文が変更された場合は新しい本文を別のレビュー対象として保存する。

```json
[
  {
    "id": "memory_review_001",
    "sessionMemoryId": "session_memory_001",
    "locationId": "yokohama_station",
    "locationName": "横浜駅",
    "sessionDate": "2026-10-27",
    "text": "人の流れが落ち着き、周囲に静かな間が生まれていた。",
    "rating": "A",
    "memo": "余白が強い",
    "reviewedAt": "2026-10-30T12:00:00.000Z"
  }
]
```

評価は `A` / `B` / `C` / `NG`。同一本文の再評価履歴を残し、最新の評価を現在の評価として扱う。

---

# memory-candidates.json

将来の生成支援へ活用する候補文の配列。候補は管理画面から追加・削除し、重複登録しない。

```json
[
  "海風だけが残っていた。",
  "少しだけ立ち止まる理由があった。",
  "灯りだけが残っていた。"
]
```

---

# japan-map-regions.json

地域と都道府県の関連を管理する。

```json
[
  {
    "id": "hokkaido",
    "name": "北海道",
    "prefectureIds": [
      "hokkaido"
    ]
  },
  {
    "id": "tohoku",
    "name": "東北",
    "prefectureIds": [
      "aomori",
      "iwate",
      "miyagi",
      "akita",
      "yamagata",
      "fukushima"
    ]
  },
  {
    "id": "kanto",
    "name": "関東",
    "prefectureIds": [
      "tokyo",
      "kanagawa",
      "saitama",
      "chiba",
      "ibaraki",
      "tochigi",
      "gunma"
    ]
  }
]
```

---

# SVG地図

配置先

```text
public/maps/japan-regions.svg
```

---

# SVG仕様

SVGは都道府県単位で保持する。

例

```text
pref-tokyo
pref-kanagawa
pref-saitama
pref-chiba
```

---

# 地域表示

地域単位の表示は

```text
複数都道府県をグルーピング
```

して実現する。

例

```text
関東

= 東京都
+ 神奈川県
+ 埼玉県
+ 千葉県
+ 茨城県
+ 栃木県
+ 群馬県
```

---

# Hover情報サンプル

```json
{
  "id": "kanto",
  "name": "関東",
  "prefectures": [
    "東京都",
    "神奈川県",
    "埼玉県",
    "千葉県",
    "茨城県",
    "栃木県",
    "群馬県"
  ]
}
```

---

# 原寸画像

配置先

```text
public/photos/
```

例

```text
photo001.jpg
photo002.jpg
```

---

# サムネイル

配置先

```text
public/thumbnails/
```

例

```text
photo001.webp
photo002.webp
```

---

# 画像推奨仕様

## 原寸

```text
3840 × 2160 以下
```

形式

```text
jpg
jpeg
webp
```

---

## サムネイル

```text
長辺512px
```

形式

```text
webp
```