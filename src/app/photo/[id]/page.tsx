import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Breadcrumb from "@/components/Breadcrumb";
import PhotoTags from "@/components/PhotoTags";
import PhotoThumbnail from "@/components/PhotoThumbnail";
import { photos } from "@/lib/data";
import { formatPhotoDate, getCharacterName } from "@/lib/photos";
import {
  findLocation,
  findPhoto,
  getLocationTrail,
  getPhotosByLocation,
} from "@/lib/queries";

type Props = { params: Promise<{ id: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return photos.map((photo) => ({ id: photo.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const photo = findPhoto(id);
  if (!photo) return {};
  const title = `${photo.title} | ARフォト図鑑`;
  const description = photo.comment ?? `${photo.title}の写真詳細`;
  return {
    title,
    description,
    openGraph: { title, description, images: [photo.image] },
  };
}

const navClass =
  "rounded-lg border border-border bg-card px-4 py-2 text-center hover:border-accent";
const disabledClass =
  "rounded-lg border border-border px-4 py-2 text-center text-muted opacity-50";

export default async function PhotoPage({ params }: Props) {
  const { id } = await params;
  const photo = findPhoto(id);
  if (!photo) notFound();

  const location = findLocation(photo.locationId);
  if (!location) notFound();

  const { area, prefecture } = getLocationTrail(location);
  // 前へ／次へは撮影地点ページの一覧順に従う
  const siblings = getPhotosByLocation(location.id);
  const index = siblings.findIndex((p) => p.id === photo.id);
  const prev = index > 0 ? siblings[index - 1] : undefined;
  const next = index < siblings.length - 1 ? siblings[index + 1] : undefined;

  return (
    <>
      <Breadcrumb
        items={[
          ...(area ? [{ label: area.name, href: `/area/${area.id}` }] : []),
          ...(prefecture
            ? [{ label: prefecture.name, href: `/prefecture/${prefecture.id}` }]
            : []),
          { label: location.name, href: `/location/${location.id}` },
          { label: photo.title },
        ]}
      />

      <div className="aspect-[4/3] max-h-[75vh] w-full overflow-hidden rounded-lg border border-border bg-card">
        <PhotoThumbnail src={photo.image} alt={photo.title} contain />
      </div>

      <h1 className="mt-6 text-2xl font-bold sm:text-3xl">{photo.title}</h1>

      <dl className="mt-6 space-y-4">
        <div>
          <dt className="text-sm text-muted">撮影日</dt>
          <dd>{formatPhotoDate(photo.date)}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted">撮影場所</dt>
          <dd>
            <Link
              href={`/location/${location.id}`}
              className="text-accent hover:underline"
            >
              {location.name}
            </Link>
          </dd>
        </div>
        {photo.characterId ? (
          <div>
            <dt className="text-sm text-muted">キャラクター</dt>
            <dd>{getCharacterName(photo.characterId)}</dd>
          </div>
        ) : null}
        <div>
          <dt className="mb-1 text-sm text-muted">タグ</dt>
          <dd>
            <PhotoTags tagIds={photo.tags} />
          </dd>
        </div>
        {photo.comment ? (
          <div>
            <dt className="text-sm text-muted">コメント</dt>
            <dd className="whitespace-pre-line">{photo.comment}</dd>
          </div>
        ) : null}
      </dl>

      <nav aria-label="写真ナビゲーション" className="mt-10 grid grid-cols-3 gap-3">
        {prev ? (
          <Link href={`/photo/${prev.id}`} className={navClass}>
            前へ
          </Link>
        ) : (
          <span className={disabledClass}>前へ</span>
        )}
        <Link href={`/location/${location.id}`} className={navClass}>
          一覧へ
        </Link>
        {next ? (
          <Link href={`/photo/${next.id}`} className={navClass}>
            次へ
          </Link>
        ) : (
          <span className={disabledClass}>次へ</span>
        )}
      </nav>
    </>
  );
}
