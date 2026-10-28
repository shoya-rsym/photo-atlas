import AreaCards from "@/components/AreaCards";
import HomeHero from "@/components/HomeHero";
import JapanMap from "@/components/JapanMap";
import PopularTags from "@/components/PopularTags";
import RecentPhotos from "@/components/RecentPhotos";
import RecommendationSpot from "@/components/RecommendationSpot";
import StatsPanel from "@/components/StatsPanel";
import { areas, characters, japanMapRegions, locations, photos, tags } from "@/lib/data";
import { getAreaUnits } from "@/lib/mapUnits";
import { getRecentPhotos, getStatistics } from "@/lib/photos";
import type { Photo } from "@/types";

function newestFirst(left: Photo, right: Photo): number {
  return Date.parse(right.createdAt) - Date.parse(left.createdAt);
}

export default function HomePage() {
  const statistics = getStatistics();
  const recentPhotos = getRecentPhotos(6);
  const heroPhoto =
    [...photos].sort(
      (a, b) => Number(Boolean(b.isCover)) - Number(Boolean(a.isCover)) || newestFirst(a, b),
    )[0];
  const heroLocation = locations.find((location) => location.id === heroPhoto?.locationId);

  const recommendationSpots = locations.flatMap((location) => {
    const locationPhotos = photos
      .filter((photo) => photo.locationId === location.id)
      .sort(newestFirst);
    if (locationPhotos.length === 0) return [];
    const photo =
      locationPhotos.find((item) => item.isCover) ?? locationPhotos[0];
    const characterName = photo.characterId
      ? characters.find((character) => character.id === photo.characterId)?.name
      : undefined;
    return [
      {
        id: location.id,
        name: location.name,
        photoCount: locationPhotos.length,
        photo,
        description: characterName
          ? `${characterName}と出会った、この場所の一枚を見てみましょう。`
          : `${photo.title} — この場所で撮影された写真を見てみましょう。`,
      },
    ];
  });

  const areaCards = areas.map((area) => {
    const prefectureIds =
      japanMapRegions.find((region) => region.id === area.id)?.prefectureIds ?? [];
    const locationIds = new Set(
      locations
        .filter((location) => prefectureIds.includes(location.prefectureId))
        .map((location) => location.id),
    );
    const areaPhotos = photos
      .filter((photo) => locationIds.has(photo.locationId))
      .sort(newestFirst);
    const photo =
      areaPhotos.find((item) => item.isCover) ?? areaPhotos[0];
    return {
      id: area.id,
      name: area.name,
      photoCount: areaPhotos.length,
      locationCount: new Set(areaPhotos.map((item) => item.locationId)).size,
      photo,
    };
  });

  const popularTags = tags
    .map((tag) => ({
      ...tag,
      count: photos.filter((photo) => photo.tags.includes(tag.id)).length,
    }))
    .filter((tag) => tag.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  return (
    <div className="space-y-8 sm:space-y-10">
      <HomeHero photo={heroPhoto} locationName={heroLocation?.name} />

      <section aria-label="図鑑の統計情報">
        <StatsPanel statistics={statistics} />
      </section>

      <section
        id="explore"
        aria-label="地図と写真から探索"
        className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.8fr)]"
      >
        <div className="min-w-0">
          <div className="mb-4">
            <p className="text-xs font-semibold tracking-[0.2em] text-accent uppercase">
              Map of Japan
            </p>
            <h2 className="mt-1 text-2xl font-bold">日本地図から探す</h2>
          </div>
          <JapanMap
            units={getAreaUnits()}
            ariaLabel="日本地図"
            variant="home"
          />
        </div>

        <aside className="space-y-4">
          <RecommendationSpot spots={recommendationSpots} />
          <section aria-labelledby="recent-title" className="rounded-2xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 id="recent-title" className="font-bold">
                最近追加された写真
              </h2>
              <span className="text-xs text-muted">新着</span>
            </div>
            <RecentPhotos photos={recentPhotos} compact />
          </section>
          <PopularTags tags={popularTags} />
        </aside>
      </section>

      <AreaCards areas={areaCards} />
    </div>
  );
}
