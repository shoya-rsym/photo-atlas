import Link from "next/link";
import PhotoThumbnail from "@/components/PhotoThumbnail";
import type { Photo } from "@/types";

export type AreaCardItem = {
  id: string;
  name: string;
  photoCount: number;
  locationCount: number;
  photo?: Photo;
};

type Props = { areas: AreaCardItem[] };

export default function AreaCards({ areas }: Props) {
  return (
    <section aria-labelledby="area-cards-title">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-accent uppercase">
            Explore by region
          </p>
          <h2 id="area-cards-title" className="mt-1 text-2xl font-bold">
            地域から探す
          </h2>
        </div>
        <p className="hidden text-sm text-muted sm:block">
          気になる地域を選んで写真を見つけよう
        </p>
      </div>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {areas.map((area) => (
          <li key={area.id}>
            <Link
              href={`/area/${area.id}`}
              className="group relative block aspect-[4/3] overflow-hidden rounded-xl border border-border bg-card"
            >
              {area.photo ? (
                <PhotoThumbnail
                  src={area.photo.thumbnail}
                  alt={`${area.name}の代表写真`}
                />
              ) : (
                <div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-800 to-slate-950 text-sm text-muted">
                  写真を探す
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/15 to-transparent transition group-hover:from-black/95" />
              <div className="absolute inset-x-0 bottom-0 p-3 text-white sm:p-4">
                <h3 className="text-lg font-bold">{area.name}</h3>
                <p className="mt-1 text-xs text-white/80">
                  写真 {area.photoCount} 枚 · 地点 {area.locationCount} 箇所
                </p>
              </div>
              <span className="absolute right-3 top-3 rounded-full border border-white/40 bg-black/35 px-2 py-1 text-xs text-white opacity-0 transition group-hover:opacity-100">
                探索する →
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
