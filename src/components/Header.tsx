import Link from "next/link";

export default function Header() {
  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex max-w-site items-center justify-between px-4 py-3">
        <Link href="/" className="text-lg font-bold">
          ARフォト図鑑
        </Link>
        <nav aria-label="メインナビゲーション" className="flex items-center gap-4 text-sm">
          <span className="hidden text-muted sm:inline">地図から辿る写真図鑑</span>
          <Link href="/search" className="text-accent hover:underline">
            検索
          </Link>
        </nav>
      </div>
    </header>
  );
}
