import Link from "next/link";
import { PhotoMemoryDisclosure } from "@/components/MemoryDisclosure";
import PhotoThumbnail from "@/components/PhotoThumbnail";
import { formatPhotoDate, getLocationName } from "@/lib/photos";
import type { Photo } from "@/types";

type Props = { photos: Photo[] };

export default function MobilePhotoRail({ photos }: Props) {
  return (
    <section aria-labelledby="mobile-recent-photos-title">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-accent uppercase">
            Recent fragments
          </p>
          <h2 id="mobile-recent-photos-title" className="mt-1 text-xl font-bold">
            最近の写真
          </h2>
        </div>
        <span className="shrink-0 text-xs text-muted">横にめくる</span>
      </div>
      {photos.length === 0 ? (
        <p className="rounded-xl border border-border bg-card p-4 text-muted">
          写真はまだありません。
        </p>
      ) : (
        <ul className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-3">
          {photos.slice(0, 8).map((photo) => (
            <li
              key={photo.id}
              className="relative w-[76vw] max-w-[20rem] shrink-0 snap-start overflow-hidden rounded-xl border border-border bg-card"
            >
              <PhotoMemoryDisclosure text={photo.photoMemory} />
              <Link href={`/photo/${photo.id}`} className="block">
                <div className="aspect-[4/3] overflow-hidden bg-background">
                  <PhotoThumbnail src={photo.thumbnail} alt={photo.title} />
                </div>
                <div className="p-3">
                  <p className="truncate font-semibold">{photo.title}</p>
                  <p className="mt-1 truncate text-sm text-muted">
                    {getLocationName(photo.locationId) ?? "場所の手がかりはありません"} ·{" "}
                    {formatPhotoDate(photo.date)}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
