import { characters, locations, prefectures, tags } from "@/lib/data";
import { getCharacterName, getTagName } from "@/lib/photos";
import type { Photo } from "@/types";

export type SearchFilters = {
  keyword: string;
  tagId: string;
  characterId: string;
  year: string;
  prefectureId: string;
};

export const EMPTY_FILTERS: SearchFilters = {
  keyword: "",
  tagId: "",
  characterId: "",
  year: "",
  prefectureId: "",
};

export function getPhotoPrefectureId(photo: Photo): string | undefined {
  return locations.find((l) => l.id === photo.locationId)?.prefectureId;
}

/** 写真が存在する撮影年（降順） */
export function getYearOptions(photos: Photo[]): string[] {
  const years = new Set<string>();
  for (const photo of photos) {
    if (photo.date) years.add(photo.date.slice(0, 4));
  }
  return Array.from(years).sort().reverse();
}

export function getTagOptions() {
  return tags.map((tag) => ({ id: tag.id, name: tag.name }));
}

export function getCharacterOptions() {
  return characters.map((character) => ({
    id: character.id,
    name: character.name,
  }));
}

export function getPrefectureOptions() {
  return prefectures.map((p) => ({ id: p.id, name: p.name }));
}

/** タイトル・タグ名・コメント・撮影地点名を対象にした部分一致 + フィルター */
export function searchPhotos(photos: Photo[], filters: SearchFilters): Photo[] {
  const keyword = filters.keyword.trim().toLowerCase();
  return photos.filter((photo) => {
    if (filters.tagId && !photo.tags.includes(filters.tagId)) return false;
    if (filters.characterId && photo.characterId !== filters.characterId) {
      return false;
    }
    if (filters.year && photo.date?.slice(0, 4) !== filters.year) return false;
    if (
      filters.prefectureId &&
      getPhotoPrefectureId(photo) !== filters.prefectureId
    ) {
      return false;
    }
    if (!keyword) return true;
    const location = locations.find((l) => l.id === photo.locationId);
    const haystack = [
      photo.title,
      photo.comment ?? "",
      location?.name ?? "",
      ...(photo.characterId ? [getCharacterName(photo.characterId)] : []),
      ...photo.tags.map(getTagName),
    ]
      .join("\n")
      .toLowerCase();
    return haystack.includes(keyword);
  });
}
