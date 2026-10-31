import type { Metadata } from "next";
import { notFound } from "next/navigation";
import FeaturedPhotoCard from "@/components/FeaturedPhotoCard";
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
  const title = `${area.name} | Photo Atlas`;
  const description = area.description ?? "写真に残った旅の断片を、地図から辿る。";
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
  const representativePhoto = getRepresentativePhoto(areaPhotos);
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

  const prefectureCards = (
    <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {prefectures.map((prefecture) => {
        const subs = subregions.filter((s) => s.prefectureId === prefecture.id);
        const summary = photoByPrefecture.get(prefecture.id);
        return (
          <li key={prefecture.id}>
            <LinkCard
              href={`/prefecture/${prefecture.id}`}
              title={prefecture.name}
              image={summary?.photo?.thumbnail}
              actionLabel="都道府県を辿る"
              lines={[
                `写真 ${summary?.photoCount ?? 0} 枚 · 場所 ${summary?.locationCount ?? 0} か所`,
                ...(subs.length > 0
                  ? [subs.map((subregion) => subregion.name).join("・")]
                  : []),
              ]}
            />
          </li>
        );
      })}
    </ul>
  );

  return (
    <>
      <div className="space-y-7 md:hidden">
        <VisualHero
          eyebrow="旅の断片を辿る"
          title={`${area.name}地方`}
          description={area.description ?? "写真に残った旅の断片を、地図から辿る。"}
          photo={representativePhoto}
          breadcrumbs={[{ label: area.name }]}
          mobilePresentation
        />
        <SummaryCards
          items={[
            { label: "写真", value: `${areaPhotos.length} 枚` },
            {
              label: "写真が残る場所",
              value: `${new Set(areaPhotos.map((photo) => photo.locationId)).size} か所`,
            },
            { label: "都道府県数", value: `${prefectures.length} 都道府県` },
          ]}
        />
        {representativePhoto ? (
          <FeaturedPhotoCard
            photo={representativePhoto}
            href={`/photo/${representativePhoto.id}`}
            label="この地域に残る一枚"
            title={representativePhoto.title}
            detail={area.name}
          />
        ) : null}
        <section aria-label="地域地図">
          <div className="mb-3">
            <p className="text-xs font-semibold tracking-[0.2em] text-accent uppercase">
              地図から写真を辿る
            </p>
            <h2 className="mt-1 text-xl font-bold">{area.name}の地図から写真を辿る</h2>
          </div>
          <JapanMap
            units={units}
            fit="units"
            ariaLabel={`${area.name}の地図`}
            hint="都道府県を選ぶと、そこに残る写真がひらきます。"
            variant="home"
            idPrefix="mobile"
          />
        </section>
        <section aria-labelledby="mobile-prefecture-list-title">
          <div className="mb-3">
            <p className="text-xs font-semibold tracking-[0.2em] text-accent uppercase">
              Follow the map
            </p>
            <h2 id="mobile-prefecture-list-title" className="mt-1 text-xl font-bold">
              都道府県を辿る
            </h2>
          </div>
          {prefectureCards}
        </section>
      </div>

      <div className="hidden space-y-8 sm:space-y-10 md:block">
        <VisualHero
          eyebrow="旅の断片を辿る"
          title={`${area.name}地方`}
          description={area.description ?? "写真に残った旅の断片を、地図から辿る。"}
          photo={representativePhoto}
          breadcrumbs={[{ label: area.name }]}
        />
        <SummaryCards
          items={[
            { label: "写真", value: `${areaPhotos.length} 枚` },
            {
              label: "写真が残る場所",
              value: `${new Set(areaPhotos.map((photo) => photo.locationId)).size} か所`,
            },
            { label: "都道府県数", value: `${prefectures.length} 都道府県` },
          ]}
        />

        <section aria-label="地域地図">
          <div className="mb-4">
            <p className="text-xs font-semibold tracking-[0.2em] text-accent uppercase">
              地図から写真を辿る
            </p>
            <h2 className="mt-1 text-2xl font-bold">{area.name}の地図から写真を辿る</h2>
          </div>
          <JapanMap
            units={units}
            fit="units"
            ariaLabel={`${area.name}の地図`}
            hint="都道府県にカーソルを重ねると写真がひらきます。選ぶと、その地域へ辿れます。"
            variant="home"
            idPrefix="desktop"
          />
        </section>

        <section aria-labelledby="prefecture-list-title">
          <div className="mb-4">
            <p className="text-xs font-semibold tracking-[0.2em] text-accent uppercase">
              Follow the map
            </p>
            <h2 id="prefecture-list-title" className="mt-1 text-2xl font-bold">
              都道府県を辿る
            </h2>
          </div>
          {prefectureCards}
        </section>
      </div>
    </>
  );
}
