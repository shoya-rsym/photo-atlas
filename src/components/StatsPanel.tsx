import type { Statistics } from "@/types";
import type { ReactNode } from "react";

type Props = { statistics: Statistics };

export default function StatsPanel({ statistics }: Props) {
  const items = [
    { label: "写真数", value: statistics.photoCount, unit: "枚", icon: "camera" },
    {
      label: "撮影地点数",
      value: statistics.locationCount,
      unit: "箇所",
      icon: "pin",
    },
    {
      label: "都道府県数",
      value: statistics.prefectureCount,
      unit: "都道府県",
      icon: "map",
    },
    {
      label: "登場キャラクター",
      value: statistics.characterCount,
      unit: "種類",
      icon: "spark",
    },
  ];

  const icon = (name: string) => {
    const paths: Record<string, ReactNode> = {
      camera: (
        <>
          <path d="M4 7h3l1.5-2h7L17 7h3v12H4z" />
          <circle cx="12" cy="13" r="3.5" />
        </>
      ),
      pin: (
        <>
          <path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" />
          <circle cx="12" cy="10" r="2" />
        </>
      ),
      map: (
        <>
          <path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3z" />
          <path d="M9 3v15m6-12v15" />
        </>
      ),
      spark: (
        <>
          <path d="m12 3 1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7z" />
          <path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" />
        </>
      ),
    };
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="h-6 w-6 text-sky-400 sm:h-7 sm:w-7"
      >
        {paths[name]}
      </svg>
    );
  };

  return (
    <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map((item, index) => (
        <div
          key={item.label}
          className="home-card-enter rounded-xl border border-border bg-card/90 p-3 sm:p-4"
          style={{ animationDelay: `${index * 70}ms` }}
        >
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-500/10">
              {icon(item.icon)}
            </span>
            <div className="min-w-0">
              <dt className="truncate text-xs text-muted sm:text-sm">{item.label}</dt>
              <dd className="mt-0.5 text-xl font-black tracking-tight sm:text-2xl">
                {item.value.toLocaleString("ja-JP")}
                <span className="ml-1 text-xs font-normal text-muted sm:text-sm">
                  {item.unit}
                </span>
              </dd>
            </div>
          </div>
        </div>
      ))}
    </dl>
  );
}
