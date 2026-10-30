import Link from "next/link";

type PopularTag = {
  id: string;
  name: string;
  color?: string;
};

type Props = { tags: PopularTag[] };

export default function PopularTags({ tags }: Props) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <h2 className="font-bold">写真の手がかり</h2>
      {tags.length ? (
        <ul className="mt-3 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <li key={tag.id}>
              <Link
                href={`/search?tag=${encodeURIComponent(tag.id)}`}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-sm transition hover:border-accent hover:text-accent"
                style={
                  tag.color
                    ? { borderColor: `${tag.color}66` }
                    : undefined
                }
              >
                {tag.name}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-muted">写真についた言葉は、まだありません</p>
      )}
    </section>
  );
}
