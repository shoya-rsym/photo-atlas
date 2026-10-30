import Link from "next/link";
import PhotoThumbnail from "@/components/PhotoThumbnail";

type Props = {
  href: string;
  title: string;
  lines?: string[];
  image?: string;
  actionLabel?: string;
};

export default function LinkCard({
  href,
  title,
  lines = [],
  image,
  actionLabel = "辿る",
}: Props) {
  return (
    <Link
      href={href}
      className="group block overflow-hidden rounded-xl border border-border bg-card transition hover:-translate-y-0.5 hover:border-accent hover:shadow-lg hover:shadow-black/20"
    >
      <div className="relative aspect-[16/8] overflow-hidden bg-background">
        {image ? (
          <PhotoThumbnail
            src={image}
            alt={`${title}に残る写真`}
            className="transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-800 to-slate-950 text-xs text-muted">
            まだ写真のない場所です
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 to-transparent" />
        <p className="absolute bottom-3 left-3 right-3 truncate text-lg font-bold text-white">
          {title}
        </p>
      </div>
      <div className="space-y-1 p-3">
        {lines.map((line) => (
          <p key={line} className="text-sm text-muted">
            {line}
          </p>
        ))}
        <p className="pt-1 text-xs font-semibold text-accent">{actionLabel} →</p>
      </div>
    </Link>
  );
}
