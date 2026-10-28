import Link from "next/link";

export default function NotFound() {
  return (
    <div className="py-16 text-center">
      <h1 className="text-3xl font-bold">404 Not Found</h1>
      <p className="mt-4 text-muted">ページが見つかりません</p>
      <Link href="/" className="mt-6 inline-block text-accent underline">
        TOPへ戻る
      </Link>
    </div>
  );
}
