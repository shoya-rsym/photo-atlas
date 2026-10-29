// JSONデータ・ハッシュ台帳・最近使った設定の入出力
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
export const DATA_DIR = join(ROOT, "src", "data");
export const PHOTOS_DIR = join(ROOT, "public", "photos");
export const THUMBNAILS_DIR = join(ROOT, "public", "thumbnails");
const TOOL_DIR = join(ROOT, "tools", "photo-import");
/** 画像ハッシュ台帳。重複登録の判定に使う（Photo型には持たせない） */
const HASHES_FILE = join(TOOL_DIR, "data", "hashes.json");
/** 個人環境の作業領域（Git管理外） */
export const LOCAL_DIR = join(TOOL_DIR, ".local");
const RECENT_FILE = join(LOCAL_DIR, "recent.json");
const RECENT_LIMIT = 10;
export const ID_PATTERN = /^[a-z0-9_]+$/;

export const dataFile = (name) => join(DATA_DIR, `${name}.json`);

export async function readJson(file, fallback) {
  if (!existsSync(file)) return fallback;
  const text = await readFile(file, "utf8");
  return JSON.parse(text.replace(/^\uFEFF/, ""));
}

/** 一時ファイル経由で書き込み、途中で失敗しても元ファイルを壊さない */
export async function writeAtomic(file, content) {
  await mkdir(dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.tmp`;
  await writeFile(temp, content, "utf8");
  await rename(temp, file);
}

function formatValue(value) {
  if (Array.isArray(value)) return `[${value.map(formatValue).join(", ")}]`;
  return JSON.stringify(value);
}

/**
 * 既存JSONの書式に合わせて出力する（差分を最小化するため）
 * expanded: 1項目を複数行で出力（photos / locations）、inline: 1項目を1行で出力（tags / characters）
 */
export function formatJsonList(list, style) {
  if (list.length === 0) return "[]\n";
  const rows = list.map((item) => {
    const entries = Object.entries(item).filter(([, v]) => v !== undefined);
    if (style === "inline") {
      return `  { ${entries.map(([k, v]) => `"${k}": ${formatValue(v)}`).join(", ")} }`;
    }
    const lines = entries.map(([k, v]) => `    "${k}": ${formatValue(v)}`);
    return `  {\n${lines.join(",\n")}\n  }`;
  });
  return `[\n${rows.join(",\n")}\n]\n`;
}

export function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

/** photo0001 形式。既存の最大番号の次を返す */
export function nextPhotoNumber(photos) {
  let max = 0;
  for (const p of photos) {
    const m = /^photo(\d+)$/.exec(p.id);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return max + 1;
}

/** 指定IDがあれば検証して使い、無ければ prefix_001 形式で未使用のものを採番する */
export function allocateId(prefix, requested, usedIds) {
  if (requested) {
    if (!ID_PATTERN.test(requested)) throw new Error(`IDは英小文字・数字・_ のみ: ${requested}`);
    if (usedIds.has(requested)) throw new Error(`IDが重複しています: ${requested}`);
    usedIds.add(requested);
    return requested;
  }
  for (let n = 1; ; n += 1) {
    const id = `${prefix}_${String(n).padStart(3, "0")}`;
    if (!usedIds.has(id)) {
      usedIds.add(id);
      return id;
    }
  }
}

// ---- ハッシュ台帳 { [hash]: photoId } ----

export async function loadHashes() {
  return readJson(HASHES_FILE, {});
}

export async function saveHashes(hashes) {
  const sorted = Object.fromEntries(Object.entries(hashes).sort(([a], [b]) => a.localeCompare(b)));
  await writeAtomic(HASHES_FILE, `${JSON.stringify(sorted, null, 2)}\n`);
}

/** 台帳に無い既存写真（ツール導入前の登録分）を、現在の画像ファイルから補完する */
export async function seedHashes(photos) {
  const hashes = await loadHashes();
  const known = new Set(Object.values(hashes));
  let changed = false;
  for (const photo of photos) {
    if (known.has(photo.id)) continue;
    const file = join(ROOT, "public", photo.image);
    if (!existsSync(file)) continue;
    hashes[sha256(await readFile(file))] ??= photo.id;
    changed = true;
  }
  if (changed) await saveHashes(hashes);
  return hashes;
}

// ---- 最近使った設定 ----

export async function loadRecent() {
  return readJson(RECENT_FILE, []);
}

/** 同じ組み合わせは先頭へ移動し、最大 RECENT_LIMIT 件を保持する */
export async function pushRecent(setting) {
  const list = await loadRecent();
  const characterIds = setting.characterIds ?? (setting.characterId ? [setting.characterId] : []);
  const key = JSON.stringify([setting.locationId, [...setting.tagIds].sort(), [...characterIds].sort()]);
  const next = [
    { ...setting, characterIds, characterId: undefined, usedAt: new Date().toISOString() },
    ...list.filter(
      (s) =>
        JSON.stringify([
          s.locationId,
          [...s.tagIds].sort(),
          [...(s.characterIds ?? (s.characterId ? [s.characterId] : []))].sort(),
        ]) !== key,
    ),
  ].slice(0, RECENT_LIMIT);
  await writeAtomic(RECENT_FILE, `${JSON.stringify(next, null, 2)}\n`);
}
