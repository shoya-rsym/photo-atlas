"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import PhotoThumbnail from "@/components/PhotoThumbnail";
import { pickRandom } from "@/lib/random";
import type { Photo } from "@/types";

export type RecommendedSpot = {
  id: string;
  name: string;
  description: string;
  photoCount: number;
  photo: Photo;
};

type Props = { spots: RecommendedSpot[] };

export default function RecommendationSpot({ spots }: Props) {
  const [spot, setSpot] = useState<RecommendedSpot | null>(spots[0] ?? null);

  useEffect(() => {
    setSpot(pickRandom(spots, 1)[0] ?? null);
  }, [spots]);

  if (!spot) {
    return (
      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-lg font-bold">今日見つけた景色</h2>
        <p className="mt-3 text-sm text-muted">まだ写真のない場所です</p>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex items-center justify-between gap-3 p-4 pb-3">
        <h2 className="font-bold">✦ 今日見つけた景色</h2>
        {spots.length > 1 ? (
          <button
            type="button"
            className="text-xs text-accent hover:underline"
            onClick={() => {
              const choices = spots.filter((item) => item.id !== spot.id);
              setSpot(pickRandom(choices, 1)[0] ?? spot);
            }}
          >
            別の景色
          </button>
        ) : null}
      </div>
      <Link href={`/location/${spot.id}`} className="group relative block">
        <div className="aspect-[16/9] overflow-hidden">
          <PhotoThumbnail
            src={spot.photo.thumbnail}
            alt={`${spot.name}の写真`}
          />
        </div>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/55 to-transparent p-4 pt-12 text-white">
          <p className="text-lg font-bold">{spot.name}</p>
          <p className="mt-1 line-clamp-2 text-xs text-white/80">
            {spot.description}
          </p>
          <p className="mt-2 text-xs text-white/70">写真 {spot.photoCount} 枚</p>
        </div>
        <span className="absolute bottom-4 right-4 flex h-9 w-9 items-center justify-center rounded-full border border-white/70 bg-black/40 text-lg transition group-hover:bg-sky-500">
          <span aria-hidden="true">›</span>
          <span className="sr-only">{spot.name}に残る写真を辿る</span>
        </span>
      </Link>
    </section>
  );
}
