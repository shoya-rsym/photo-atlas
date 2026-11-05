"use client";

import { usePathname, useRouter } from "next/navigation";

type Props = {
  locationIds: string[];
  compact?: boolean;
};

export default function RandomDestinationButton({
  locationIds,
  compact = false,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === "/photo" || pathname.startsWith("/photo/")) return null;

  function goSomewhereElse() {
    const currentLocationId = pathname.startsWith("/location/")
      ? pathname.split("/")[2]
      : undefined;
    const destinations = locationIds.filter((id) => id !== currentLocationId);
    if (destinations.length === 0) return;

    const destination =
      destinations[Math.floor(Math.random() * destinations.length)];
    router.push(`/location/${destination}`);
  }

  return (
    <button
      type="button"
      onClick={goSomewhereElse}
      className={`inline-flex min-h-9 items-center justify-center gap-2 whitespace-nowrap rounded-full border border-amber-200/30 bg-amber-300/10 px-3 text-xs font-semibold text-amber-100 transition hover:border-amber-200/60 hover:bg-amber-300/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200 ${
        compact ? "min-h-8 px-2.5 text-[11px]" : "py-1.5"
      }`}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="h-4 w-4 shrink-0"
      >
        <path d="M4 7h12a4 4 0 0 1 4 4v1" />
        <path d="m17 9 3 3 3-3" />
        <path d="M20 17H8a4 4 0 0 1-4-4v-1" />
        <path d="m7 15-3-3-3 3" />
      </svg>
      どこか別の場所へ行く
    </button>
  );
}
