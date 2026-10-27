# ルーティング設計

Next.js App Router を利用する。

---

# URL命名規則

IDは snake_case を利用する。

例

```text
kanagawa

tokyo

yokohama_station

hatsune_miku
```

---

# TOPページ

URL

```text
/
```

---

# 地域ページ

URL

```text
/area/[id]
```

例

```text
/area/kanto
```

---

# 都道府県ページ

URL

```text
/prefecture/[id]
```

例

```text
/prefecture/kanagawa
```

---

# 撮影地点ページ

URL

```text
/location/[id]
```

例

```text
/location/yokohama_station
```

---

# 写真ページ

URL

```text
/photo/[id]
```

例

```text
/photo/photo001
```

---

# 検索ページ

URL

```text
/search
```

---

# パンくず

地域

```text
TOP > 関東
```

---

都道府県

```text
TOP > 関東 > 神奈川県
```

---

撮影地点

```text
TOP > 関東 > 神奈川県 > 横浜駅
```

---

写真

```text
TOP > 関東 > 神奈川県 > 横浜駅 > 横浜駅AR
```

---

# 404

存在しないデータの場合。

対象

```text
/area/[id]

/prefecture/[id]

/location/[id]

/photo/[id]
```

---

実装

```typescript
notFound()
```

利用。

---

# MVP対象ルート

```text
/

/area/[id]

/prefecture/[id]

/location/[id]

/photo/[id]

/search
```

---

# 将来追加予定

```text
/tag/[id]

/character/[id]

/season/[id]

/ranking

/admin
```

将来追加ルートも Photo 中心で構築する。