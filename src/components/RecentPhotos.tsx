import Link from "next/link";
import { PhotoMemoryDisclosure } from "@/components/MemoryDisclosure";
import PhotoThumbnail from "@/components/PhotoThumbnail";
import {
  formatPhotoDate,
  getCharacterNames,
  getLocationName,
  getTagName,
} from "@/lib/photos";
import type { Photo } from "@/types";

type Props = { photos: Photo[]; compact?: boolean };

export default function RecentPhotos({ photos, compact = false }: Props) {
  if (photos.length === 0) {
    return <p className="text-muted">写真はまだありません。</p>;
  }

  return (
    <ul
      className={`grid grid-cols-2 gap-3 ${compact ? "" : "sm:grid-cols-3 lg:grid-cols-5"}`}
    >
      {photos.map((photo) => (
        <li
          key={photo.id}
          className="relative overflow-hidden rounded-lg border border-border bg-card"
        >
          <PhotoMemoryDisclosure text={photo.photoMemory} />
          <Link href={`/photo/${photo.id}`} className="block">
            <div className="aspect-[4/3] w-full">
              <PhotoThumbnail src={photo.thumbnail} alt={photo.title} />
            </div>
            <div className="space-y-1 p-2 text-sm">
              <p className="truncate font-medium">{photo.title}</p>
              <p className="truncate text-xs text-muted">
                {getLocationName(photo.locationId)} /{" "}
                {formatPhotoDate(photo.date)}
              </p>
              {photo.characterIds?.length ? (
                <p className="truncate text-xs text-muted">
                  {getCharacterNames(photo.characterIds).join("、")}
                </p>
              ) : null}
              <p className="flex flex-wrap gap-1">
                {photo.tags.map((tagId) => (
                  <span
                    key={tagId}
                    className="rounded border border-border px-1.5 py-0.5 text-xs text-muted"
                  >
                    {getTagName(tagId)}
                  </span>
                ))}
              </p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
