"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import PhotoModal from "@/components/PhotoModal";
import { PhotoMemoryDisclosure } from "@/components/MemoryDisclosure";
import PhotoThumbnail from "@/components/PhotoThumbnail";
import { formatPhotoDate, getLocationName } from "@/lib/photos";
import type { Photo } from "@/types";

type Props = {
  photos: Photo[];
  showLocation?: boolean;
  loadOnScroll?: boolean;
};

const PHOTO_BATCH_SIZE = 40;

export default function PhotoGrid({
  photos,
  showLocation = false,
  loadOnScroll = false,
}: Props) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [visibleCount, setVisibleCount] = useState(PHOTO_BATCH_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpenIndex(null), []);
  const prev = useCallback(
    () => setOpenIndex((i) => (i !== null && i > 0 ? i - 1 : i)),
    [],
  );
  const next = useCallback(
    () =>
      setOpenIndex((i) =>
        i !== null && i < photos.length - 1 ? i + 1 : i,
      ),
    [photos.length],
  );

  useEffect(() => {
    if (!loadOnScroll || visibleCount >= photos.length) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    if (!("IntersectionObserver" in window)) {
      setVisibleCount(photos.length);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisibleCount((count) =>
            Math.min(count + PHOTO_BATCH_SIZE, photos.length),
          );
        }
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadOnScroll, photos.length, visibleCount]);

  if (photos.length === 0) {
    return <p className="text-muted">ここには、まだ写真がありません。</p>;
  }

  const visiblePhotos = loadOnScroll
    ? photos.slice(0, visibleCount)
    : photos;
  const current = openIndex !== null ? photos[openIndex] : undefined;

  return (
    <>
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {visiblePhotos.map((photo, index) => (
          <li
            key={photo.id}
            className="group overflow-hidden rounded-xl border border-border bg-card transition hover:-translate-y-0.5 hover:border-accent hover:shadow-lg hover:shadow-black/20"
          >
            <div className="relative">
              <button
                type="button"
                aria-label={`${photo.title}を拡大表示`}
                className="block aspect-[4/3] w-full overflow-hidden bg-background"
                onClick={() => setOpenIndex(index)}
              >
                <PhotoThumbnail
                  src={photo.thumbnail}
                  alt={photo.title}
                  className="transition duration-500 group-hover:scale-105"
                />
              </button>
              <PhotoMemoryDisclosure text={photo.photoMemory} />
            </div>
            <Link href={`/photo/${photo.id}`} className="block space-y-1.5 p-3 text-sm">
              <p className="truncate font-semibold">{photo.title}</p>
              <p className="truncate text-xs text-muted">
                {showLocation
                  ? `${getLocationName(photo.locationId) ?? ""} / `
                  : ""}
                {formatPhotoDate(photo.date)}
              </p>
            </Link>
          </li>
        ))}
      </ul>
      {loadOnScroll && visiblePhotos.length < photos.length ? (
        <div ref={sentinelRef} aria-hidden="true" className="h-px" />
      ) : null}
      {current && openIndex !== null ? (
        <PhotoModal
          photo={current}
          hasPrev={openIndex > 0}
          hasNext={openIndex < photos.length - 1}
          onPrev={prev}
          onNext={next}
          onClose={close}
        />
      ) : null}
    </>
  );
}
