// 登録済み写真の編集・一括編集・削除（Photo Management Tool）
import { execFile } from "node:child_process";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { parseDateInput } from "./date.mjs";
import {
  LOCAL_DIR,
  PHOTOS_DIR,
  ROOT,
  THUMBNAILS_DIR,
  dataFile,
  formatJsonList,
  loadHashes,
  readJson,
  saveHashes,
  writeAtomic,
} from "./store.mjs";

const TRASH_DIR = join(LOCAL_DIR, "trash");

/** 書き込み系操作を直列化する（同時実行による JSON の上書き事故を防ぐ） */
let queue = Promise.resolve();
function exclusive(task) {
  const run = queue.then(task, task);
  queue = run.catch(() => undefined);
  return run;
}

function runValidation() {
  return new Promise((resolveRun) => {
    execFile(process.execPath, [join(ROOT, "scripts", "validate-data.mjs")], { cwd: ROOT }, (err, stdout, stderr) => {
      resolveRun({ ok: !err, output: `${stdout}${stderr}`.trim() });
    });
  });
}

async function loadAll() {
  const [photos, locations, tags, characters] = await Promise.all(
    ["photos", "locations", "tags", "characters"].map((n) => readJson(dataFile(n), [])),
  );
  return { photos, locations, tags, characters };
}

/** 代表写真は地点ごとに最大1枚。重複時は preferred（今回操作した写真）を優先する */
function normalizeCovers(photos, preferred) {
  const keeper = new Map();
  for (const p of photos) {
    if (!p.isCover) continue;
    const current = keeper.get(p.locationId);
    if (!current || (preferred.has(p.id) && !preferred.has(current))) keeper.set(p.locationId, p.id);
  }
  return photos.map((p) => {
    if (!p.isCover || keeper.get(p.locationId) === p.id) return p;
    const { isCover: _unset, ...rest } = p;
    return rest;
  });
}

function cleanPhoto(photo) {
  const out = { ...photo };
  for (const key of Object.keys(out)) if (out[key] === undefined) delete out[key];
  if (out.isCover !== true) delete out.isCover;
  return out;
}

function orphanLocationIds(photos, locations) {
  const used = new Set(photos.map((p) => p.locationId));
  return locations.filter((l) => !used.has(l.id)).map((l) => l.id);
}

async function savePhotos(photos) {
  await writeAtomic(dataFile("photos"), formatJsonList(photos, "expanded"));
}

async function finish(photos, locations, extra = {}) {
  return { ...extra, orphanLocations: orphanLocationIds(photos, locations), validation: await runValidation() };
}

function parseDate(input) {
  const result = parseDateInput(input);
  if (!result.ok) throw new Error(result.error);
  return result.value;
}

function requireIds(ids) {
  if (!Array.isArray(ids) || ids.length === 0) throw new Error("対象の写真が選択されていません");
  return new Set(ids);
}

function assertExist(list, id, label) {
  if (!list.some((x) => x.id === id)) throw new Error(`存在しない${label}です: ${id}`);
}

/** 1枚の詳細編集。patch に含まれる項目のみ更新する */
export function updatePhoto(id, patch) {
  return exclusive(async () => {
    const { photos, locations, tags, characters } = await loadAll();
    const target = photos.find((p) => p.id === id);
    if (!target) throw new Error(`写真が見つかりません: ${id}`);
    const next = { ...target };

    if ("title" in patch) {
      const title = String(patch.title ?? "").trim();
      if (!title) throw new Error("タイトルは必須です");
      next.title = title;
    }
    if ("date" in patch) next.date = parseDate(patch.date) ?? undefined;
    if ("tagIds" in patch) {
      const tagIds = [...new Set(patch.tagIds ?? [])];
      for (const t of tagIds) assertExist(tags, t, "タグ");
      next.tags = tagIds;
    }
    if ("characterId" in patch) {
      if (patch.characterId) assertExist(characters, patch.characterId, "キャラクター");
      next.characterId = patch.characterId || undefined;
    }
    if ("locationId" in patch) {
      assertExist(locations, patch.locationId, "撮影地点");
      next.locationId = patch.locationId;
    }
    if ("comment" in patch) next.comment = String(patch.comment ?? "").trim() || undefined;
    if ("isCover" in patch) next.isCover = patch.isCover === true;

    const updated = photos.map((p) => (p.id === id ? cleanPhoto(next) : p));
    const final = normalizeCovers(updated, new Set([id]));
    await savePhotos(final);
    return finish(final, locations, { photo: final.find((p) => p.id === id) });
  });
}

