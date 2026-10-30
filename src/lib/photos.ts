import {
  characters,
  locations,
  photos as allPhotos,
  tags,
} from "@/lib/data";
import type { Photo, Statistics } from "@/types";

export const UNKNOWN_DATE_LABEL = "撮影日不明";
export const UNKNOWN_TAG_LABEL = "不明タグ";
export const UNKNOWN_CHARACTER_LABEL = "不明キャラクター";
export const RECENT_PHOTO_COUNT = 10;

/** 撮影日降順。撮影日不明は最後尾 */
export function sortPhotosByDate(list: Photo[]): Photo[] {
  return [...list].sort((a, b) => {
    if (a.date && b.date) return b.date.localeCompare(a.date);
    if (a.date) return -1;
    if (b.date) return 1;
    return 0;
  });
}

/** createdAt 降順で先頭 limit 件 */
export function getRecentPhotos(limit: number = RECENT_PHOTO_COUNT): Photo[] {
  return [...allPhotos]
    .sort(
      (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
    )
    .slice(0, limit);
}

/** 代表写真があれば優先し、なければ登録日時が新しい写真を返す */
export function getRepresentativePhoto(list: Photo[]): Photo | undefined {
  return [...list].sort(
    (a, b) =>
      Number(Boolean(b.isCover)) - Number(Boolean(a.isCover)) ||
      Date.parse(b.createdAt) - Date.parse(a.createdAt),
  )[0];
}

export function getStatistics(): Statistics {
  const locationIds = new Set(allPhotos.map((photo) => photo.locationId));
  const prefectureIds = new Set<string>();
  for (const location of locations) {
    if (locationIds.has(location.id)) prefectureIds.add(location.prefectureId);
  }
  return {
    photoCount: allPhotos.length,
    locationCount: locations.filter((l) => locationIds.has(l.id)).length,
    prefectureCount: prefectureIds.size,
  };
}

export function formatPhotoDate(date?: string): string {
  return date ? date : UNKNOWN_DATE_LABEL;
}

export function getTagName(tagId: string): string {
  return tags.find((tag) => tag.id === tagId)?.name ?? UNKNOWN_TAG_LABEL;
}

export function getCharacterName(characterId: string): string {
  return (
    characters.find((c) => c.id === characterId)?.name ??
    UNKNOWN_CHARACTER_LABEL
  );
}

export function getCharacterNames(characterIds?: string[]): string[] {
  return (characterIds ?? []).map(getCharacterName);
}

export function getLocationName(locationId: string): string | undefined {
  return locations.find((l) => l.id === locationId)?.name;
}
