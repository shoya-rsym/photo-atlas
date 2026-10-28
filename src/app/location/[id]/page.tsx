import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Breadcrumb from "@/components/Breadcrumb";
import FeaturedPhotoCard from "@/components/FeaturedPhotoCard";
import PhotoGrid from "@/components/PhotoGrid";
import PhotoTags from "@/components/PhotoTags";
import SummaryCards from "@/components/SummaryCards";
import VisualHero from "@/components/VisualHero";
import { locations } from "@/lib/data";
import { getRepresentativePhoto, UNKNOWN_DATE_LABEL } from "@/lib/photos";
import {
  findLocation,
  getLocationStatistics,
  getLocationTrail,
  getPhotosByLocation,
  getTagIdsByLocation,
} from "@/lib/queries";

type Props = { params: Promise<{ id: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return locations.map((location) => ({ id: location.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const location = findLocation(id);
  if (!location) return {};
  const title = `${location.name} | ARフォト図鑑`;
  const description = `${location.name}で撮影した写真一覧`;
  return { title, description, openGraph: { title, description } };
}

export default async function LocationPage({ params }: Props) {
  const { id } = await params;
  const location = findLocation(id);
  if (!location) notFound();

  const { area, prefecture } = getLocationTrail(location);
  const photos = getPhotosByLocation(location.id);
  const stats = getLocationStatistics(location.id);
  const tagIds = getTagIdsByLocation(location.id);
  const representative = getRepresentativePhoto(photos);

  return (
    <>
      <div className="space-y-6 md:hidden">
        {representative ? (
          <FeaturedPhotoCard
            photo={representative}
            href={`/photo/${representative.id}`}
            label="代表写真"
            title={representative.title}
            detail={location.name}
            titleAsText
          />
        ) : null}
        <section aria-labelledby="mobile-location-title">
          <p className="text-xs font-semibold tracking-[0.18em] text-accent uppercase">
            {[area?.name, prefecture?.name].filter(Boolean).join(" · ")}
          </p>
          <h1 id="mobile-location-title" className="mt-1 text-2xl font-black">
            {location.name}
          </h1>
          <p className="mt-2 leading-6 text-muted">
            {location.address ?? "住所未登録"}
          </p>
          <Breadcrumb
            items={[
              ...(area ? [{ label: area.name, href: `/area/${area.id}` }] : []),
              ...(prefecture
                ? [{ label: prefecture.name, href: `/prefecture/${prefecture.id}` }]
                : []),
              { label: location.name },
            ]}
          />
        </section>
        <section
          aria-labelledby="mobile-location-tags-title"
          className="rounded-2xl border border-border bg-card p-4"
        >
          <h2 id="mobile-location-tags-title" className="mb-3 text-lg font-bold">
            この場所のタグ
          </h2>
          <PhotoTags tagIds={tagIds} />
        </section>
        <SummaryCards
          items={[
            { label: "写真枚数", value: `${stats.photoCount} 枚` },
            {
              label: "初回撮影日",
              value: stats.firstPhotoDate ?? UNKNOWN_DATE_LABEL,
            },
            {
              label: "最新撮影日",
              value: stats.latestPhotoDate ?? UNKNOWN_DATE_LABEL,
            },
          ]}
        />
        <section aria-labelledby="mobile-location-photos-title">
          <div className="mb-3">
            <p className="text-xs font-semibold tracking-[0.18em] text-accent uppercase">
              Photo collection
            </p>
            <h2 id="mobile-location-photos-title" className="mt-1 text-xl font-bold">
              撮影された写真
            </h2>
          </div>
          {photos.length === 0 ? (
            <p className="rounded-xl border border-border bg-card p-6 text-muted">
              写真が登録されていません
            </p>
          ) : (
            <PhotoGrid photos={photos} />
          )}
        </section>
      </div>

      <div className="hidden space-y-8 sm:space-y-10 md:block">
        <VisualHero
          eyebrow={[area?.name, prefecture?.name].filter(Boolean).join(" · ")}
          title={location.name}
          description={`${location.address ?? "住所未登録"}。この場所で出会った写真を見てみましょう。`}
          photo={representative}
          breadcrumbs={[
            ...(area ? [{ label: area.name, href: `/area/${area.id}` }] : []),
            ...(prefecture
              ? [{ label: prefecture.name, href: `/prefecture/${prefecture.id}` }]
              : []),
            { label: location.name },
          ]}
        />
        <SummaryCards
          items={[
            { label: "総写真数", value: `${stats.photoCount} 枚` },
            { label: "初回撮影日", value: stats.firstPhotoDate ?? UNKNOWN_DATE_LABEL },
            { label: "最新撮影日", value: stats.latestPhotoDate ?? UNKNOWN_DATE_LABEL },
            { label: "関連タグ", value: `${tagIds.length} 種類` },
          ]}
        />

        <section
          aria-labelledby="location-tags-title"
          className="rounded-2xl border border-border bg-card p-5"
        >
          <p className="text-xs font-semibold tracking-[0.2em] text-accent uppercase">
            Location collection
          </p>
          <h2 id="location-tags-title" className="mb-3 mt-1 text-xl font-bold">
            この場所のタグ
          </h2>
          <PhotoTags tagIds={tagIds} />
        </section>

        <section aria-labelledby="location-photos-title">
          <div className="mb-4">
            <p className="text-xs font-semibold tracking-[0.2em] text-accent uppercase">
              Photos from this place
            </p>
            <h2 id="location-photos-title" className="mt-1 text-2xl font-bold">
              撮影された写真
            </h2>
          </div>
          {photos.length === 0 ? (
            <p className="rounded-xl border border-border bg-card p-6 text-muted">
              写真が登録されていません
            </p>
          ) : (
            <PhotoGrid photos={photos} />
          )}
        </section>
      </div>
    </>
  );
}
