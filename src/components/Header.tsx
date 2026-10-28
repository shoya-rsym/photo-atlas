import Link from "next/link";
import MobileBottomNav from "@/components/MobileBottomNav";

export default function Header() {
  return (
    <>
      <header className="sticky top-0 z-30 hidden border-b border-white/10 bg-[#0b111a]/90 text-white backdrop-blur-xl md:block">
        <div className="mx-auto flex max-w-site items-center justify-between gap-4 px-4 py-3">
          <Link href="/" className="group flex shrink-0 items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-sky-300/30 bg-sky-400/10 text-sky-300">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="h-5 w-5"
              >
                <path d="M4 7h3l1.5-2h7L17 7h3v12H4z" />
                <circle cx="12" cy="13" r="3.5" />
              </svg>
            </span>
            <span>
              <span className="block text-base font-bold tracking-wide group-hover:text-sky-200">
                ARフォト図鑑
              </span>
              <span className="hidden text-[10px] tracking-wide text-white/50 sm:block">
                地図から辿る写真図鑑
              </span>
            </span>
          </Link>
          <nav
            aria-label="メインナビゲーション"
            className="flex items-center gap-3 text-xs sm:gap-6 sm:text-sm"
          >
            <Link href="/#desktop-explore" className="hidden text-white/75 hover:text-white sm:inline">
              地図から探す
            </Link>
            <Link
              href="/search"
              className="rounded-full border border-sky-300/30 bg-sky-400/10 px-3 py-1.5 font-semibold text-sky-200 transition hover:bg-sky-400/20"
            >
              写真を探す
            </Link>
          </nav>
        </div>
      </header>

      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0b111a]/95 text-white shadow-sm backdrop-blur-xl md:hidden">
        <div className="mx-auto flex h-14 max-w-site items-center justify-between px-4">
          <Link href="/" className="text-base font-black tracking-wide">
            ARフォト図鑑
          </Link>
          <Link
            href="/search"
            aria-label="写真を探す"
            className="rounded-full bg-sky-400/10 px-4 py-2 text-sm font-bold text-sky-200"
          >
            写真を探す
          </Link>
        </div>
      </header>
      <MobileBottomNav />
    </>
  );
}
