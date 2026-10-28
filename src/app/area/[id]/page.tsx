import type { Metadata } from "next";
import { notFound } from "next/navigation";
import JapanMap from "@/components/JapanMap";
import LinkCard from "@/components/LinkCard";
import SummaryCards from "@/components/SummaryCards";
import VisualHero from "@/components/VisualHero";
import { areas, locations, photos, subregions } from "@/lib/data";
import { getPrefectureUnits } from "@/lib/mapUnits";
import { getRepresentativePhoto } from "@/lib/photos";
import { findArea, getPrefecturesByArea } from "@/lib/queries";

type Props = { params: Promise<{ id: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return areas.map((area) => ({ id: area.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const area = findArea(id);
  if (!area) return {};
  const title = `${area.name} | ARフォト図鑑`;
  const description = area.description ?? `${area.name}の都道府県一覧`;
  return { title, description, openGraph: { title, description } };
}

export default async function AreaPage({ params }: Props) {
  const { id } = await params;
  const area = findArea(id);
  if (!area) notFound();

  const prefectures = getPrefecturesByArea(area.id);
  const units = getPrefectureUnits(area.id);
  const prefectureIds = new Set(prefectures.map((prefecture) => prefecture.id));
  const areaLocationIds = new Set(
    locations
      .filter((location) => prefectureIds.has(location.prefectureId))
      .map((location) => location.id),
  );
  const areaPhotos = photos.filter((photo) => areaLocationIds.has(photo.locationId));
  const photoByPrefecture = new Map(
    prefectures.map((prefecture) => {
      const prefectureLocations = new Set(
        locations
          .filter((location) => location.prefectureId === prefecture.id)
          .map((location) => location.id),
      );
      const prefecturePhotos = photos.filter((photo) =>
        prefectureLocations.has(photo.locationId),
      );
      return [
        prefecture.id,
        {
          photo: getRepresentativePhoto(prefecturePhotos),
          photoCount: prefecturePhotos.length,
          locationCount: new Set(prefecturePhotos.map((photo) => photo.locationId)).size,
        },
      ] as const;
    }),
  );

  return (
    <div className="space-y-8 sm:space-y-10">
      <VisualHero
        eyebrow="Explore the region"
        title={`${area.name}地方`}
        description={area.description ?? `${area.name}の風景と写真を地図から探索しましょう。`}
        photo={getRepresentativePhoto(areaPhotos)}
        breadcrumbs={[{ label: area.name }]}
      />
      <SummaryCards
        items={[
          { label: "写真数", value: `${areaPhotos.length} 枚` },
          {
            label: "撮影地点数",
            value: `${new Set(areaPhotos.map((photo) => photo.locationId)).size} 箇所`,
          },
          { label: "都道府県数", value: `${prefectures.length} 都道府県` },
        ]}
      />

      <section aria-label="地域地図">
        <div className="mb-4">
          <p className="text-xs font-semibold tracking-[0.2em] text-accent uppercase">
            Explore on the map
          </p>
          <h2 className="mt-1 text-2xl font-bold">{area.name}の地図</h2>
        </div>
        <JapanMap
          units={units}
          fit="units"
          ariaLabel={`${area.name}の地図`}
          hint="地図の都道府県にカーソルを合わせる（スマホはタップ）と、写真のプレビューが表示されます。"
          variant="home"
        />
      </section>

      <section aria-labelledby="prefecture-list-title">
        <div className="mb-4">
          <p className="text-xs font-semibold tracking-[0.2em] text-accent uppercase">
            Choose a prefecture
          </p>
          <h2 id="prefecture-list-title" className="mt-1 text-2xl font-bold">
            都道府県を探す
          </h2>
        </div>
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {prefectures.map((prefecture) => {
            const subs = subregions.filter((s) => s.prefectureId === prefecture.id);
            const summary = photoByPrefecture.get(prefecture.id);
            return (
              <li key={prefecture.id}>
                <LinkCard
                  href={`/prefecture/${prefecture.id}`}
                  title={prefecture.name}
                  image={summary?.photo?.thumbnail}
                  actionLabel="都道府県を探索"
                  lines={[
                    `写真 ${summary?.photoCount ?? 0} 枚 · 地点 ${summary?.locationCount ?? 0} 箇所`,
                    ...(subs.length > 0
                      ? [subs.map((subregion) => subregion.name).join("・")]
                      : []),
                  ]}
                />
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
