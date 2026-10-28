# AGENTS.md

本ファイルは GitHub Copilot Agent 向け開発指示書である。

---

# 最重要方針

本サイトはSNSではない。

```text
地図から写真へ辿る図鑑
```

である。

UIよりも

- 写真
- 地図
- 導線

を優先すること。

---

# 設計思想

システムの中心エンティティは Photo とする。

Location中心設計は禁止。

以下の将来拡張を考慮できる構造にすること。

- Tag
- Character
- Season

ただしMVP実装対象外。

---

# 必読ドキュメント

```text
docs/01_project-overview.md
docs/02_architecture.md
docs/03_data-model.md
docs/04_routing.md
docs/05_ui-spec.md
docs/06_feature-spec.md
docs/09_wireframes.md
docs/13_acceptance-criteria.md
docs/14_navigation-rules.md
docs/15_error-handling.md
docs/18_data-validation.md
docs/19_mvp-scope.md
```

---

# 技術要件

```text
Next.js
TypeScript
Tailwind CSS
Leaflet
GitHub Pages
```

---

# データソース

```text
src/data/
```

以下を利用。

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

# 日本地図仕様

TOPページではSVG地図を利用する。

```text
public/maps/japan-regions.svg
```

---

## 重要

SVGは都道府県単位で作成すること。

例

```text
pref-tokyo
pref-kanagawa
pref-saitama
```

---

地域表示は都道府県グループ化で実現する。

---

# Tag仕様

Photo.tags は Tag.id を保持する。

表示時は Tag.name を利用する。

---

# Character仕様

Photo.characterId は Character.id を保持する。

表示時は Character.name を利用する。

---

# Photo仕様

Photo.date は任意。

存在しない場合

```text
撮影日不明
```

を表示する。

---

Photo.createdAt は必須。

---

# 品質条件

```text
TypeScript Error 0
ESLint Error 0
```

---

# 禁止事項

```typescript
any
```

禁止

```javascript
var
```

禁止

---

また以下は禁止。

- jQuery
- Pages Router
- DB導入
- 外部API依存
- 過剰実装

---

# MVP対象外

- AI機能
- 認証
- 管理画面
- ランキング
- 達成率
- お気に入り
- EXIF取込

---

# 完了条件

docs/13_acceptance-criteria.md を満たすこと。