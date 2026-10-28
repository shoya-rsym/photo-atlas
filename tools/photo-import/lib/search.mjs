// 撮影地点・タグ・キャラクターの曖昧検索（サーバー・ブラウザ共用）

/** 全角半角・大文字小文字・ひらがなカタカナ・空白の違いを吸収する */
export function normalize(text) {
  return String(text ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\u30a1-\u30f6]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
    .replace(/\s+/g, "");
}

/**
 * 名前で検索する。完全一致 > 前方一致 > 部分一致 > 補助項目一致 の順
 * @template {{ id: string, name: string }} T
 * @param {T[]} items
 * @param {string} query
 * @param {(item: T) => string[]} [extraFields] 補助的に検索する項目（住所など）
 * @param {number} [limit]
 * @returns {T[]}
 */
export function searchByName(items, query, extraFields = () => [], limit = 8) {
  const q = normalize(query);
  if (q === "") return [];
  const scored = [];
  for (const item of items) {
    const name = normalize(item.name);
    let score = -1;
    if (name === q || normalize(item.id) === q) score = 0;
    else if (name.startsWith(q)) score = 1;
    else if (name.includes(q)) score = 2;
    else if (extraFields(item).some((f) => normalize(f).includes(q))) score = 3;
    if (score >= 0) scored.push({ item, score });
  }
  scored.sort((a, b) => a.score - b.score || a.item.name.length - b.item.name.length);
  return scored.slice(0, limit).map((s) => s.item);
}

/** 完全一致する名前の項目（新規追加時の重複防止用） */
export function findExactName(items, name) {
  const q = normalize(name);
  return items.find((item) => normalize(item.name) === q);
}
