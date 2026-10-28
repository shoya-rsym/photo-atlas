// 画像のステージング（受取・ハッシュ・プレビュー）と登録実行
import { randomBytes } from "node:crypto";
import { execFile } from "node:child_process";
import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { parseDateInput } from "./date.mjs";
import { findExactName } from "./search.mjs";
import {
  LOCAL_DIR,
  PHOTOS_DIR,
  ROOT,
  THUMBNAILS_DIR,
  allocateId,
  dataFile,
  formatJsonList,
  loadHashes,
  nextPhotoNumber,
  pushRecent,
  readJson,
  saveHashes,
  seedHashes,
  sha256,
  writeAtomic,
} from "./store.mjs";

const STAGING_DIR = join(LOCAL_DIR, "staging");
const THUMBNAIL_LONG_SIDE = 512;
const PREVIEW_LONG_SIDE = 240;
/** docs/20_image-management.md: 3840x2160 以下（縦長は 2160x3840） */
const MAX_LONG = 3840;
const MAX_SHORT = 2160;
const SUPPORTED = new Set(["jpeg", "png", "webp"]);

/** token -> { name, hash, width, height, format, size } */
const staged = new Map();

export async function initStaging() {
  await rm(STAGING_DIR, { recursive: true, force: true });
  await mkdir(STAGING_DIR, { recursive: true });
  const photos = await readJson(dataFile("photos"), []);
  return seedHashes(photos);
}

/** 受け取った画像を検査し、ハッシュ・重複・プレビューを返す */
export async function stageImage(name, buffer) {
  let meta;
  try {
    meta = await sharp(buffer).metadata();
  } catch {
    throw new Error("画像として読み込めません");
  }
  if (!meta.format || !SUPPORTED.has(meta.format)) {
    throw new Error(`未対応の形式です: ${meta.format ?? "不明"}（jpg / png / webp のみ）`);
  }
  const swap = (meta.orientation ?? 1) >= 5;
  const width = swap ? meta.height : meta.width;
  const height = swap ? meta.width : meta.height;
  const hash = sha256(buffer);
  const token = randomBytes(8).toString("hex");

  await writeFile(join(STAGING_DIR, `${token}.bin`), buffer);
  await sharp(buffer)
    .rotate()
    .resize(PREVIEW_LONG_SIDE, PREVIEW_LONG_SIDE, { fit: "inside" })
    .webp({ quality: 70 })
    .toFile(join(STAGING_DIR, `${token}.preview.webp`));

  staged.set(token, { name, hash, width, height, format: meta.format, size: buffer.length });
  const hashes = await loadHashes();
  return { token, name, hash, width, height, size: buffer.length, duplicateOf: hashes[hash] ?? null };
}

export async function readPreview(token) {
  if (!staged.has(token)) return null;
  return readFile(join(STAGING_DIR, `${token}.preview.webp`));
}

export async function discardStaged(tokens) {
  for (const token of tokens) {
    if (!staged.delete(token)) continue;
    await rm(join(STAGING_DIR, `${token}.bin`), { force: true });
    await rm(join(STAGING_DIR, `${token}.preview.webp`), { force: true });
  }
}

export async function loadMaster() {
  const [prefectures, locations, tags, characters, photos] = await Promise.all(
    ["prefectures", "locations", "tags", "characters", "photos"].map((n) => readJson(dataFile(n), [])),
  );
  const counts = {};
  for (const p of photos) counts[p.locationId] = (counts[p.locationId] ?? 0) + 1;
  return { prefectures, locations, tags, characters, photoCounts: counts, photoTotal: photos.length };
}

