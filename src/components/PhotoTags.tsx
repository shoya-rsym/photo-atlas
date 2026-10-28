import Link from "next/link";
import { getTagName } from "@/lib/photos";

type Props = { tagIds: string[] };

/** Tag.id を Tag.name に変換して表示する */
export default function PhotoTags({ tagIds }: Props) {
  if (tagIds.length === 0) return <p className="text-muted">タグなし</p>;
  return (
    <ul className="flex flex-wrap gap-2">
      {tagIds.map((tagId) => (
        <li key={tagId}>
          <Link
            href={`/search?tag=${encodeURIComponent(tagId)}`}
            className="inline-block rounded-full border border-border bg-background px-3 py-1 text-sm transition hover:border-accent hover:text-accent"
          >
            {getTagName(tagId)}
          </Link>
        </li>
      ))}
    </ul>
  );
}
