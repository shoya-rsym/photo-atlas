import JapanMap from "@/components/JapanMap";
import RecentPhotos from "@/components/RecentPhotos";
import StatsPanel from "@/components/StatsPanel";
import { areas, japanMapRegions, prefectures } from "@/lib/data";
import { getRecentPhotos, getStatistics } from "@/lib/photos";

export default function HomePage() {
  const statistics = getStatistics();
  const recentPhotos = getRecentPhotos();

  return (
    <div className="space-y-10">
      <section className="text-center">
        <h1 className="text-3xl font-bold sm:text-4xl">ARフォト図鑑</h1>
        <p className="mt-2 text-muted">地図から辿る写真図鑑</p>
      </section>

      <section aria-label="統計情報">
        <StatsPanel statistics={statistics} />
      </section>

      <section aria-label="日本地図">
        <JapanMap
          regions={japanMapRegions}
          areas={areas}
          prefectures={prefectures}
        />
      </section>

      <section aria-label="最近追加した写真">
        <h2 className="mb-4 text-xl font-bold">最近追加した写真</h2>
        <RecentPhotos photos={recentPhotos} />
      </section>
    </div>
  );
}
