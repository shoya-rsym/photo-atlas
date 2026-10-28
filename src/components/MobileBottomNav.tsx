import Link from "next/link";

const items = [
  {
    href: "/#explore",
    label: "地図",
    icon: <path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3zM9 3v15m6-12v15" />,
  },
  {
    href: "/search",
    label: "写真",
    icon: (
      <>
        <path d="M4 7h3l1.5-2h7L17 7h3v12H4z" />
        <circle cx="12" cy="13" r="3.5" />
      </>
    ),
  },
  {
    href: "/search#tag-filter",
    label: "タグ",
    icon: (
      <>
        <path d="m20 13-7 7-10-10V3h7z" />
        <circle cx="7.5" cy="7.5" r="1" />
      </>
    ),
  },
  {
    href: "/search#character-filter",
    label: "キャラ",
    icon: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M5 21v-2a7 7 0 0 1 14 0v2z" />
      </>
    ),
  },
];

export default function MobileBottomNav() {
  return (
    <nav
      aria-label="モバイルナビゲーション"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[#0b111a]/95 px-2 pt-2 pb-[env(safe-area-inset-bottom)] text-white shadow-[0_-8px_24px_rgba(0,0,0,0.28)] backdrop-blur-xl md:hidden"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-4">
        {items.map((item) => (
          <li key={item.label}>
            <Link
              href={item.href}
              className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg text-xs font-medium text-white/75 transition hover:bg-white/5 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="h-5 w-5"
              >
                {item.icon}
              </svg>
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
