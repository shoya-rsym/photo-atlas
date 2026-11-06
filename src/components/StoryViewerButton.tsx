"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import type { Photo } from "@/types";

type StoryPhoto = Pick<Photo, "id" | "title" | "image" | "date">;

const StoryViewer = dynamic(() => import("@/components/StoryViewer"), {
  ssr: false,
});

type Props = {
  story?: string;
  locationName: string;
  sessionDate?: string;
  photos: StoryPhoto[];
};

export default function StoryViewerButton({
  story,
  locationName,
  sessionDate,
  photos,
}: Props) {
  const [open, setOpen] = useState(false);
  const hasStory = Boolean(story?.trim());

  return (
    <>
      <button
        type="button"
        disabled={!hasStory}
        aria-haspopup="dialog"
        aria-label={
          sessionDate
            ? `${sessionDate}のStoryをひらく`
            : "Storyをひらく"
        }
        className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-semibold transition hover:border-accent disabled:cursor-not-allowed disabled:opacity-45"
        onClick={() => setOpen(true)}
      >
        <span aria-hidden="true">📖</span>
        Story
        {!hasStory ? <span className="text-xs font-normal text-muted">準備中</span> : null}
      </button>
      {open && hasStory ? (
        <StoryViewer
          story={story ?? ""}
          locationName={locationName}
          sessionDate={sessionDate ?? ""}
          photos={photos}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}
