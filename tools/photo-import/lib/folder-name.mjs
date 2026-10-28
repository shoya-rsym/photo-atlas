// フォルダ名からの設定推定（設計のみ・未実装）
//
// 例: 202604_横浜駅_初音ミク → { date: "202604", locationQuery: "横浜駅", characterQuery: "初音ミク" }
//
// 実装時の方針
// - 区切りは "_" とし、各要素を date / location / character へ振り分ける
//   （8桁・6桁数字 → 日付、locations.json に一致 → 地点、characters.json に一致 → キャラクター）
// - 結果はフォームの初期値として使う（上書き可能）。確定はユーザー操作
// - ブラウザ側は app.js の applyFolderHint() が、この関数の戻り値を受け取る想定
// - 外部APIや推測AIは使わない

/**
 * @typedef {Object} FolderHint
 * @property {string} [date] 日付入力欄へ渡す文字列（parseDateInput 形式）
 * @property {string} [locationQuery] 撮影地点の検索語
 * @property {string} [characterQuery] キャラクターの検索語
 * @property {string[]} [tagQueries] タグの検索語
 */

/**
 * @param {string} _folderName
 * @returns {FolderHint | null} 現在は未実装のため常に null
 */
export function parseFolderName(_folderName) {
  return null;
}
