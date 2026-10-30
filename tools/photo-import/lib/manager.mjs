// 登録済み写真の編集・一括編集・削除（Photo Management Tool）
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { parseDateInput } from "./date.mjs";
import sharp from "sharp";
import {
  LOCAL_DIR,
  PHOTOS_DIR,
  ROOT,
  THUMBNAILS_DIR,
  dataFile,
  allocateId,
  formatJsonList,
  loadHashes,
  readJson,
  saveHashes,
  writeAtomic,
} from "./store.mjs";
import { findExactName } from "./search.mjs";

const TRASH_DIR = join(LOCAL_DIR, "trash");
const UNDO_FILE = join(LOCAL_DIR, "manage-undo.json");
const UNDO_DATA_FILES = ["photos", "locations", "tags", "characters", "session-memories"];
const SIMILARITY_THRESHOLD = 8;
const PERCEPTUAL_SIZE = 32;
const PERCEPTUAL_FREQUENCIES = 8;
const IMAGE_HASH_CONCURRENCY = 4;
const PERCEPTUAL_COSINES = Array.from({ length: PERCEPTUAL_FREQUENCIES }, (_, frequency) =>
  Array.from({ length: PERCEPTUAL_SIZE }, (_, position) =>
    Math.cos(((2 * position + 1) * frequency * Math.PI) / (2 * PERCEPTUAL_SIZE)),
  ),
);

/** 書き込み系操作を直列化する（同時実行による JSON の上書き事故を防ぐ） */
let queue = Promise.resolve();

async function readUndoSnapshot() {
  const entries = await Promise.all(
    UNDO_DATA_FILES.map(async (name) => [name, await readFile(dataFile(name), "utf8")]),
  );
  return Object.fromEntries(entries);
}

function hashSnapshot(snapshot) {
  return Object.fromEntries(
    UNDO_DATA_FILES.map((name) => [
      name,
      createHash("sha256").update(snapshot[name]).digest("hex"),
    ]),
  );
}

function isUndoRecord(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    value.version === 1 &&
    typeof value.label === "string" &&
    Number.isInteger(value.photoCount) &&
    value.photoCount >= 0 &&
    value.before !== null &&
    typeof value.before === "object" &&
    value.after !== null &&
    typeof value.after === "object" &&
    UNDO_DATA_FILES.every(
      (name) => typeof value.before[name] === "string" && typeof value.after[name] === "string",
    )
  );
}

async function readUndoRecord() {
  const record = await readJson(UNDO_FILE, null);
  if (record === null) return null;
  if (
    record.version === 1 &&
    record.before &&
    typeof record.before.photos === "string" &&
    !("session-memories" in record.before)
  ) {
    await clearUndoRecord();
    return null;
  }
  if (!isUndoRecord(record)) throw new Error("取り消し情報が読み取れません");
  return record;
}

async function writeUndoSnapshot(snapshot) {
  for (const name of UNDO_DATA_FILES) {
    await writeAtomic(dataFile(name), snapshot[name]);
  }
}

function countChangedPhotos(before, after) {
  const previous = new Map(JSON.parse(before.photos).map((photo) => [photo.id, photo]));
  const current = new Map(JSON.parse(after.photos).map((photo) => [photo.id, photo]));
  const ids = new Set([...previous.keys(), ...current.keys()]);
  let count = 0;
  for (const id of ids) {
    if (JSON.stringify(previous.get(id)) !== JSON.stringify(current.get(id))) count += 1;
  }
  return count;
}

async function clearUndoRecord() {
  await writeAtomic(UNDO_FILE, "null\n");
}

function exclusive(task, { label = "Photo-Manage の情報変更", trackUndo = true } = {}) {
  const run = queue.then(async () => {
    if (!trackUndo) return task();

    const before = await readUndoSnapshot();
    const result = await task();
    const after = await readUndoSnapshot();
    if (UNDO_DATA_FILES.every((name) => before[name] === after[name])) return result;

    const record = {
      version: 1,
      label,
      photoCount: countChangedPhotos(before, after),
      before,
      after: hashSnapshot(after),
    };
    try {
      await writeAtomic(UNDO_FILE, `${JSON.stringify(record, null, 2)}\n`);
    } catch (error) {
      try {
        await writeUndoSnapshot(before);
      } catch (rollbackError) {
        throw new AggregateError(
          [error, rollbackError],
          "取り消し情報を保存できず、変更前のデータにも復元できませんでした",
        );
      }
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`取り消し情報を保存できなかったため変更を元に戻しました: ${message}`);
    }
    return result;
  });
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

