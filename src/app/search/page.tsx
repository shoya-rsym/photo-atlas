import type { Metadata } from "next";
import SearchView from "@/components/SearchView";
import VisualHero from "@/components/VisualHero";
import { photos } from "@/lib/data";
import { getRepresentativePhoto } from "@/lib/photos";

const title = "写真の断片を探す | Photo Atlas";
const description = "場所やタグを手がかりに、写真に残った旅の断片を辿る。";

export const metadata: Metadata = {
  title,
  description,
  openGraph: { title, description },
};

export default function SearchPage() {
  return (
    <div className="space-y-8">
      <VisualHero
        eyebrow="Find a photo fragment"
        title="写真の断片を探す"
        description="場所やタグを手がかりに、まだ知らない一枚へ。"
        photo={getRepresentativePhoto(photos)}
        breadcrumbs={[{ label: "写真の断片を探す" }]}
      />
      <SearchView photos={photos} />
    </div>
  );
}
