import Link from "next/link";

export default function NotFound() {
  return (
    <div className="py-16 text-center">
      <h1 className="text-3xl font-bold">ページが見つかりませんでした</h1>
      <p className="mt-4 text-muted">探していた景色には、まだ辿り着けないようです。</p>
      <Link href="/" className="mt-6 inline-block text-accent underline">
        Photo Atlasの入口へ
      </Link>
    </div>
  );
}