function perceptualHash(pixels) {
  let sum = 0;
  for (const pixel of pixels) sum += pixel;
  const mean = sum / pixels.length;
  let variance = 0;
  for (const pixel of pixels) variance += (pixel - mean) ** 2;
  if (variance / pixels.length < 16) return null;

  const coefficients = new Float64Array(PERCEPTUAL_FREQUENCIES ** 2);
  for (let vertical = 0; vertical < PERCEPTUAL_FREQUENCIES; vertical += 1) {
    for (let horizontal = 0; horizontal < PERCEPTUAL_FREQUENCIES; horizontal += 1) {
      let coefficient = 0;
      for (let y = 0; y < PERCEPTUAL_SIZE; y += 1) {
        const verticalCosine = PERCEPTUAL_COSINES[vertical][y];
        for (let x = 0; x < PERCEPTUAL_SIZE; x += 1) {
          coefficient +=
            pixels[y * PERCEPTUAL_SIZE + x] *
            PERCEPTUAL_COSINES[horizontal][x] *
            verticalCosine;
        }
      }
      coefficients[vertical * PERCEPTUAL_FREQUENCIES + horizontal] = coefficient;
    }
  }

  const lowFrequencies = [...coefficients.slice(1)].sort((a, b) => a - b);
  const median = lowFrequencies[Math.floor(lowFrequencies.length / 2)];
  let hash = 0n;
  for (let index = 0; index < coefficients.length; index += 1) {
    if (coefficients[index] > median) hash |= 1n << BigInt(index);
  }
  return hash;
}

function hammingDistance(first, second) {
  let bits = first ^ second;
  let distance = 0;
  while (bits > 0n) {
    distance += Number(bits & 1n);
    bits >>= 1n;
  }
  return distance;
}

