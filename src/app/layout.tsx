import type { Metadata } from "next";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import "./globals.css";

const SITE_TITLE = "ARフォト図鑑";
const SITE_DESCRIPTION =
  "地図から辿る写真図鑑。日本地図から地域・都道府県・撮影地点へ辿り、ARフォトや写真を閲覧できます。";

export const metadata: Metadata = {
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    type: "website",
    locale: "ja_JP",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body className="flex min-h-screen flex-col antialiased">
        <Header />
        <main className="mx-auto w-full max-w-site flex-1 px-4 py-6 pb-24 sm:py-8 md:pb-8">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
