import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Breadcrumb from "@/components/Breadcrumb";
import JapanMap from "@/components/JapanMap";
import LinkCard from "@/components/LinkCard";
import { areas, subregions } from "@/lib/data";
import { getPrefectureUnits } from "@/lib/mapUnits";
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
  const units = getPrefectureUnits(area.id);

  return (
    <>
      <Breadcrumb items={[{ label: area.name }]} />
      <h1 className="text-3xl font-bold">{area.name}</h1>
      {area.description ? (
        <p className="mt-2 text-muted">{area.description}</p>
      ) : null}

      <section aria-label="地域地図" className="mt-8">
        <JapanMap
          units={units}
          fit="units"
          ariaLabel={`${area.name}の地図`}
          hint="地図の都道府県にカーソルを合わせる（スマホはタップ）と、写真のプレビューが表示されます。"
        />
      </section>

      <h2 className="mb-4 mt-10 text-xl font-bold">都道府県一覧</h2>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {prefectures.map((prefecture) => {
          const subs = subregions.filter((s) => s.prefectureId === prefecture.id);
          return (
            <li key={prefecture.id}>
              <LinkCard
                href={`/prefecture/${prefecture.id}`}
                title={prefecture.name}
                lines={subs.length > 0 ? [subs.map((s) => s.name).join("・")] : undefined}
              />
            </li>
          );
        })}
      </ul>
    </>
  );
}