/** 原寸画像を書き出す。形式・サイズが規定内ならバイト列をそのままコピーする */
async function writeOriginal(token, info, id) {
  const source = join(STAGING_DIR, `${token}.bin`);
  const [long, short] = [Math.max(info.width, info.height), Math.min(info.width, info.height)];
  const within = long <= MAX_LONG && short <= MAX_SHORT;
  if (within && (info.format === "jpeg" || info.format === "webp")) {
    const ext = info.format === "jpeg" ? "jpg" : "webp";
    await copyFile(source, join(PHOTOS_DIR, `${id}.${ext}`));
    return `${id}.${ext}`;
  }
  const portrait = info.height > info.width;
  const target = join(PHOTOS_DIR, `${id}.jpg`);
  await sharp(source)
    .rotate()
    .resize(portrait ? MAX_SHORT : MAX_LONG, portrait ? MAX_LONG : MAX_SHORT, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .flatten({ background: "#ffffff" })
    .jpeg({ quality: 90, mozjpeg: true })
    .toFile(target);
  return `${id}.jpg`;
}

async function writeThumbnail(token, id) {
  await sharp(join(STAGING_DIR, `${token}.bin`))
    .rotate()
    .resize(THUMBNAIL_LONG_SIDE, THUMBNAIL_LONG_SIDE, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80 })
    .toFile(join(THUMBNAILS_DIR, `${id}.webp`));
}

function runValidation() {
  return new Promise((resolveRun) => {
    execFile(process.execPath, [join(ROOT, "scripts", "validate-data.mjs")], { cwd: ROOT }, (err, stdout, stderr) => {
      resolveRun({ ok: !err, output: `${stdout}${stderr}`.trim() });
    });
  });
}

function requireText(value, label) {
  const text = String(value ?? "").trim();
  if (!text) throw new Error(`${label}が未入力です`);
  return text;
}

/**
 * 登録実行。検証 → 画像 → JSON の順に書き込み、失敗時は作成した画像とJSONを元に戻す
 * @param {object} payload client から送られる登録内容
 */
