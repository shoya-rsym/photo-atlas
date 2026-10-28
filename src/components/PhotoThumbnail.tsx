"use client";

import { useState } from "react";
import { withBasePath } from "@/lib/paths";

type Props = { src: string; alt: string; contain?: boolean };

export default function PhotoThumbnail({ src, alt, contain = false }: Props) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-border text-sm text-muted">
        No Image
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={withBasePath(src)}
      alt={alt}
      loading="lazy"
      className={`h-full w-full ${contain ? "object-contain" : "object-cover"}`}
      onError={() => setFailed(true)}
    />
  );
}
