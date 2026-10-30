"use client";

import Link from "next/link";
import { useState } from "react";
import { withBasePath } from "@/lib/paths";
import type { Photo } from "@/types";

type Props = {
  photo?: Photo;
  locationName?: string;
  mobilePresentation?: boolean;
};

export default function HomeHero({
  photo,
  locationName,
  mobilePresentation = false,
}: Props) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <section
      className={`relative isolate flex min-h-[25rem] items-end overflow-hidden border border-border bg-[#111827] sm:min-h-[30rem] ${
        mobilePresentation
          ? "-mx-4 min-h-[30rem] rounded-none border-x-0 md:mx-0 md:rounded-2xl md:border-x"
          : "rounded-2xl"
      }`}
    >
      {photo && !imageFailed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={withBasePath(photo.image)}
          alt={photo.title}
          fetchPriority="high"
          className="absolute inset-0 -z-20 h-full w-full object-cover"
          onError={() => setImageFailed(true)}
        />
      ) : null}
      {!photo || imageFailed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={withBasePath("/maps/japan-regions.svg")}
          alt=""
          aria-hidden="true"
          className="absolute right-0 top-1/2 -z-10 h-[125%] w-[62%] -translate-y-1/2 object-contain opacity-25 sm:opacity-35"
        />
      ) : null}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_72%_22%,rgba(56,189,248,0.24),transparent_35%),linear-gradient(110deg,#09090b_3%,rgba(9,9,11,0.86)_42%,rgba(9,9,11,0.18)_100%)]"
      />
      {photo && !imageFailed ? (
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-gradient-to-t from-black/75 via-black/10 to-black/20"
        />
      ) : (
        <div
          aria-hidden="true"
          className="absolute inset-y-0 right-0 -z-10 w-2/3 opacity-60 [background-image:linear-gradient(30deg,transparent_49%,rgba(125,211,252,0.16)_50%,transparent_51%),linear-gradient(150deg,transparent_49%,rgba(125,211,252,0.14)_50%,transparent_51%)] [background-size:70px_70px]"
        />
      )}
      <div className="max-w-3xl p-6 sm:p-10 lg:p-14">
        <p className="mb-3 text-xs font-semibold tracking-[0.3em] text-sky-200 uppercase">
          Discover Japan through photos
        </p>
        <h1 className="text-4xl font-black tracking-tight text-white drop-shadow-lg sm:text-6xl lg:text-7xl">
          Photo Atlas
        </h1>
        <p className="mt-3 text-xl font-semibold text-white sm:text-2xl">
          地図から辿る写真館
        </p>
        <p className="mt-3 max-w-xl text-sm leading-6 text-white/85 sm:text-base sm:leading-7">
          写真に残った旅の断片を巡ろう
        </p>
        <Link
          href={mobilePresentation ? "#explore" : "#desktop-explore"}
          className="mt-7 inline-flex items-center gap-2 rounded-full bg-sky-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-sky-950/30 transition hover:bg-sky-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          地図から辿る <span aria-hidden="true">→</span>
        </Link>
      </div>
      {photo ? (
        <Link
          href={`/photo/${photo.id}`}
          className="absolute bottom-4 right-4 hidden max-w-xs rounded-lg border border-white/20 bg-black/50 px-4 py-3 text-right text-white backdrop-blur-sm sm:block"
        >
          <span className="block text-xs text-white/70">この場所に残る一枚</span>
          <span className="mt-1 block font-semibold">{locationName ?? photo.title}</span>
        </Link>
      ) : null}
    </section>
  );
}
