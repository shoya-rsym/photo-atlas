import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Breadcrumb from "@/components/Breadcrumb";
import LinkCard from "@/components/LinkCard";
import PrefectureMap from "@/components/PrefectureMap";
import { prefectures, subregions } from "@/lib/data";
import { buildPreview } from "@/lib/preview";
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
  const previews = locations.map((location) => ({
    location,
    preview: buildPreview(location.name, [location.id]),
  }));
  const prefectureSubregions = subregions.filter(
    (s) => s.prefectureId === prefecture.id,
  );
  const groups =
    prefectureSubregions.length === 0
      ? [{ id: "", name: "", items: locations }]
      : [
          ...prefectureSubregions.map((s) => ({
            id: s.id,
            name: s.name,
            items: locations.filter((l) => l.subregionId === s.id),
          })),
          {
            id: "other",
            name: "その他",
            items: locations.filter(
              (l) => !prefectureSubregions.some((s) => s.id === l.subregionId),
            ),
          },
        ].filter((g) => g.id !== "other" || g.items.length > 0);

  const renderLocation = (location: (typeof locations)[number]) => {
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
  };

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

      <PrefectureMap items={previews} />

      <h2 className="mb-4 mt-10 text-xl font-bold">撮影地点一覧</h2>
      {locations.length === 0 ? (
        <p className="text-muted">撮影地点が登録されていません</p>
      ) : (
        groups.map((group) => (
          <section key={group.id} id={group.id || undefined} className="mb-8 scroll-mt-20">
            {group.name ? (
              <h3 className="mb-3 text-lg font-bold">{group.name}</h3>
            ) : null}
            {group.items.length === 0 ? (
              <p className="text-muted">撮影地点が登録されていません</p>
            ) : (
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {group.items.map(renderLocation)}
              </ul>
            )}
          </section>
        ))
      )}
    </>
  );
}
