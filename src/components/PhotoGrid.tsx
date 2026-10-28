"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import PhotoModal from "@/components/PhotoModal";
import PhotoThumbnail from "@/components/PhotoThumbnail";
import { formatPhotoDate, getLocationName } from "@/lib/photos";
import type { Photo } from "@/types";

type Props = { photos: Photo[]; showLocation?: boolean };

export default function PhotoGrid({ photos, showLocation = false }: Props) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

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

  if (photos.length === 0) {
    return <p className="text-muted">写真が登録されていません</p>;
  }

  const current = openIndex !== null ? photos[openIndex] : undefined;

  return (
    <>
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {photos.map((photo, index) => (
          <li
            key={photo.id}
            className="group overflow-hidden rounded-xl border border-border bg-card transition hover:-translate-y-0.5 hover:border-accent hover:shadow-lg hover:shadow-black/20"
          >
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