async function hashPhoto(photo) {
  const filename = basename(String(photo.image ?? ""));
  if (!filename || filename === ".") {
    return { photo, hash: null, error: "画像ファイル名がありません" };
  }
  try {
    const { data } = await sharp(join(PHOTOS_DIR, filename))
      .rotate()
      .flatten({ background: "#ffffff" })
      .resize(PERCEPTUAL_SIZE, PERCEPTUAL_SIZE, { fit: "fill" })
      .greyscale()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const hash = perceptualHash(data);
    return hash === null
      ? { photo, hash: null, error: "画像の特徴が少なく判定できません" }
      : { photo, hash, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { photo, hash: null, error: `画像を解析できません: ${message}` };
  }
}

function candidatePhoto(photo) {
  return {
    id: photo.id,
    title: photo.title,
    thumbnail: photo.thumbnail,
    locationId: photo.locationId,
    date: photo.date ?? null,
  };
}

export function findSimilarPhotos() {
  return exclusive(
    async () => {
      const photos = await readJson(dataFile("photos"), []);
      const hashes = [];
      for (let index = 0; index < photos.length; index += IMAGE_HASH_CONCURRENCY) {
        const batch = photos.slice(index, index + IMAGE_HASH_CONCURRENCY);
        hashes.push(...(await Promise.all(batch.map(hashPhoto))));
      }

      const comparable = hashes.filter((item) => item.hash !== null);
      const pairs = [];
      for (let first = 0; first < comparable.length; first += 1) {
        for (let second = first + 1; second < comparable.length; second += 1) {
          const distance = hammingDistance(comparable[first].hash, comparable[second].hash);
          if (distance <= SIMILARITY_THRESHOLD) {
            pairs.push({
              distance,
              first: candidatePhoto(comparable[first].photo),
              second: candidatePhoto(comparable[second].photo),
            });
          }
        }
      }
      pairs.sort(
        (a, b) =>
          a.distance - b.distance ||
          a.first.id.localeCompare(b.first.id) ||
          a.second.id.localeCompare(b.second.id),
      );
      return {
        pairs,
        threshold: SIMILARITY_THRESHOLD,
        analyzedCount: comparable.length,
        skipped: hashes
          .filter((item) => item.error)
          .map(({ photo, error }) => ({ id: photo.id, title: photo.title, reason: error })),
      };
    },
    { trackUndo: false },
  );
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

function generatedTitleSuffix(title, locations) {
  for (const location of locations) {
    if (title === location.name) return "";
    const prefix = `${location.name} `;
    if (!title.startsWith(prefix)) continue;
    const suffix = title.slice(prefix.length);
    if (/^\d+$/.test(suffix)) return suffix;
  }
  return undefined;
}

function updateGeneratedTitles(photos, locations, photoIds, location) {
  let titleUpdatedCount = 0;
  const updatedPhotos = photos.map((photo) => {
    if (!photoIds.has(photo.id)) return photo;
    const suffix = generatedTitleSuffix(photo.title, locations);
    if (suffix === undefined) return photo;
    const title = suffix ? `${location.name} ${suffix}` : location.name;
    if (title === photo.title) return photo;
    titleUpdatedCount += 1;
    return { ...photo, title };
  });
  return { photos: updatedPhotos, titleUpdatedCount };
}

function numberedTitleSuffix(title, locationName) {
  const prefix = `${locationName} `;
  if (!title.startsWith(prefix)) return undefined;
  const suffix = title.slice(prefix.length);
  if (!/^\d+$/.test(suffix)) return undefined;
  const number = Number(suffix);
  return Number.isSafeInteger(number) && number > 0 ? suffix : undefined;
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

export function getUndoStatus() {
  return exclusive(
    async () => {
      const record = await readUndoRecord();
      if (!record) return { available: false };

      const current = await readUndoSnapshot();
      const currentHashes = hashSnapshot(current);
      if (!UNDO_DATA_FILES.every((name) => currentHashes[name] === record.after[name])) {
        await clearUndoRecord();
        return { available: false };
      }

      return {
        available: true,
        label: record.label,
        photoCount: record.photoCount,
      };
    },
    { trackUndo: false },
  );
}

export function undoLastChange() {
  return exclusive(
    async () => {
      const record = await readUndoRecord();
      if (!record) throw new Error("取り消せる更新がありません");

      const current = await readUndoSnapshot();
      const currentHashes = hashSnapshot(current);
      if (!UNDO_DATA_FILES.every((name) => currentHashes[name] === record.after[name])) {
        await clearUndoRecord();
        throw new Error("更新後に別のデータ変更があったため、取り消せません");
      }

      try {
        await writeUndoSnapshot(record.before);
      } catch (error) {
        try {
          await writeUndoSnapshot(current);
        } catch (rollbackError) {
          throw new AggregateError(
            [error, rollbackError],
            "更新前情報の復元に失敗し、現在のデータにも戻せませんでした",
          );
        }
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`更新前情報を復元できませんでした: ${message}`);
      }

      await clearUndoRecord();
      const { photos, locations } = await loadAll();
      return finish(photos, locations, {
        undone: record.label,
        undonePhotoCount: record.photoCount,
      });
    },
    { trackUndo: false },
  );
}

function parseDate(input) {
  const result = parseDateInput(input);
  if (!result.ok) throw new Error(result.error);
  return result.value;
}

function optionalCoordinate(value, minimum, maximum, label) {
  if (value === null || value === undefined || (typeof value === "string" && value.trim() === "")) {
    return undefined;
  }
  if (typeof value !== "string" && typeof value !== "number") {
    throw new Error(`${label}が不正です`);
  }
  const coordinate = Number(value);
  if (!Number.isFinite(coordinate) || coordinate < minimum || coordinate > maximum) {
    throw new Error(`${label}は${minimum}〜${maximum}の範囲で入力してください`);
  }
  return coordinate;
}

function requireIds(ids) {
  if (!Array.isArray(ids) || ids.length === 0) throw new Error("対象の写真が選択されていません");
  return new Set(ids);
}

function assertExist(list, id, label) {
  if (!list.some((x) => x.id === id)) throw new Error(`存在しない${label}です: ${id}`);
}

function validateCharacterIds(rawIds, characters) {
  if (!Array.isArray(rawIds)) throw new Error("キャラクターの指定が不正です");
  const ids = [...new Set(rawIds)];
  for (const id of ids) assertExist(characters, id, "キャラクター");
  return ids;
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
    if ("characterIds" in patch) {
      const characterIds = validateCharacterIds(patch.characterIds ?? [], characters);
      next.characterIds = characterIds.length ? characterIds : undefined;
    }
    if ("locationId" in patch) {
      assertExist(locations, patch.locationId, "撮影地点");
      next.locationId = patch.locationId;
    }
    if ("comment" in patch) next.comment = String(patch.comment ?? "").trim() || undefined;
    if ("photoMemory" in patch) {
      const photoMemory = String(patch.photoMemory ?? "").trim();
      if ([...photoMemory].length > 120) {
        throw new Error("Photo Memoryは120文字以内で入力してください");
      }
      next.photoMemory = photoMemory || undefined;
    }
    if ("isCover" in patch) next.isCover = patch.isCover === true;

    let updated = photos.map((p) => (p.id === id ? cleanPhoto(next) : p));
    let titleUpdatedCount = 0;
    const locationChanged = next.locationId !== target.locationId;
    const titleUnchanged =
      !("title" in patch) || String(patch.title ?? "").trim() === target.title;
    if (locationChanged && titleUnchanged) {
      const location = locations.find((item) => item.id === next.locationId);
      if (location) {
        const titleResult = updateGeneratedTitles(
          updated,
          locations,
          new Set([id]),
          location,
        );
        updated = titleResult.photos;
        titleUpdatedCount = titleResult.titleUpdatedCount;
      }
    }
    const final = normalizeCovers(updated, new Set([id]));
    await savePhotos(final);
    return finish(final, locations, {
      photo: final.find((p) => p.id === id),
      titleUpdatedCount,
    });
  }, { label: "写真の個別編集" });
}

