// docs/18_data-validation.md に基づくJSON整合性チェック
import { readFileSync } from "node:fs";

const read = (name) =>
  JSON.parse(readFileSync(new URL(`../src/data/${name}.json`, import.meta.url), "utf8"));

const areas = read("areas");
const prefectures = read("prefectures");
const locations = read("locations");
const tags = read("tags");
const characters = read("characters");
const photos = read("photos");
const sessionMemories = read("session-memories");
const memoryLibrary = read("memory-library");
const memoryCandidates = read("memory-candidates");
const regions = read("japan-map-regions");
const subregions = read("subregions");
const svg = readFileSync(new URL("../public/maps/japan-regions.svg", import.meta.url), "utf8");

const errors = [];
const ID_PATTERN = /^[a-z0-9_]+$/;

function checkIds(label, list) {
  const seen = new Set();
  for (const item of list) {
    if (!item.id || !ID_PATTERN.test(item.id)) errors.push(`${label}: 不正なID ${item.id}`);
    if (seen.has(item.id)) errors.push(`${label}: 重複ID ${item.id}`);
    seen.add(item.id);
    if (!item.name && !["photos", "session-memories"].includes(label)) {
      errors.push(`${label}: name未設定 ${item.id}`);
    }
  }
  return seen;
}

const areaIds = checkIds("areas", areas);
const prefectureIds = checkIds("prefectures", prefectures);
const locationIds = checkIds("locations", locations);
const tagIds = checkIds("tags", tags);
const characterIds = checkIds("characters", characters);
checkIds("photos", photos);
checkIds("session-memories", sessionMemories);

for (const p of prefectures) {
  if (!areaIds.has(p.areaId)) errors.push(`prefectures: areaId不正 ${p.id}`);
}
for (const l of locations) {
  if (!prefectureIds.has(l.prefectureId)) errors.push(`locations: prefectureId不正 ${l.id}`);
  if (l.subregionId) {
    const sub = subregions.find((s) => s.id === l.subregionId);
    if (!sub) errors.push(`locations: subregionId不正 ${l.id}`);
    else if (sub.prefectureId !== l.prefectureId) {
      errors.push(`locations: subregionが別の都道府県に属する ${l.id}`);
    }
  }
}
checkIds("subregions", subregions);
for (const s of subregions) {
  if (!prefectureIds.has(s.prefectureId)) errors.push(`subregions: prefectureId不正 ${s.id}`);
  const clip = s.mapClip;
  const okClip =
    clip === undefined ||
    (Array.isArray(clip) &&
      clip.length >= 3 &&
      clip.every((p) => Array.isArray(p) && p.length === 2 && p.every((v) => v >= 0 && v <= 1)));
  if (!okClip) errors.push(`subregions: mapClip不正 ${s.id}`);
}

