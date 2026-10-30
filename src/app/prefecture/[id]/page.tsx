import type { Metadata } from "next";
import { notFound } from "next/navigation";
import FeaturedPhotoCard from "@/components/FeaturedPhotoCard";
import LinkCard from "@/components/LinkCard";
import PrefectureMap from "@/components/PrefectureMap";
import SummaryCards from "@/components/SummaryCards";
import VisualHero from "@/components/VisualHero";
import { photos, prefectures, subregions } from "@/lib/data";
import { buildPreview } from "@/lib/preview";
import { getRepresentativePhoto } from "@/lib/photos";
import {
  findArea,
  findPrefecture,
  getLocationStatistics,
  getLocationsByPrefecture,
} from "@/lib/queries";

type Props = { params: Promise<{ id: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return prefectures.map((prefecture) => ({ id: prefecture.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const prefecture = findPrefecture(id);
  if (!prefecture) return {};
  const title = `${prefecture.name} | Photo Atlas`;
  const description = `${prefecture.name}に残る写真を、地図から辿る。`;
  return { title, description, openGraph: { title, description } };
}

export default async function PrefecturePage({ params }: Props) {
  const { id } = await params;
  const prefecture = findPrefecture(id);
  if (!prefecture) notFound();

  const area = findArea(prefecture.areaId);
  const locations = getLocationsByPrefecture(prefecture.id);
  const recommendedLocation = locations
    .flatMap((location) => {
      const photo = getRepresentativePhoto(
        photos.filter((item) => item.locationId === location.id),
      );
      return photo
        ? [
            {
              location,
              photo,
              photoCount: getLocationStatistics(location.id).photoCount,
            },
          ]
        : [];
    })
    .sort((a, b) => b.photoCount - a.photoCount)[0];
  const prefectureLocationIds = new Set(locations.map((location) => location.id));
  const prefecturePhotos = photos.filter((photo) =>
    prefectureLocationIds.has(photo.locationId),
  );
  const locationsWithPhotos = new Set(
    prefecturePhotos.map((photo) => photo.locationId),
  ).size;
  const heroPhoto = getRepresentativePhoto(prefecturePhotos);
  const previews = locations.map((location) => ({
    location,
    preview: buildPreview(location.name, [location.id]),
  }));
  const prefectureSubregions = subregions.filter(
    (s) => s.prefectureId === prefecture.id,
  );
  const groups =
    prefectureSubregions.length === 0
      ? [{ id: "", name: "", items: locations }]
      : [
          ...prefectureSubregions.map((s) => ({
            id: s.id,
            name: s.name,
            items: locations.filter((l) => l.subregionId === s.id),
          })),
          {
            id: "other",
            name: "その他",
            items: locations.filter(
              (l) => !prefectureSubregions.some((s) => s.id === l.subregionId),
            ),
          },
        ].filter((g) => g.id !== "other" || g.items.length > 0);

  const renderLocation = (location: (typeof locations)[number]) => {
    const stats = getLocationStatistics(location.id);
    const locationPhotos = photos.filter(
      (photo) => photo.locationId === location.id,
    );
    return (
      <li key={location.id}>
        <LinkCard
          href={`/location/${location.id}`}
          title={location.name}
          image={getRepresentativePhoto(locationPhotos)?.thumbnail}
          actionLabel="場所を巡る"
          lines={[
            `写真 ${stats.photoCount} 枚`,
            `新しい記録 ${stats.latestPhotoDate ?? "撮影日不明"}`,
          ]}
        />
      </li>
    );
  };

  return (
    <div className="space-y-7 sm:space-y-10">
      <VisualHero
        eyebrow={area?.name ?? "Explore the prefecture"}
        title={prefecture.name}
        description={`${prefecture.name}に残る写真を、地図から辿る。`}
        photo={heroPhoto}
        breadcrumbs={[
          ...(area ? [{ label: area.name, href: `/area/${area.id}` }] : []),
          { label: prefecture.name },
        ]}
        mobilePresentation
      />
      <SummaryCards
        items={[
          { label: "写真", value: `${prefecturePhotos.length} 枚` },
          { label: "写真が残る場所", value: `${locationsWithPhotos} か所` },
          { label: "地域", value: area?.name ?? "日本" },
        ]}
      />
      {recommendedLocation ? (
        <div className="md:hidden">
          <FeaturedPhotoCard
            photo={recommendedLocation.photo}
            href={`/location/${recommendedLocation.location.id}`}
            label="今日見つけた景色"
            title={recommendedLocation.location.name}
            detail={`写真 ${recommendedLocation.photoCount} 枚 · ${prefecture.name}`}
          />
        </div>
      ) : null}

      <section
        aria-label="地図と写真が残る場所"
        className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]"
      >
        <div className="order-2 md:order-1">
          <div className="mb-4">
            <p className="text-xs font-semibold tracking-[0.2em] text-accent uppercase">
              Places on the map
            </p>
            <h2 className="mt-1 text-xl font-bold md:text-2xl">{prefecture.name}の地図</h2>
          </div>
          <PrefectureMap items={previews} />
        </div>

        <div className="order-1 md:order-2">
          <div className="mb-4">
            <p className="text-xs font-semibold tracking-[0.2em] text-accent uppercase">
              Where photos remain
            </p>
            <h2 className="mt-1 text-xl font-bold md:text-2xl">
              <span>写真が残された場所</span>
            </h2>
          </div>
          {locations.length === 0 ? (
            <p className="rounded-xl border border-border bg-card p-5 text-muted">
              まだ写真のない場所です
            </p>
          ) : (
            <div className="space-y-6 md:max-h-[34rem] md:overflow-y-auto md:pr-1">
              {groups.map((group) => (
                <section
                  key={group.id}
                  id={group.id || undefined}
                  className="scroll-mt-20"
                >
                  {group.name ? (
                    <h3 className="mb-3 text-lg font-bold">{group.name}</h3>
                  ) : null}
                  {group.items.length === 0 ? (
                    <p className="text-sm text-muted">まだ写真が残された場所はありません</p>
                  ) : (
                    <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      {group.items.map(renderLocation)}
                    </ul>
                  )}
                </section>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