export function updateSessionMemory(id, rawText) {
  return exclusive(async () => {
    const [photos, locations, memories] = await Promise.all([
      readJson(dataFile("photos"), []),
      readJson(dataFile("locations"), []),
      readJson(dataFile("session-memories"), []),
    ]);
    const memory = memories.find((item) => item.id === id);
    if (!memory) throw new Error(`Session Memoryが見つかりません: ${id}`);
    const text = String(rawText ?? "").trim();
    if (!text) throw new Error("Session Memoryを入力してください");
    if ([...text].length > 120) {
      throw new Error("Session Memoryは120文字以内で入力してください");
    }

    const updatedMemory = {
      ...memory,
      text,
      generatedBy: "manual",
      updatedAt: new Date().toISOString(),
    };
    const updatedMemories = memories.map((item) =>
      item.id === id ? updatedMemory : item,
    );
    await writeAtomic(
      dataFile("session-memories"),
      formatJsonList(updatedMemories, "expanded"),
    );
    return finish(photos, locations, { sessionMemory: updatedMemory });
  }, { label: "Session Memoryの編集" });
}

export function deleteSessionMemory(id) {
  return exclusive(async () => {
    const [photos, locations, memories] = await Promise.all([
      readJson(dataFile("photos"), []),
      readJson(dataFile("locations"), []),
      readJson(dataFile("session-memories"), []),
    ]);
    const memory = memories.find((item) => item.id === id);
    if (!memory) throw new Error(`Session Memoryが見つかりません: ${id}`);

    await writeAtomic(
      dataFile("session-memories"),
      formatJsonList(
        memories.filter((item) => item.id !== id),
        "expanded",
      ),
    );
    return finish(photos, locations, { deletedSessionMemory: memory });
  }, { label: "Session Memoryの削除" });
}

