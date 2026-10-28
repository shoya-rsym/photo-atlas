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
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {photos.map((photo, index) => (
          <li
            key={photo.id}
            className="overflow-hidden rounded-lg border border-border bg-card"
          >
            <button
              type="button"
              aria-label={`${photo.title}を拡大表示`}
              className="block aspect-[4/3] w-full"
              onClick={() => setOpenIndex(index)}
            >
              <PhotoThumbnail src={photo.thumbnail} alt={photo.title} />
            </button>
            <Link href={`/photo/${photo.id}`} className="block space-y-1 p-2 text-sm">
              <p className="truncate font-medium">{photo.title}</p>
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
