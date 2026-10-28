import type { Metadata } from "next";
import SearchView from "@/components/SearchView";
import VisualHero from "@/components/VisualHero";
import { photos } from "@/lib/data";
import { getRepresentativePhoto } from "@/lib/photos";

const title = "検索 | ARフォト図鑑";
const description = "タイトル・タグ・コメント・撮影地点名から写真を検索できます。";

export const metadata: Metadata = {
  title,
  description,
  openGraph: { title, description },
};

export default function SearchPage() {
  return (
    <div className="space-y-8">
      <VisualHero
        eyebrow="Find your photo"
        title="写真を探す"
        description="タイトルや撮影場所、タグから、気になる一枚を見つけましょう。"
        photo={getRepresentativePhoto(photos)}
        breadcrumbs={[{ label: "写真を探す" }]}
      />
      <SearchView photos={photos} />
    </div>
  );
}
