import Link from "next/link";

export type BreadcrumbItem = { label: string; href?: string };

type Props = { items: BreadcrumbItem[] };

export default function Breadcrumb({ items }: Props) {
  const all: BreadcrumbItem[] = [{ label: "TOP", href: "/" }, ...items];
  return (
    <nav aria-label="パンくず" className="mb-6 text-sm text-muted">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {all.map((item, index) => {
          const isLast = index === all.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-2">
              {item.href && !isLast ? (
                <Link href={item.href} className="text-accent hover:underline">
                  {item.label}
                </Link>
              ) : (
                <span aria-current={isLast ? "page" : undefined}>
                  {item.label}
                </span>
              )}
              {isLast ? null : <span aria-hidden="true">&gt;</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
