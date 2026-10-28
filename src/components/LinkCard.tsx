import Link from "next/link";

type Props = { href: string; title: string; lines?: string[] };

export default function LinkCard({ href, title, lines = [] }: Props) {
  return (
    <Link
      href={href}
      className="block rounded-lg border border-border bg-card p-4 hover:border-accent"
    >
      <p className="font-medium">{title}</p>
      {lines.map((line) => (
        <p key={line} className="mt-1 text-sm text-muted">
          {line}
        </p>
      ))}
    </Link>
  );
}
