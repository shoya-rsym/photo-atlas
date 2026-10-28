# 統計ルール

本ドキュメントは各種統計値の算出方法を定義する。

---

# 基本方針

すべて実行時算出とする。

MVPでは統計専用JSONを持たない。

---

# photoCount

定義

```text
登録写真総数
```

---

例

```text
photos.json

100件

↓

photoCount = 100
```

---

# locationCount

定義

```text
写真が1枚以上存在する撮影地点数
```

---

例

```text
横浜駅 10枚

山下公園 5枚

↓

locationCount = 2
```

---

# prefectureCount

定義

```text
写真が1枚以上存在する都道府県数
```

---

例

```text
神奈川県 10枚

東京都 3枚

↓

prefectureCount = 2
```

---

# 地点ページ統計

表示項目

```text
総写真数

初回撮影日

最新撮影日
```

---

# 初回撮影日

Photo.date の最小値。

---

# 最新撮影日

Photo.date の最大値。

---

# 撮影日不明

Photo.date未設定の場合。

```text
集計対象外
```

とする。

---

# 最近追加した写真

TOPページで表示。

件数

```text
10件
```

---

並び順

```text
createdAt降順
```

---

# 将来追加予定

以下はMVP対象外。

```text
都道府県達成率

地域達成率

キャラクター別ランキング

タグ別ランキング
```