import type { Statistics } from "@/types";

type Props = { statistics: Statistics };

export default function StatsPanel({ statistics }: Props) {
  const items = [
    { label: "写真数", value: statistics.photoCount, unit: "枚" },
    { label: "撮影地点数", value: statistics.locationCount, unit: "箇所" },
    { label: "都道府県数", value: statistics.prefectureCount, unit: "都道府県" },
  ];
  return (
    <dl className="grid grid-cols-3 gap-3">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-lg border border-border bg-card p-3 text-center sm:p-4"
        >
          <dt className="text-xs text-muted sm:text-sm">{item.label}</dt>
          <dd className="mt-1 text-lg font-bold sm:text-2xl">
            {item.value}
            <span className="ml-0.5 text-xs font-normal text-muted sm:text-sm">
              {item.unit}
            </span>
          </dd>
        </div>
      ))}
    </dl>
  );
}
