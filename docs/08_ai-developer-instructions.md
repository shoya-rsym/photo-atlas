# AI Developer Instructions

本ドキュメントはAI開発支援ツール向けの補足指示である。

対象

- GitHub Copilot
- Copilot Agent
- 他AIコーディングツール

---

# 最優先参照

以下を優先して参照すること。

```text
AGENTS.md

03_data-model.md

04_routing.md

05_ui-spec.md

06_feature-spec.md

13_acceptance-criteria.md

19_mvp-scope.md
```

---

# システム思想

本システムは

```text
Photo中心設計
```

である。

Location中心設計をしてはいけない。

---

# UI思想

入口

```text
日本地図
```

---

目的

```text
写真へ辿り着くこと
```

---

# データソース

利用可能

```text
JSON
```

---

利用禁止

```text
DB

Prisma

外部API
```

---

# 日本地図

SVGを利用する。

配置

```text
public/maps/japan-regions.svg
```

---

重要

```text
都道府県単位SVG
```

で実装すること。

地域単位SVGは禁止。

---

# Tag

Photo.tags は

```text
Tag.id
```

を保持する。

表示時

```text
Tag.name
```

へ変換する。

---

# Character

Photo.characterId は

```text
Character.id
```

を保持する。

表示時

```text
Character.name
```

へ変換する。

---

# 撮影日

Photo.date は任意。

存在しない場合

```text
撮影日不明
```

を表示する。

---

# MVP外機能

実装してはいけない。

```text
認証

ログイン

管理画面

AI機能

お気に入り

ランキング

達成率

DB
```

---

# 品質条件

必須

```text
TypeScript Error 0

ESLint Error 0

Build Success
```

---

# エラー処理

存在しないデータ

```typescript
notFound()
```

利用。

---

画像未存在

```text
No Image
```

表示。

---

# 完了条件

以下を満たすこと。

```text
13_acceptance-criteria.md
```

参照。