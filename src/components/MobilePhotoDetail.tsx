"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { TouchEvent } from "react";
import { useRef } from "react";
import Breadcrumb, { type BreadcrumbItem } from "@/components/Breadcrumb";
import PhotoTags from "@/components/PhotoTags";
import PhotoThumbnail from "@/components/PhotoThumbnail";
import { formatPhotoDate, getCharacterName } from "@/lib/photos";
import type { Photo } from "@/types";

type Props = {
  photo: Photo;
  locationId: string;
  locationName: string;
  previousId?: string;
  nextId?: string;
  breadcrumbs: BreadcrumbItem[];
};

export default function MobilePhotoDetail({
  photo,
  locationId,
  locationName,
  previousId,
  nextId,
  breadcrumbs,
}: Props) {
  const router = useRouter();
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const handleTouchEnd = (event: TouchEvent<HTMLElement>) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.3) return;
    const targetId = dx < 0 ? nextId : previousId;
    if (targetId) router.push(`/photo/${targetId}`);
  };

  return (
    <article
      aria-label="写真詳細"
      className="space-y-5 touch-pan-y md:hidden"
      onTouchStart={(event) => {
        const touch = event.touches[0];
        touchStart.current = { x: touch.clientX, y: touch.clientY };
      }}
      onTouchEnd={handleTouchEnd}
    >
      <figure className="-mx-4 overflow-hidden bg-black">
        <div className="aspect-[4/5] max-h-[78svh] overflow-hidden">
          <PhotoThumbnail src={photo.image} alt={photo.title} contain />
        </div>
        <figcaption className="flex items-center justify-between gap-3 px-4 py-3 text-sm text-white/75">
          <span>{formatPhotoDate(photo.date)}</span>
          <span className="text-xs">左右にスワイプして写真を見る</span>
        </figcaption>
      </figure>

      <section className="space-y-4">
        <h1 className="text-2xl font-black leading-tight">{photo.title}</h1>
        <div>
          <p className="text-xs font-semibold tracking-[0.16em] text-muted uppercase">
            撮影場所
          </p>
          <Link
            href={`/location/${locationId}`}
            className="mt-1 inline-block text-lg font-bold text-accent underline-offset-4 hover:underline"
          >
            {locationName} →
          </Link>
        </div>
        <div>
          <p className="mb-2 text-xs font-semibold tracking-[0.16em] text-muted uppercase">
            タグ
          </p>
          <PhotoTags tagIds={photo.tags} />
        </div>
        {photo.characterId ? (
          <p className="text-sm text-muted">
            キャラクター: {getCharacterName(photo.characterId)}
          </p>
        ) : null}
        {photo.comment ? (
          <p className="whitespace-pre-line text-sm leading-6 text-muted">
            {photo.comment}
          </p>
        ) : null}
        <Breadcrumb items={breadcrumbs} />
      </section>
    </article>
  );
}
