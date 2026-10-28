import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Breadcrumb from "@/components/Breadcrumb";
import LinkCard from "@/components/LinkCard";
import PrefectureMap from "@/components/PrefectureMap";
import { prefectures } from "@/lib/data";
import {
  findArea,
  findPrefecture,
  getLocationStatistics,
  getLocationsByPrefecture,
} from "@/lib/queries";

type Props = { params: Promise<{ id: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return prefectures.map((prefecture) => ({ id: prefecture.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const prefecture = findPrefecture(id);
  if (!prefecture) return {};
  const title = `${prefecture.name} | ARフォト図鑑`;
  const description = `${prefecture.name}の撮影地点一覧`;
  return { title, description, openGraph: { title, description } };
}

export default async function PrefecturePage({ params }: Props) {
  const { id } = await params;
  const prefecture = findPrefecture(id);
  if (!prefecture) notFound();

  const area = findArea(prefecture.areaId);
  const locations = getLocationsByPrefecture(prefecture.id);

  return (
    <>
      <Breadcrumb
        items={[
          ...(area ? [{ label: area.name, href: `/area/${area.id}` }] : []),
          { label: prefecture.name },
        ]}
      />
      <h1 className="text-3xl font-bold">{prefecture.name}</h1>
      <p className="mt-2 text-muted">撮影地点数：{locations.length}</p>

      <PrefectureMap locations={locations} />

      <h2 className="mb-4 mt-10 text-xl font-bold">撮影地点一覧</h2>
      {locations.length === 0 ? (
        <p className="text-muted">撮影地点が登録されていません</p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {locations.map((location) => {
            const stats = getLocationStatistics(location.id);
            return (
              <li key={location.id}>
                <LinkCard
                  href={`/location/${location.id}`}
                  title={location.name}
                  lines={[
                    `写真数：${stats.photoCount}`,
                    `最新撮影：${stats.latestPhotoDate ?? "撮影日不明"}`,
                  ]}
                />
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