/** 既存の撮影地点情報を更新する（ID は写真参照を保つため変更しない） */
export function updateLocation(id, patch) {
  return exclusive(async () => {
    const { photos, locations } = await loadAll();
    const current = locations.find((location) => location.id === id);
    if (!current) throw new Error(`撮影地点が見つかりません: ${id}`);

    const name = String(patch.name ?? "").trim();
    if (!name) throw new Error("撮影地点の名前は必須です");
    const duplicate = findExactName(
      locations.filter((location) => location.id !== id),
      name,
    );
    if (duplicate) throw new Error(`撮影地点「${name}」は既に存在します`);

    const prefectureId = String(patch.prefectureId ?? "");
    const prefectures = await readJson(dataFile("prefectures"), []);
    if (!prefectures.some((prefecture) => prefecture.id === prefectureId)) {
      throw new Error("撮影地点の都道府県が不正です");
    }

    const updatedLocation = {
      ...current,
      name,
      prefectureId,
      subregionId: current.prefectureId === prefectureId ? current.subregionId : undefined,
      address: String(patch.address ?? "").trim() || undefined,
      lat: optionalCoordinate(patch.lat, -90, 90, "緯度"),
      lng: optionalCoordinate(patch.lng, -180, 180, "経度"),
    };
    const updatedLocations = locations.map((location) =>
      location.id === id ? updatedLocation : location,
    );
    const locationPhotoIds = new Set(
      photos
        .filter((photo) => photo.locationId === id)
        .map((photo) => photo.id),
    );
    const titleResult =
      name !== current.name
        ? updateGeneratedTitles(photos, locations, locationPhotoIds, updatedLocation)
        : { photos, titleUpdatedCount: 0 };
    await writeAtomic(dataFile("locations"), formatJsonList(updatedLocations, "expanded"));
    try {
      if (titleResult.titleUpdatedCount > 0) await savePhotos(titleResult.photos);
    } catch (error) {
      await writeAtomic(dataFile("locations"), formatJsonList(locations, "expanded"));
      throw error;
    }
    return finish(titleResult.photos, updatedLocations, {
      location: updatedLocation,
      affectedPhotos: locationPhotoIds.size,
      titleUpdatedCount: titleResult.titleUpdatedCount,
    });
  }, { label: "撮影地点情報の更新" });
}

/** 新しい地点を作成し、選択した写真へ一括で割り当てる */
export function createLocation(payload) {
  return exclusive(async () => {
    const photoIds = requireIds(payload.photoIds);
    const { photos, locations } = await loadAll();
    const targets = photos.filter((photo) => photoIds.has(photo.id));
    if (targets.length !== photoIds.size) {
      throw new Error("選択した写真に見つからない項目があります。再読み込みしてください");
    }

    const name = String(payload.name ?? "").trim();
    if (!name) throw new Error("撮影地点の名前は必須です");
    if (findExactName(locations, name)) {
      throw new Error(`撮影地点「${name}」は既に存在します`);
    }

    const prefectureId = String(payload.prefectureId ?? "");
    const prefectures = await readJson(dataFile("prefectures"), []);
    if (!prefectures.some((prefecture) => prefecture.id === prefectureId)) {
      throw new Error("撮影地点の都道府県が不正です");
    }

    const location = {
      id: allocateId(
        "location",
        String(payload.id ?? "").trim() || undefined,
        new Set(locations.map((item) => item.id)),
      ),
      name,
      prefectureId,
      address: String(payload.address ?? "").trim() || undefined,
      lat: optionalCoordinate(payload.lat, -90, 90, "緯度"),
      lng: optionalCoordinate(payload.lng, -180, 180, "経度"),
    };
    const updatedLocations = [...locations, location];
    const updatedPhotos = normalizeCovers(
      photos.map((photo) =>
        photoIds.has(photo.id) ? { ...photo, locationId: location.id } : photo,
      ),
      photoIds,
    );
    const titleResult = updateGeneratedTitles(
      updatedPhotos,
      locations,
      photoIds,
      location,
    );

    await writeAtomic(
      dataFile("locations"),
      formatJsonList(updatedLocations, "expanded"),
    );
    try {
      await savePhotos(titleResult.photos);
    } catch (error) {
      await writeAtomic(dataFile("locations"), formatJsonList(locations, "expanded"));
      throw error;
    }

    return finish(titleResult.photos, updatedLocations, {
      location,
      changed: targets.length,
      affectedPhotos: targets.length,
      titleUpdatedCount: titleResult.titleUpdatedCount,
    });
  }, { label: "撮影地点の追加と一括適用" });
}

