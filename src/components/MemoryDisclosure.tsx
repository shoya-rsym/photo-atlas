"use client";

import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";
import { useMemoryPreference } from "@/components/MemoryPreferenceProvider";

type PhotoMemoryProps = { text?: string };

export function PhotoMemoryDisclosure({ text }: PhotoMemoryProps) {
  const { enabled, ready } = useMemoryPreference();
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(
    null,
  );
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open || !text || !ready || !enabled) return;
    const reposition = () => {
      const button = buttonRef.current;
      const popover = popoverRef.current;
      if (!button || !popover) return;

      const margin = 8;
      const buttonRect = button.getBoundingClientRect();
      const popoverRect = popover.getBoundingClientRect();
      const left = Math.max(
        margin,
        Math.min(
          buttonRect.right - popoverRect.width,
          window.innerWidth - popoverRect.width - margin,
        ),
      );
      const below = buttonRect.bottom + margin;
      const top =
        below + popoverRect.height <= window.innerHeight - margin
          ? below
          : Math.max(margin, buttonRect.top - popoverRect.height - margin);
      setPosition({ left, top });
    };

    reposition();
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [enabled, open, ready, text]);

  if (!text || !ready || !enabled) return null;

  return (
    <span className="absolute right-2 top-2 z-10">
      <button
        ref={buttonRef}
        type="button"
        aria-label="この写真に添えられた余白をひらく"
        aria-expanded={open}
        onClick={() => {
          setPosition(null);
          setOpen((value) => !value);
        }}
        className="flex h-8 w-8 items-center justify-center rounded-full border border-white/25 bg-black/55 text-sm text-white/85 shadow-sm backdrop-blur transition hover:bg-black/75"
      >
        <span aria-hidden="true">💭</span>
      </button>
      {open && typeof document !== "undefined"
        ? createPortal(
            <span
              ref={popoverRef}
              role="status"
              className="fixed z-[100] block max-h-[calc(100vh-1rem)] overflow-y-auto rounded-lg border border-white/15 bg-black/85 p-3 text-left text-sm leading-6 text-white/85 shadow-xl backdrop-blur"
              style={{
                left: position?.left ?? 8,
                top: position?.top ?? 8,
                visibility: position ? "visible" : "hidden",
                width: "min(14rem, calc(100vw - 1rem))",
              }}
            >
              {text}
            </span>,
            document.body,
          )
        : null}
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
