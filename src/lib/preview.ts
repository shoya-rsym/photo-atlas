import { locations, photos } from "@/lib/data";
import type { PreviewInfo } from "@/types";

/** ビルド時に候補として持つ写真の上限（ページ容量対策）。表示はこの中から3〜4枚 */
export const PREVIEW_CANDIDATE_LIMIT = 24;

/** 指定した撮影地点群のプレビュー要約を作る。地点数は写真が1枚以上ある地点のみ */
export function buildPreview(name: string, locationIds: string[]): PreviewInfo {
  const ids = new Set(locationIds);
  const list = photos
    .filter((p) => ids.has(p.locationId))
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  return {
    name,
    photoCount: list.length,
    locationCount: new Set(list.map((p) => p.locationId)).size,
    photos: list
      .slice(0, PREVIEW_CANDIDATE_LIMIT)
      .map((p) => ({ id: p.id, title: p.title, thumbnail: p.thumbnail })),
  };
}

export function locationIdsOfPrefectures(prefectureIds: string[]): string[] {
  return locations
    .filter((l) => prefectureIds.includes(l.prefectureId))
    .map((l) => l.id);
}
