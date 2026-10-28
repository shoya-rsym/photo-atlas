import {
  areas,
  locations,
  photos,
  prefectures,
} from "@/lib/data";
import { sortPhotosByDate } from "@/lib/photos";
import type { Area, Location, Photo, Prefecture } from "@/types";

export type LocationStatistics = {
  photoCount: number;
  firstPhotoDate?: string;
  latestPhotoDate?: string;
};

export type Trail = {
  area?: Area;
  prefecture?: Prefecture;
  location?: Location;
};

export function findArea(id: string): Area | undefined {
  return areas.find((a) => a.id === id);
}

export function findPrefecture(id: string): Prefecture | undefined {
  return prefectures.find((p) => p.id === id);
}

export function findLocation(id: string): Location | undefined {
  return locations.find((l) => l.id === id);
}

export function findPhoto(id: string): Photo | undefined {
  return photos.find((p) => p.id === id);
}

export function getPrefecturesByArea(areaId: string): Prefecture[] {
  return prefectures.filter((p) => p.areaId === areaId);
}

export function getLocationsByPrefecture(prefectureId: string): Location[] {
  return locations.filter((l) => l.prefectureId === prefectureId);
}

/** 撮影日降順（撮影日不明は最後尾） */
export function getPhotosByLocation(locationId: string): Photo[] {
  return sortPhotosByDate(photos.filter((p) => p.locationId === locationId));
}

/** 撮影日不明は日付集計の対象外 */
export function getLocationStatistics(locationId: string): LocationStatistics {
  const list = getPhotosByLocation(locationId);
  const dates = list.flatMap((p) => (p.date ? [p.date] : [])).sort();
  return {
    photoCount: list.length,
    firstPhotoDate: dates[0],
    latestPhotoDate: dates[dates.length - 1],
  };
}

/** 地点内の写真に付いているタグID（重複なし） */
export function getTagIdsByLocation(locationId: string): string[] {
  return Array.from(
    new Set(getPhotosByLocation(locationId).flatMap((p) => p.tags)),
  );
}

export function getLocationTrail(location: Location): Trail {
  const prefecture = findPrefecture(location.prefectureId);
  const area = prefecture ? findArea(prefecture.areaId) : undefined;
  return { area, prefecture, location };
}