const usedLocations = new Set();
const coverLocations = new Set();
for (const p of photos) {
  for (const key of ["title", "image", "thumbnail", "createdAt"]) {
    if (!p[key]) errors.push(`photos: ${key}未設定 ${p.id}`);
  }
  if (!locationIds.has(p.locationId)) errors.push(`photos: locationId不正 ${p.id}`);
  usedLocations.add(p.locationId);
  for (const t of p.tags ?? []) {
    if (!tagIds.has(t)) errors.push(`photos: tag不正 ${p.id} -> ${t}`);
  }
  if (p.characterIds !== undefined) {
    if (!Array.isArray(p.characterIds)) {
      errors.push(`photos: characterIds形式不正 ${p.id}`);
    } else {
      const assignedCharacterIds = new Set();
      for (const characterId of p.characterIds) {
        if (!characterIds.has(characterId)) {
          errors.push(`photos: characterId不正 ${p.id} -> ${characterId}`);
        }
        if (assignedCharacterIds.has(characterId)) {
          errors.push(`photos: characterIds重複 ${p.id} -> ${characterId}`);
        }
        assignedCharacterIds.add(characterId);
      }
    }
  }
  if (p.date && !/^\d{4}-\d{2}-\d{2}$/.test(p.date)) errors.push(`photos: date形式不正 ${p.id}`);
  if (
    p.photoMemory !== undefined &&
    (typeof p.photoMemory !== "string" || [...p.photoMemory].length > 120)
  ) {
    errors.push(`photos: photoMemoryが120文字を超過 ${p.id}`);
  }
  if (p.isFavorite !== undefined && p.isFavorite !== true) {
    errors.push(`photos: isFavoriteはtrueのみ ${p.id}`);
  }
  if (
    p.photoMemorySource !== undefined &&
    !["copilot", "manual"].includes(p.photoMemorySource)
  ) {
    errors.push(`photos: photoMemorySource不正 ${p.id}`);
  }
  if (p.photoMemorySource !== undefined && !p.photoMemory) {
    errors.push(`photos: photoMemorySourceに本文がありません ${p.id}`);
  }
  if (
    p.photoMemoryGeneratedAt !== undefined &&
    (typeof p.photoMemoryGeneratedAt !== "string" ||
      Number.isNaN(Date.parse(p.photoMemoryGeneratedAt)) ||
      p.photoMemorySource !== "copilot" ||
      !p.photoMemory)
  ) {
    errors.push(`photos: photoMemoryGeneratedAt不正 ${p.id}`);
  }
  if (p.photoMemorySource === "copilot" && !p.photoMemoryGeneratedAt) {
    errors.push(`photos: Copilot Memoryの生成日時未設定 ${p.id}`);
  }
  if (p.isCover !== undefined && p.isCover !== true) errors.push(`photos: isCoverはtrueのみ ${p.id}`);
  if (p.isCover) {
    if (coverLocations.has(p.locationId)) errors.push(`photos: 代表写真が複数 ${p.locationId}`);
    coverLocations.add(p.locationId);
  }
  if (Number.isNaN(Date.parse(p.createdAt))) errors.push(`photos: createdAt形式不正 ${p.id}`);
}
const sessionKeys = new Set();
for (const memory of sessionMemories) {
  if (!locationIds.has(memory.locationId)) {
    errors.push(`session-memories: locationId不正 ${memory.id}`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(memory.sessionDate)) {
    errors.push(`session-memories: sessionDate形式不正 ${memory.id}`);
  }
  if (
    typeof memory.text !== "string" ||
    !memory.text.trim() ||
    [...memory.text].length > 120
  ) {
    errors.push(`session-memories: text不正 ${memory.id}`);
  }
  if (!["template", "ai", "manual"].includes(memory.generatedBy)) {
    errors.push(`session-memories: generatedBy不正 ${memory.id}`);
  }
  if (Number.isNaN(Date.parse(memory.createdAt))) {
    errors.push(`session-memories: createdAt形式不正 ${memory.id}`);
  }
  if (Number.isNaN(Date.parse(memory.updatedAt))) {
    errors.push(`session-memories: updatedAt形式不正 ${memory.id}`);
  }
  const key = `${memory.locationId}|${memory.sessionDate}`;
  if (sessionKeys.has(key)) errors.push(`session-memories: セッション重複 ${key}`);
  sessionKeys.add(key);
}
  const reviewIds = new Set();
  for (const review of memoryLibrary) {
    if (!review.id || !ID_PATTERN.test(review.id)) {
      errors.push(`memory-library: 不正なID ${review.id}`);
    }
    if (reviewIds.has(review.id)) errors.push(`memory-library: 重複ID ${review.id}`);
    reviewIds.add(review.id);
    const memoryType =
      review.memoryType ?? (review.photoId ? "favorite" : "session");
    if (!["session", "favorite"].includes(memoryType)) {
      errors.push(`memory-library: memoryType不正 ${review.id}`);
    }
    if (!["A", "B", "C", "NG"].includes(review.rating)) {
      errors.push(`memory-library: rating不正 ${review.id}`);
    }
    if (
      typeof review.text !== "string" ||
      !review.text.trim() ||
      [...review.text].length > 120
    ) {
      errors.push(`memory-library: text不正 ${review.id}`);
    }
    if (review.memo !== undefined && (typeof review.memo !== "string" || [...review.memo].length > 500)) {
      errors.push(`memory-library: memo不正 ${review.id}`);
    }
    if (
      memoryType === "session" &&
      (typeof review.locationName !== "string" || !review.locationName.trim())
    ) {
      errors.push(`memory-library: locationName不正 ${review.id}`);
    }
    if (
      review.locationName !== undefined &&
      (typeof review.locationName !== "string" || !review.locationName.trim())
    ) {
      errors.push(`memory-library: locationName不正 ${review.id}`);
    }
    if (Number.isNaN(Date.parse(review.reviewedAt ?? review.createdAt))) {
      errors.push(`memory-library: reviewedAt形式不正 ${review.id}`);
    }
    if (
      review.createdAt !== undefined &&
      Number.isNaN(Date.parse(review.createdAt))
    ) {
      errors.push(`memory-library: createdAt形式不正 ${review.id}`);
    }
    if (memoryType === "session") {
      if (!review.sessionMemoryId || !ID_PATTERN.test(review.sessionMemoryId)) {
        errors.push(`memory-library: sessionMemoryId不正 ${review.id}`);
      }
      if (!review.locationId || !/^\d{4}-\d{2}-\d{2}$/.test(review.sessionDate)) {
        errors.push(`memory-library: セッション情報不正 ${review.id}`);
      }
    } else {
      if (!review.photoId || !ID_PATTERN.test(review.photoId)) {
        errors.push(`memory-library: photoId不正 ${review.id}`);
      }
      if (typeof review.createdAt !== "string" || Number.isNaN(Date.parse(review.createdAt))) {
        errors.push(`memory-library: createdAt形式不正 ${review.id}`);
      }
      if (review.photoTitle !== undefined && typeof review.photoTitle !== "string") {
        errors.push(`memory-library: photoTitle不正 ${review.id}`);
      }
    }
  }
  const candidateTexts = new Set();
  for (const candidate of memoryCandidates) {
    if (typeof candidate !== "string" || !candidate.trim() || [...candidate].length > 120) {
      errors.push("memory-candidates: 1〜120文字の文字列が必要です");
      continue;
    }
    if (candidateTexts.has(candidate)) errors.push(`memory-candidates: 重複候補 ${candidate}`);
    candidateTexts.add(candidate);
  }
  for (const l of locations) {
  if (!usedLocations.has(l.id)) errors.push(`locations: 孤立地点 ${l.id}`);
}

const svgIds = [...svg.matchAll(/id="pref-([a-z0-9_]+)"/g)].map((m) => m[1]);
if (new Set(svgIds).size !== svgIds.length) errors.push("svg: 重複パスID");
for (const id of svgIds) {
  if (!prefectureIds.has(id)) errors.push(`svg: 未定義の都道府県 ${id}`);
}
const grouped = new Set();
for (const r of regions) {
  if (!areaIds.has(r.id)) errors.push(`japan-map-regions: areaId不正 ${r.id}`);
  for (const id of r.prefectureIds) {
    if (!prefectureIds.has(id)) errors.push(`japan-map-regions: 都道府県不正 ${id}`);
    if (!svgIds.includes(id)) errors.push(`japan-map-regions: SVGに無い都道府県 ${id}`);
    grouped.add(id);
  }
}
for (const id of prefectureIds) {
  if (!grouped.has(id)) errors.push(`japan-map-regions: 未所属の都道府県 ${id}`);
}

if (errors.length > 0) {
  console.error(errors.join("\n"));
  console.error(`整合性エラー ${errors.length}件`);
  process.exit(1);
}
console.log("整合性エラー 0件");