export async function commitImport(payload) {
  const [locations, tags, characters, photos, prefectures] = await Promise.all(
    ["locations", "tags", "characters", "photos", "prefectures"].map((n) => readJson(dataFile(n), [])),
  );
  const items = Array.isArray(payload.items) ? payload.items : [];
  if (items.length === 0) throw new Error("登録する画像がありません");

  // 撮影日
  const dateResult = parseDateInput(payload.date);
  if (!dateResult.ok) throw new Error(dateResult.error);

  // 撮影地点（既存 or 新規）
  const newLocations = [];
  let locationId = payload.locationId;
  if (payload.newLocation) {
    const n = payload.newLocation;
    const name = requireText(n.name, "新規撮影地点の名前");
    if (findExactName(locations, name)) throw new Error(`撮影地点「${name}」は既に存在します`);
    if (!prefectures.some((p) => p.id === n.prefectureId)) throw new Error("新規撮影地点の都道府県が不正です");
    const used = new Set(locations.map((l) => l.id));
    const location = {
      id: allocateId("location", n.id, used),
      name,
      prefectureId: n.prefectureId,
      subregionId: n.subregionId || undefined,
      address: n.address?.trim() || undefined,
      lat: Number.isFinite(n.lat) ? n.lat : undefined,
      lng: Number.isFinite(n.lng) ? n.lng : undefined,
    };
    newLocations.push(location);
    locationId = location.id;
  }
  const allLocations = [...locations, ...newLocations];
  const location = allLocations.find((l) => l.id === locationId);
  if (!location) throw new Error("撮影地点が選択されていません");

  // タグ・キャラクター（新規は追記）
  const tagIds = new Set(tags.map((t) => t.id));
  const newTags = [];
  for (const n of payload.newTags ?? []) {
    const name = requireText(n.name, "新規タグ名");
    const existing = findExactName([...tags, ...newTags], name);
    if (existing) continue;
    newTags.push({ id: allocateId("tag", n.id, tagIds), name, category: n.category?.trim() || undefined });
  }
  const selectedTags = [
    ...(payload.tagIds ?? []),
    ...(payload.newTags ?? []).map((n) => findExactName([...tags, ...newTags], n.name)?.id),
  ];
  const allTags = [...tags, ...newTags];
  const finalTags = [...new Set(selectedTags)];
  for (const id of finalTags) {
    if (!allTags.some((t) => t.id === id)) throw new Error(`存在しないタグです: ${id}`);
  }

  const newCharacters = [];
  let characterId = payload.characterId || undefined;
  if (payload.newCharacter) {
    const n = payload.newCharacter;
    const name = requireText(n.name, "新規キャラクター名");
    const existing = findExactName(characters, name);
    if (existing) characterId = existing.id;
    else {
      const used = new Set(characters.map((c) => c.id));
      const created = { id: allocateId("character", n.id, used), name, series: n.series?.trim() || undefined };
      newCharacters.push(created);
      characterId = created.id;
    }
  }
  if (characterId && ![...characters, ...newCharacters].some((c) => c.id === characterId)) {
    throw new Error(`存在しないキャラクターです: ${characterId}`);
  }

  // 画像（重複チェック）
  const hashes = await loadHashes();
  const seen = new Set();
  for (const item of items) {
    const info = staged.get(item.token);
    if (!info) throw new Error("ステージングされていない画像が含まれています（再度ドラッグしてください）");
    const duplicated = hashes[info.hash] || seen.has(info.hash);
    if (duplicated && !item.allowDuplicate) throw new Error(`重複画像は登録できません: ${info.name}`);
    seen.add(info.hash);
  }

  // 書き込み準備
  const comment = payload.comment?.trim() || undefined;
  const baseTitle = payload.title?.trim() || location.name;
  const width = String(items.length).length;
  let number = nextPhotoNumber(photos);
  const now = Date.now();
  const createdFiles = [];
  const newPhotos = [];
  const newHashes = {};
  await mkdir(PHOTOS_DIR, { recursive: true });
  await mkdir(THUMBNAILS_DIR, { recursive: true });

  try {
    for (const [index, item] of items.entries()) {
      const info = staged.get(item.token);
      const id = `photo${String(number).padStart(4, "0")}`;
      number += 1;
      const file = await writeOriginal(item.token, info, id);
      createdFiles.push(join(PHOTOS_DIR, file));
      await writeThumbnail(item.token, id);
      createdFiles.push(join(THUMBNAILS_DIR, `${id}.webp`));
      newPhotos.push({
        id,
        title: items.length === 1 ? baseTitle : `${baseTitle} ${String(index + 1).padStart(width, "0")}`,
        image: `/photos/${file}`,
        thumbnail: `/thumbnails/${id}.webp`,
        date: dateResult.value,
        // 取り込み順を保つため、1枚ごとに1msずつ進める
        createdAt: new Date(now + index).toISOString(),
        locationId: location.id,
        tags: finalTags,
        characterId,
        comment,
        isCover: item.isCover ? true : undefined,
      });
      newHashes[info.hash] ??= id;
    }

    // JSON更新（画像がすべて書けてから）
    const backups = [];
    const write = async (name, list, style) => {
      const file = dataFile(name);
      backups.push({ file, before: await readFile(file, "utf8") });
      await writeAtomic(file, formatJsonList(list, style));
    };
    try {
      if (newTags.length) await write("tags", allTags, "inline");
      if (newCharacters.length) await write("characters", [...characters, ...newCharacters], "inline");
      if (newLocations.length) await write("locations", allLocations, "expanded");
      const hasNewCover = newPhotos.some((p) => p.isCover);
      const existing = hasNewCover
        ? photos.map((p) => {
            if (p.locationId !== locationId || !p.isCover) return p;
            const { isCover: _unset, ...rest } = p;
            return rest;
          })
        : photos;
      await write("photos", [...existing, ...newPhotos], "expanded");
    } catch (error) {
      for (const b of backups.reverse()) await writeAtomic(b.file, b.before);
      throw error;
    }
  } catch (error) {
    for (const file of createdFiles) await rm(file, { force: true });
    throw error;
  }

  await saveHashes({ ...hashes, ...newHashes });
  await pushRecent({ locationId: location.id, tagIds: finalTags, characterId });
  await discardStaged(items.map((i) => i.token));
  const validation = await runValidation();

  return {
    count: newPhotos.length,
    firstId: newPhotos[0].id,
    lastId: newPhotos[newPhotos.length - 1].id,
    newTags,
    newCharacters,
    newLocations,
    validation,
  };
}
