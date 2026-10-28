import {
  areas,
  japanMapRegions,
  locations,
  prefectures,
  subregions,
} from "@/lib/data";
import { buildPreview, locationIdsOfPrefectures } from "@/lib/preview";
import type { MapUnit } from "@/types";

function prefectureName(id: string): string {
  return prefectures.find((p) => p.id === id)?.name ?? id;
}

/** TOP用: 地域単位 */
export function getAreaUnits(): MapUnit[] {
  return japanMapRegions.flatMap((region) => {
    const area = areas.find((a) => a.id === region.id);
    if (!area) return [];
    return [
      {
        id: area.id,
        name: area.name,
        href: `/area/${area.id}`,
        prefectureIds: region.prefectureIds,
        members: region.prefectureIds.map(prefectureName),
        preview: buildPreview(
          area.name,
          locationIdsOfPrefectures(region.prefectureIds),
        ),
      },
    ];
  });
}

/**
 * 地域ページ用: 都道府県単位。
 * サブ地域を持つ都道府県は、サブ地域ごとの描画単位に展開する
 */
export function getPrefectureUnits(areaId: string): MapUnit[] {
  return prefectures
    .filter((p) => p.areaId === areaId)
    .flatMap((prefecture): MapUnit[] => {
      const subs = subregions.filter((s) => s.prefectureId === prefecture.id);
      if (subs.length === 0) {
        return [
          {
            id: prefecture.id,
            name: prefecture.name,
            href: `/prefecture/${prefecture.id}`,
            prefectureIds: [prefecture.id],
            members: [],
            preview: buildPreview(
              prefecture.name,
              locationIdsOfPrefectures([prefecture.id]),
            ),
          },
        ];
      }
      return subs.map((sub) => ({
        id: sub.id,
        name: `${prefecture.name} ${sub.name}`,
        href: `/prefecture/${prefecture.id}#${sub.id}`,
        prefectureIds: [prefecture.id],
        clip: sub.mapClip,
        members: [],
        preview: buildPreview(
          `${prefecture.name} ${sub.name}`,
          locations.filter((l) => l.subregionId === sub.id).map((l) => l.id),
        ),
      }));
    });
}
