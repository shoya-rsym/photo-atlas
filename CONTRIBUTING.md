# Contributing Guide

ARフォト図鑑への開発参加ルール。

本プロジェクトは主にGitHub Copilot Agentによる実装を前提とする。

---

# 開発方針

以下を必ず守ること。

- 小さく実装する
- 小さくレビューする
- 小さくマージする

一度に大規模変更を行わない。

---

# ブランチ戦略

## main

本番環境。

直接Push禁止。

---

## feature

機能開発用。

例

```text
feature/add-area-page
feature/add-search
feature/add-photo-detail
```

---

## fix

不具合修正。

例

```text
fix/photo-filter
fix/router-error
```

---

# Pull Requestルール

PRタイトル

```text
feat: 地域ページを実装

fix: 写真詳細表示の不具合修正

refactor: PhotoCard整理
```

---

# 実装ルール

## TypeScript

必須。

```typescript
any
```

禁止。

---

## React

App Router利用。

Pages Router禁止。

---

## Tailwind

使用すること。

独自CSSは最小限。

---

## データ取得

現在はJSON利用。

API呼び出しは禁止。

---

## 写真表示

一覧画面

- サムネイルのみ利用

詳細画面

- 原寸読み込み可

---

# コーディング規約

## 命名

コンポーネント

```text
PascalCase
```

例

```text
PhotoCard.tsx
MapView.tsx
```

---

型

```text
PascalCase
```

例

```typescript
Photo
Location
Prefecture
```

---

関数

```text
camelCase
```

例

```typescript
getPhotos()
getLocationById()
```

---

# テスト

最低限以下を確認すること。

- Build成功
- 型エラーなし
- ページ表示可能

---

# パフォーマンス

優先事項

1. 写真表示速度
2. モバイル表示
3. 地図表示

---

# ドキュメント

仕様変更時は以下も更新すること。

```text
docs/

03_data-model.md

04_routing.md

05_ui-spec.md

06_feature-spec.md

13_acceptance-criteria.md
```