"use client";

import { useState } from "react";
import { withBasePath } from "@/lib/paths";

type Props = {
  src: string;
  alt: string;
  contain?: boolean;
  className?: string;
};

export default function PhotoThumbnail({
  src,
  alt,
  contain = false,
  className = "",
}: Props) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-gradient-to-br from-slate-800 via-slate-900 to-[#09090b] text-xs text-white/55">
        <span
          aria-hidden="true"
          className="absolute inset-0 opacity-20 [background-image:linear-gradient(30deg,transparent_49%,rgba(125,211,252,0.2)_50%,transparent_51%),linear-gradient(150deg,transparent_49%,rgba(125,211,252,0.14)_50%,transparent_51%)] [background-size:50px_50px]"
        />
        <span className="relative rounded-full border border-white/15 bg-black/30 px-3 py-1">
          写真を準備中
        </span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={withBasePath(src)}
      alt={alt}
      loading="lazy"
      className={`h-full w-full ${contain ? "object-contain" : "object-cover"} ${className}`}
      onError={() => setFailed(true)}
    />
  );
}