/** 新しいキャラクターを追加する */
export function createCharacter(payload) {
  return exclusive(async () => {
    const { photos, locations, characters } = await loadAll();
    const name = String(payload.name ?? "").trim();
    if (!name) throw new Error("キャラクター名は必須です");
    if (findExactName(characters, name)) throw new Error(`同じ名前のキャラクターが既にあります: ${name}`);

    const usedIds = new Set(characters.map((character) => character.id));
    const character = {
      id: allocateId("character", payload.id, usedIds),
      name,
      series: String(payload.series ?? "").trim() || undefined,
    };
    const updatedCharacters = [...characters, character];
    await writeAtomic(dataFile("characters"), formatJsonList(updatedCharacters, "inline"));
    return finish(photos, locations, { character });
  }, { label: "キャラクターの追加" });
}

/** 写真に設定されていないキャラクターのみ削除できる */
export function deleteCharacter(id) {
  return exclusive(async () => {
    const { photos, locations, characters } = await loadAll();
    const character = characters.find((item) => item.id === id);
    if (!character) throw new Error(`キャラクターが見つかりません: ${id}`);
    const usageCount = photos.filter((photo) => (photo.characterIds ?? []).includes(id)).length;
    if (usageCount > 0) {
      throw new Error(`写真 ${usageCount} 枚で使用中のため削除できません。先に写真側で設定を解除してください`);
    }

    const updatedCharacters = characters.filter((item) => item.id !== id);
    await writeAtomic(dataFile("characters"), formatJsonList(updatedCharacters, "inline"));
    return finish(photos, locations, { deletedCharacter: character });
  }, { label: "キャラクターの削除" });
}

/**
 * 一括編集。
 * @param {object} op { ids, addTagIds, removeTagIds, locationId, characterIds, date ('' = 撮影日不明) }
 *   characterIds / date は「キーが存在するときだけ」変更する
 */
export function bulkUpdate(op) {
  return exclusive(async () => {
    const ids = requireIds(op.ids);
    const { photos, locations, tags, characters } = await loadAll();
    const add = [...new Set(op.addTagIds ?? [])];
    const remove = new Set(op.removeTagIds ?? []);
    for (const t of add) assertExist(tags, t, "タグ");
    if (op.locationId) assertExist(locations, op.locationId, "撮影地点");
    const characterIds =
      "characterIds" in op ? validateCharacterIds(op.characterIds ?? [], characters) : undefined;
    const date = "date" in op ? parseDate(op.date) : undefined;

    let changed = 0;
    const updated = photos.map((p) => {
      if (!ids.has(p.id)) return p;
      const next = { ...p };
      if (add.length || remove.size) {
        next.tags = [...new Set([...(p.tags ?? []), ...add])].filter((t) => !remove.has(t));
      }
      if (op.locationId) next.locationId = op.locationId;
      if (characterIds) next.characterIds = characterIds.length ? characterIds : undefined;
      if ("date" in op) next.date = date ?? undefined;
      changed += 1;
      return cleanPhoto(next);
    });
    if (changed === 0) throw new Error("対象の写真が見つかりません");
    let withUpdatedTitles = updated;
    let titleUpdatedCount = 0;
    if (op.locationId) {
      const location = locations.find((item) => item.id === op.locationId);
      const movingIds = new Set(
        photos
          .filter((photo) => ids.has(photo.id) && photo.locationId !== op.locationId)
          .map((photo) => photo.id),
      );
      if (location && movingIds.size > 0) {
        const titleResult = updateGeneratedTitles(
          withUpdatedTitles,
          locations,
          movingIds,
          location,
        );
        withUpdatedTitles = titleResult.photos;
        titleUpdatedCount = titleResult.titleUpdatedCount;
      }
    }
    const final = normalizeCovers(withUpdatedTitles, new Set());
    await savePhotos(final);
    return finish(final, locations, { changed, titleUpdatedCount });
  }, { label: "写真の一括編集" });
}

