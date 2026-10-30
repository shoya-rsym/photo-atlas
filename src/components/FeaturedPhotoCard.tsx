import Link from "next/link";
import { PhotoMemoryDisclosure } from "@/components/MemoryDisclosure";
import PhotoThumbnail from "@/components/PhotoThumbnail";
import type { Photo } from "@/types";

type Props = {
  photo: Photo;
  href: string;
  label: string;
  title: string;
  detail?: string;
  titleAsText?: boolean;
};

export default function FeaturedPhotoCard({
  photo,
  href,
  label,
  title,
  detail,
  titleAsText = false,
}: Props) {
  return (
    <section aria-label={label} className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="px-4 pt-4">
        <p className="text-xs font-semibold tracking-[0.18em] text-accent uppercase">
          {label}
        </p>
      </div>
      <div className="relative mt-3">
        <Link href={href} className="block">
          <div className="aspect-[16/10] w-full overflow-hidden bg-background">
            <PhotoThumbnail src={photo.thumbnail} alt={photo.title} />
          </div>
          <div className="p-4">
            {titleAsText ? (
              <p className="text-lg font-bold">{title}</p>
            ) : (
              <h2 className="text-lg font-bold">{title}</h2>
            )}
            {detail ? <p className="mt-1 text-sm text-muted">{detail}</p> : null}
          </div>
        </Link>
        <PhotoMemoryDisclosure text={photo.photoMemory} />
      </div>
    </section>
  );
}