/**
 * 一括編集。
 * @param {object} op { ids, addTagIds, removeTagIds, locationId, characterId (null=解除), date ('' = 撮影日不明) }
 *   characterId / date は「キーが存在するときだけ」変更する
 */
export function bulkUpdate(op) {
  return exclusive(async () => {
    const ids = requireIds(op.ids);
    const { photos, locations, tags, characters } = await loadAll();
    const add = [...new Set(op.addTagIds ?? [])];
    const remove = new Set(op.removeTagIds ?? []);
    for (const t of add) assertExist(tags, t, "タグ");
    if (op.locationId) assertExist(locations, op.locationId, "撮影地点");
    if (op.characterId) assertExist(characters, op.characterId, "キャラクター");
    const date = "date" in op ? parseDate(op.date) : undefined;

    let changed = 0;
    const updated = photos.map((p) => {
      if (!ids.has(p.id)) return p;
      const next = { ...p };
      if (add.length || remove.size) {
        next.tags = [...new Set([...(p.tags ?? []), ...add])].filter((t) => !remove.has(t));
      }
      if (op.locationId) next.locationId = op.locationId;
      if ("characterId" in op) next.characterId = op.characterId || undefined;
      if ("date" in op) next.date = date ?? undefined;
      changed += 1;
      return cleanPhoto(next);
    });
    if (changed === 0) throw new Error("対象の写真が見つかりません");
    const final = normalizeCovers(updated, new Set());
    await savePhotos(final);
    return finish(final, locations, { changed });
  });
}

/** 削除。photos.json・原寸画像・サムネイルを同時に消す（実体は .local/trash へ退避） */
export function deletePhotos(rawIds) {
  return exclusive(async () => {
    const ids = requireIds(rawIds);
    const { photos, locations } = await loadAll();
    const targets = photos.filter((p) => ids.has(p.id));
    if (targets.length === 0) throw new Error("対象の写真が見つかりません");

    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const trash = join(TRASH_DIR, stamp);
    await mkdir(trash, { recursive: true });
    await writeFile(join(trash, "photos.json"), JSON.stringify(targets, null, 2), "utf8");

    const moved = [];
    const fileOf = (dir, publicPath) => join(dir, basename(String(publicPath ?? "")));
    try {
      for (const p of targets) {
        for (const [dir, publicPath] of [
          [PHOTOS_DIR, p.image],
          [THUMBNAILS_DIR, p.thumbnail],
        ]) {
          const source = fileOf(dir, publicPath);
          const dest = join(trash, basename(source));
          try {
            await rename(source, dest);
            moved.push([source, dest]);
          } catch (error) {
            if (error.code !== "ENOENT") throw error;
          }
        }
      }
      const final = photos.filter((p) => !ids.has(p.id));
      await savePhotos(final);

      // 削除した写真のハッシュを外す（同じ画像を再登録できるようにする）
      const hashes = await loadHashes();
      const removed = new Set(targets.map((p) => p.id));
      await saveHashes(Object.fromEntries(Object.entries(hashes).filter(([, id]) => !removed.has(id))));
      return finish(final, locations, { deleted: targets.length, trash });
    } catch (error) {
      for (const [source, dest] of moved.reverse()) await rename(dest, source).catch(() => undefined);
      await rm(trash, { recursive: true, force: true });
      throw error;
    }
  });
}

/** 写真が0枚になった撮影地点を削除する（validate-data が孤立地点をエラーにするため） */
export function pruneLocations() {
  return exclusive(async () => {
    const { photos, locations } = await loadAll();
    const orphans = new Set(orphanLocationIds(photos, locations));
    if (orphans.size === 0) return finish(photos, locations, { removed: [] });
    const kept = locations.filter((l) => !orphans.has(l.id));
    await writeAtomic(dataFile("locations"), formatJsonList(kept, "expanded"));
    return finish(photos, kept, { removed: [...orphans] });
  });
}

export async function loadPhotos() {
  return readJson(dataFile("photos"), []);
}

export async function readImageFile(kind, name) {
  if (!/^[A-Za-z0-9_.-]+$/.test(name)) return null;
  const dir = kind === "photos" ? PHOTOS_DIR : THUMBNAILS_DIR;
  try {
    return await readFile(join(dir, name));
  } catch {
    return null;
  }
}
