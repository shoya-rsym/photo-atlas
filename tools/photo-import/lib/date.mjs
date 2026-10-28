// 撮影日の入力正規化（サーバー・ブラウザ共用）

/**
 * @param {string} input 202604 / 20260415 / 2026-04-15 / 2026年4月15日 など。空欄は撮影日不明
 * @returns {{ ok: true, value?: string, note?: string } | { ok: false, error: string }}
 */
export function parseDateInput(input) {
  const text = String(input ?? "")
    .normalize("NFKC")
    .trim();
  if (text === "") return { ok: true };

  let year;
  let month;
  let day;
  let note;
  let m;
  if ((m = /^(\d{4})(\d{2})$/.exec(text))) {
    [, year, month] = m;
    note = "日の指定がないため1日として保存します";
  } else if ((m = /^(\d{4})年(\d{1,2})月(\d{1,2})日$/.exec(text))) {
    [, year, month, day] = m;
  } else if ((m = /^(\d{4})(\d{2})(\d{2})$/.exec(text))) {
    [, year, month, day] = m;
  } else if ((m = /^(\d{4})[-/.](\d{1,2})$/.exec(text))) {
    [, year, month] = m;
    note = "日の指定がないため1日として保存します";
  } else if ((m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(text))) {
    [, year, month, day] = m;
  } else {
    return { ok: false, error: "日付は 202604 / 20260415 / 2026-04-15 / 2026年4月15日 の形式で入力してください" };
  }

  const y = Number(year);
  const mo = Number(month);
  const d = Number(day ?? 1);
  const date = new Date(Date.UTC(y, mo - 1, d));
  if (
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() !== mo - 1 ||
    date.getUTCDate() !== d
  ) {
    return { ok: false, error: "存在しない日付です" };
  }
  const value = `${String(y).padStart(4, "0")}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  return note ? { ok: true, value, note } : { ok: true, value };
}
