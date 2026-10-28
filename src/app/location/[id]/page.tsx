import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Breadcrumb from "@/components/Breadcrumb";
import PhotoGrid from "@/components/PhotoGrid";
import PhotoTags from "@/components/PhotoTags";
import { locations } from "@/lib/data";
import { UNKNOWN_DATE_LABEL } from "@/lib/photos";
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

  return (
    <>
      <Breadcrumb
        items={[
          ...(area ? [{ label: area.name, href: `/area/${area.id}` }] : []),
          ...(prefecture
            ? [{ label: prefecture.name, href: `/prefecture/${prefecture.id}` }]
            : []),
          { label: location.name },
        ]}
      />
      <h1 className="text-3xl font-bold">{location.name}</h1>

      {photos.length === 0 ? (
        <p className="mt-6 text-muted">写真が登録されていません</p>
      ) : (
        <>
          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-muted">住所</dt>
              <dd>{location.address ?? "住所未登録"}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted">総写真数</dt>
              <dd>{stats.photoCount}枚</dd>
            </div>
            <div>
              <dt className="text-sm text-muted">初回撮影日</dt>
              <dd>{stats.firstPhotoDate ?? UNKNOWN_DATE_LABEL}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted">最新撮影日</dt>
              <dd>{stats.latestPhotoDate ?? UNKNOWN_DATE_LABEL}</dd>
            </div>
          </dl>

          <h2 className="mb-3 mt-10 text-xl font-bold">タグ</h2>
          <PhotoTags tagIds={tagIds} />

          <h2 className="mb-4 mt-10 text-xl font-bold">写真一覧</h2>
          <PhotoGrid photos={photos} />
        </>
      )}
    </>
  );
}
