import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Breadcrumb from "@/components/Breadcrumb";
import LinkCard from "@/components/LinkCard";
import { areas } from "@/lib/data";
import { findArea, getPrefecturesByArea } from "@/lib/queries";

type Props = { params: Promise<{ id: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return areas.map((area) => ({ id: area.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const area = findArea(id);
  if (!area) return {};
  const title = `${area.name} | ARフォト図鑑`;
  const description = area.description ?? `${area.name}の都道府県一覧`;
  return { title, description, openGraph: { title, description } };
}

export default async function AreaPage({ params }: Props) {
  const { id } = await params;
  const area = findArea(id);
  if (!area) notFound();

  const prefectures = getPrefecturesByArea(area.id);

  return (
    <>
      <Breadcrumb items={[{ label: area.name }]} />
      <h1 className="text-3xl font-bold">{area.name}</h1>
      {area.description ? (
        <p className="mt-2 text-muted">{area.description}</p>
      ) : null}

      <h2 className="mb-4 mt-10 text-xl font-bold">都道府県一覧</h2>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {prefectures.map((prefecture) => (
          <li key={prefecture.id}>
            <LinkCard
              href={`/prefecture/${prefecture.id}`}
              title={prefecture.name}
            />
          </li>
        ))}
      </ul>
    </>
  );
}
