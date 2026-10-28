"use client";

import { useState } from "react";
import Breadcrumb, { type BreadcrumbItem } from "@/components/Breadcrumb";
import { withBasePath } from "@/lib/paths";
import type { Photo } from "@/types";

type Props = {
  title: string;
  description: string;
  eyebrow: string;
  photo?: Photo;
  breadcrumbs: BreadcrumbItem[];
  mobilePresentation?: boolean;
};

export default function VisualHero({
  title,
  description,
  eyebrow,
  photo,
  breadcrumbs,
  mobilePresentation = false,
}: Props) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <section
      className={`relative isolate flex min-h-[19rem] items-end overflow-hidden border border-white/10 bg-[#101923] sm:min-h-[23rem] ${
        mobilePresentation
          ? "-mx-4 min-h-[20rem] rounded-none border-x-0 md:mx-0 md:min-h-[23rem] md:rounded-2xl md:border-x"
          : "rounded-2xl"
      }`}
    >
      {photo && !imageFailed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={withBasePath(photo.image)}
          alt={photo.title}
          className="absolute inset-0 -z-20 h-full w-full object-cover"
          fetchPriority="high"
          onError={() => setImageFailed(true)}
        />
      ) : null}
      {!photo || imageFailed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={withBasePath("/maps/japan-regions.svg")}
          alt=""
          aria-hidden="true"
          className="absolute right-0 top-1/2 -z-10 h-[125%] w-[58%] -translate-y-1/2 object-contain opacity-25"
        />
      ) : null}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gradient-to-r from-[#080d16]/95 via-[#080d16]/75 to-[#080d16]/25"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gradient-to-t from-[#080d16]/80 via-transparent to-[#080d16]/20"
      />
      <div className="w-full p-5 sm:p-8 lg:p-10">
        <Breadcrumb items={breadcrumbs} inverse />
        <p className="mt-5 text-xs font-semibold tracking-[0.24em] text-sky-200 uppercase">
          {eyebrow}
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-white drop-shadow-md sm:text-5xl">
          {title}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/85 sm:text-base">
          {description}
        </p>
      </div>
      {photo ? (
        <p className="absolute bottom-3 right-4 hidden max-w-[40%] truncate rounded-full bg-black/45 px-3 py-1 text-xs text-white/80 sm:block">
          {photo.title}
        </p>
      ) : null}
    </section>
  );
}
