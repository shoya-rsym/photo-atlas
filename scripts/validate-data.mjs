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
const regions = read("japan-map-regions");
const svg = readFileSync(new URL("../public/maps/japan-regions.svg", import.meta.url), "utf8");

const errors = [];
const ID_PATTERN = /^[a-z0-9_]+$/;

function checkIds(label, list) {
  const seen = new Set();
  for (const item of list) {
    if (!item.id || !ID_PATTERN.test(item.id)) errors.push(`${label}: 不正なID ${item.id}`);
    if (seen.has(item.id)) errors.push(`${label}: 重複ID ${item.id}`);
    seen.add(item.id);
    if (!item.name && label !== "photos") errors.push(`${label}: name未設定 ${item.id}`);
  }
  return seen;
}

const areaIds = checkIds("areas", areas);
const prefectureIds = checkIds("prefectures", prefectures);
const locationIds = checkIds("locations", locations);
const tagIds = checkIds("tags", tags);
const characterIds = checkIds("characters", characters);
checkIds("photos", photos);

for (const p of prefectures) {
  if (!areaIds.has(p.areaId)) errors.push(`prefectures: areaId不正 ${p.id}`);
}
for (const l of locations) {
  if (!prefectureIds.has(l.prefectureId)) errors.push(`locations: prefectureId不正 ${l.id}`);
}

const usedLocations = new Set();
for (const p of photos) {
  for (const key of ["title", "image", "thumbnail", "createdAt"]) {
    if (!p[key]) errors.push(`photos: ${key}未設定 ${p.id}`);
  }
  if (!locationIds.has(p.locationId)) errors.push(`photos: locationId不正 ${p.id}`);
  usedLocations.add(p.locationId);
  for (const t of p.tags ?? []) {
    if (!tagIds.has(t)) errors.push(`photos: tag不正 ${p.id} -> ${t}`);
  }
  if (p.characterId && !characterIds.has(p.characterId)) {
    errors.push(`photos: characterId不正 ${p.id}`);
  }
  if (p.date && !/^\d{4}-\d{2}-\d{2}$/.test(p.date)) errors.push(`photos: date形式不正 ${p.id}`);
  if (Number.isNaN(Date.parse(p.createdAt))) errors.push(`photos: createdAt形式不正 ${p.id}`);
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
