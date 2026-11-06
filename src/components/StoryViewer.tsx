"use client";

import { useEffect, useRef, useState } from "react";
import PhotoThumbnail from "@/components/PhotoThumbnail";
import { formatPhotoDate } from "@/lib/photos";
import type { Photo } from "@/types";

type StoryPhoto = Pick<Photo, "id" | "title" | "image" | "date">;

type Props = {
  story: string;
  locationName: string;
  sessionDate: string;
  photos: StoryPhoto[];
  onClose: () => void;
};

const SLIDE_INTERVAL_MS = 7000;

export default function StoryViewer({
  story,
  locationName,
  sessionDate,
  photos,
  onClose,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  const [activeIndex, setActiveIndex] = useState(0);
  const [autoplayReset, setAutoplayReset] = useState(0);
  const photo = photos[activeIndex];
  onCloseRef.current = onClose;
  const firstIndicator = Math.max(
    0,
    Math.min(activeIndex - 4, photos.length - 9),
  );
  const indicatorIndexes = photos
    .map((_, index) => index)
    .slice(firstIndicator, firstIndicator + 9);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    return () => {
      if (dialog.open) dialog.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, []);

  useEffect(() => {
    if (photos.length < 2) return;
    const timer = window.setInterval(() => {
      setActiveIndex((index) => (index + 1) % photos.length);
    }, SLIDE_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [autoplayReset, photos.length]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onCloseRef.current();
    };
    window.addEventListener("keydown", handleEscape, true);
    return () => window.removeEventListener("keydown", handleEscape, true);
  }, []);

  const moveTo = (index: number) => {
    if (photos.length === 0) return;
    setActiveIndex((index + photos.length) % photos.length);
    setAutoplayReset((value) => value + 1);
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="story-viewer-title"
      className="story-viewer fixed inset-0 m-0 h-dvh w-screen max-h-none max-w-none border-0 bg-zinc-950 p-0 text-white backdrop:bg-black/85"
      style={{ margin: 0 }}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          moveTo(activeIndex - 1);
        } else if (event.key === "ArrowRight") {
          event.preventDefault();
          moveTo(activeIndex + 1);
        }
      }}
    >
      <div className="story-viewer-layout">
        <section
          aria-label="Storyに関連する写真"
          className="story-viewer-photo relative flex min-h-0 flex-col items-center justify-center bg-black"
        >
          {photo ? (
            <PhotoThumbnail
              key={photo.id}
              src={photo.image}
              alt={photo.title}
              contain
              className="story-viewer-image"
            />
          ) : (
            <p className="p-6 text-center text-sm text-zinc-300">
              この場所には、まだ写真がありません。
            </p>
          )}
          {photo ? (
            <div className="story-viewer-photo-controls">
              <button
                type="button"
                aria-label="前の写真"
                disabled={photos.length < 2}
                onClick={() => moveTo(activeIndex - 1)}
              >
                ←
              </button>
              <div className="story-viewer-indicators" aria-label="写真を選択">
                {indicatorIndexes.map((index) => {
                  const item = photos[index];
                  return (
                  <button
                    key={item.id}
                    type="button"
                    aria-label={`${index + 1}枚目の写真を表示`}
                    aria-current={index === activeIndex ? "true" : undefined}
                    className={index === activeIndex ? "active" : ""}
                    onClick={() => moveTo(index)}
                  />
                  );
                })}
              </div>
              <button
                type="button"
                aria-label="次の写真"
                disabled={photos.length < 2}
                onClick={() => moveTo(activeIndex + 1)}
              >
                →
              </button>
            </div>
          ) : null}
          <p className="story-viewer-caption" aria-live="polite">
            {photo ? `${photo.title} · ${formatPhotoDate(photo.date)}` : locationName}
          </p>
        </section>

        <section className="story-viewer-story" aria-labelledby="story-viewer-title">
          <div className="story-viewer-story-heading">
            <p className="text-xs font-semibold tracking-[0.2em] text-sky-300 uppercase">
              A story from this session
            </p>
            <h2 id="story-viewer-title" className="mt-2 text-xl font-bold">
              {locationName}
            </h2>
            <p className="mt-1 text-sm text-zinc-300">{sessionDate}</p>
          </div>
          <div className="story-viewer-story-content" tabIndex={0}>
            <p>{story}</p>
          </div>
        </section>
      </div>

      <button
        ref={closeButtonRef}
        type="button"
        aria-label="Story Viewerを閉じる"
        className="story-viewer-close"
        onClick={onClose}
      >
        ×
      </button>
    </dialog>
  );
}
