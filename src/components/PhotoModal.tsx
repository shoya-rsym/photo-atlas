"use client";

import Link from "next/link";
import { useEffect } from "react";
import { PhotoMemoryDisclosure } from "@/components/MemoryDisclosure";
import PhotoThumbnail from "@/components/PhotoThumbnail";
import { formatPhotoDate } from "@/lib/photos";
import type { Photo } from "@/types";

type Props = {
  photo: Photo;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
};

export default function PhotoModal({
  photo,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
  onClose,
}: Props) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && hasPrev) onPrev();
      if (e.key === "ArrowRight" && hasNext) onNext();
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [hasPrev, hasNext, onPrev, onNext, onClose]);

  const buttonClass =
    "rounded-lg border border-border bg-card px-4 py-2 disabled:opacity-40";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={photo.title}
      className="fixed inset-0 z-50 flex flex-col bg-black/90 p-3 sm:p-6"
      onClick={onClose}
    >
      <div className="flex justify-end">
        <button
          type="button"
          aria-label="閉じる"
          className={buttonClass}
          onClick={onClose}
        >
          ×
        </button>
      </div>
      <div
        className="relative mx-auto my-3 min-h-0 w-full max-w-5xl flex-1"
        onClick={(e) => e.stopPropagation()}
      >
        <PhotoThumbnail src={photo.image} alt={photo.title} contain />
        <PhotoMemoryDisclosure text={photo.photoMemory} />
      </div>
      <div
        className="mx-auto w-full max-w-5xl text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-center">
          <Link href={`/photo/${photo.id}`} className="underline">
            {photo.title}
          </Link>
          <span className="ml-2 text-sm text-zinc-400">
            {formatPhotoDate(photo.date)}
          </span>
        </p>
        <div className="mt-3 flex justify-between">
          <button
            type="button"
            className={buttonClass}
            disabled={!hasPrev}
            onClick={onPrev}
          >
            ← 前の写真
          </button>
          <button
            type="button"
            className={buttonClass}
            disabled={!hasNext}
            onClick={onNext}
          >
            次の写真 →
          </button>
        </div>
      </div>
    </div>
  );
}
