import type { Metadata } from "next";
import Breadcrumb from "@/components/Breadcrumb";
import SearchView from "@/components/SearchView";
import { photos } from "@/lib/data";

const title = "検索 | ARフォト図鑑";
const description = "タイトル・タグ・コメント・撮影地点名から写真を検索できます。";

export const metadata: Metadata = {
  title,
  description,
  openGraph: { title, description },
};

export default function SearchPage() {
  return (
    <>
      <Breadcrumb items={[{ label: "検索" }]} />
      <h1 className="mb-6 text-3xl font-bold">検索</h1>
      <SearchView photos={photos} />
    </>
  );
}
