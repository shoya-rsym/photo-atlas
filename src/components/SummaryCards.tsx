type Props = { items: { label: string; value: string | number }[] };

const icons = [
  <path key="a" d="M4 7h3l1.5-2h7L17 7h3v12H4z" />,
  <path key="a" d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" />,
  <path key="a" d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3z" />,
  <path key="a" d="m12 3 1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7z" />,
];

export default function SummaryCards({ items }: Props) {
  return (
    <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map((item, index) => (
        <div
          key={item.label}
          className="rounded-xl border border-border bg-card p-4"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-400">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="h-6 w-6"
              >
                {icons[index % icons.length]}
              </svg>
            </span>
            <div className="min-w-0">
              <dt className="truncate text-xs text-muted">{item.label}</dt>
              <dd className="mt-1 text-base leading-tight font-black break-words sm:text-2xl">
                {typeof item.value === "number"
                  ? item.value.toLocaleString("ja-JP")
                  : item.value}
              </dd>
            </div>
          </div>
        </div>
      ))}
    </dl>
  );
}