/** 新しいタグを作成し、指定写真に追加する */
export function createTagAndApply(rawName, rawIds) {
  return exclusive(async () => {
    const ids = requireIds(rawIds);
    const { photos, locations, tags } = await loadAll();
    const name = String(rawName ?? "").trim();
    if (!name) throw new Error("タグ名を入力してください");
    if (findExactName(tags, name)) throw new Error(`同じ名前のタグが既にあります: ${name}`);

    const targets = photos.filter((photo) => ids.has(photo.id));
    if (targets.length !== ids.size) {
      throw new Error("選択した写真に見つからない項目があります。再読み込みしてください");
    }

    const usedTagIds = new Set(tags.map((tag) => tag.id));
    const tag = { id: allocateId("tag", undefined, usedTagIds), name };
    const updatedTags = [...tags, tag];
    const updatedPhotos = photos.map((photo) =>
      ids.has(photo.id)
        ? cleanPhoto({ ...photo, tags: [...new Set([...(photo.tags ?? []), tag.id])] })
        : photo,
    );

    await writeAtomic(dataFile("tags"), formatJsonList(updatedTags, "inline"));
    try {
      await savePhotos(updatedPhotos);
    } catch (error) {
      await writeAtomic(dataFile("tags"), formatJsonList(tags, "inline"));
      throw error;
    }

    return finish(updatedPhotos, locations, { tag, changed: targets.length });
  }, { label: "タグ作成と写真への適用" });
}

/** 選択写真のタイトルを、地点ごとに空いている最小番号から再採番する */
export function renumberPhotoTitles(rawIds) {
  return exclusive(async () => {
    const ids = requireIds(rawIds);
    const { photos, locations } = await loadAll();
    const targets = photos.filter((photo) => ids.has(photo.id));
    if (targets.length !== ids.size) {
      throw new Error("選択した写真に見つからない項目があります。再読み込みしてください");
    }

    const groups = new Map();
    for (const photo of targets) {
      const location = locations.find((item) => item.id === photo.locationId);
      if (!location) {
        throw new Error(`撮影地点が見つかりません: ${photo.locationId}`);
      }
      const group = groups.get(location.id) ?? { location, photos: [] };
      group.photos.push(photo);
      groups.set(location.id, group);
    }

    const titles = new Map();
    for (const { location, photos: selectedAtLocation } of groups.values()) {
      const selectedAtLocationIds = new Set(
        selectedAtLocation.map((photo) => photo.id),
      );
      const usedNumbers = new Set();
      let width = String(selectedAtLocation.length).length;
      for (const photo of photos) {
        if (
          photo.locationId !== location.id ||
          selectedAtLocationIds.has(photo.id)
        ) {
          continue;
        }
        const suffix = numberedTitleSuffix(photo.title, location.name);
        if (suffix === undefined) continue;
        const number = Number(suffix);
        usedNumbers.add(number);
        width = Math.max(width, suffix.length);
      }

      let candidate = 1;
      for (const photo of selectedAtLocation) {
        while (usedNumbers.has(candidate)) candidate += 1;
        titles.set(
          photo.id,
          `${location.name} ${String(candidate).padStart(width, "0")}`,
        );
        usedNumbers.add(candidate);
        candidate += 1;
      }
    }

    let titleUpdatedCount = 0;
    const updated = photos.map((photo) => {
      const title = titles.get(photo.id);
      if (title === undefined || title === photo.title) return photo;
      titleUpdatedCount += 1;
      return { ...photo, title };
    });
    await savePhotos(updated);
    return finish(updated, locations, {
      renumbered: true,
      renumberedCount: targets.length,
      titleUpdatedCount,
    });
  }, { label: "写真タイトルの再採番" });
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
  }, { trackUndo: false });
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
  }, { label: "空の撮影地点の削除" });
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
