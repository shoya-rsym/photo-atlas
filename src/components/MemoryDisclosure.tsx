"use client";

import { useState } from "react";
import { useMemoryPreference } from "@/components/MemoryPreferenceProvider";

type PhotoMemoryProps = { text?: string };

export function PhotoMemoryDisclosure({ text }: PhotoMemoryProps) {
  const { enabled, ready } = useMemoryPreference();
  const [open, setOpen] = useState(false);

  if (!text || !ready || !enabled) return null;

  return (
    <span className="absolute right-2 top-2 z-10">
      <button
        type="button"
        aria-label="この写真に添えられた余白をひらく"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex h-8 w-8 items-center justify-center rounded-full border border-white/25 bg-black/55 text-sm text-white/85 shadow-sm backdrop-blur transition hover:bg-black/75"
      >
        <span aria-hidden="true">💭</span>
      </button>
      {open ? (
        <span
          role="status"
          className="absolute right-0 top-10 block w-56 rounded-lg border border-white/15 bg-black/85 p-3 text-left text-sm leading-6 text-white/85 shadow-xl backdrop-blur"
        >
          {text}
        </span>
      ) : null}
    </span>
  );
}

export function SessionMemoryText({
  text,
  date,
}: {
  text: string;
  date: string;
}) {
  const { enabled, ready } = useMemoryPreference();
  if (!enabled || !ready) return null;

  return (
    <div className="border-y border-border/70 py-4">
      <p className="text-sm leading-7 text-muted">{text}</p>
      <time className="mt-1 block text-xs text-muted/70" dateTime={date}>
        {date}
      </time>
    </div>
  );
}
