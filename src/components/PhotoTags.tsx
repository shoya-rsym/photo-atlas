import { getTagName } from "@/lib/photos";

type Props = { tagIds: string[] };

/** Tag.id を Tag.name に変換して表示する */
export default function PhotoTags({ tagIds }: Props) {
  if (tagIds.length === 0) return <p className="text-muted">タグなし</p>;
  return (
    <ul className="flex flex-wrap gap-2">
      {tagIds.map((tagId) => (
        <li
          key={tagId}
          className="rounded border border-border px-2 py-0.5 text-sm"
        >
          {getTagName(tagId)}
        </li>
      ))}
    </ul>
  );
}
