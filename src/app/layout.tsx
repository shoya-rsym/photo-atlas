import type { Metadata } from "next";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { MemoryPreferenceProvider } from "@/components/MemoryPreferenceProvider";
import "./globals.css";

const SITE_TITLE = "Photo Atlas";
const SITE_DESCRIPTION =
  "Discover Japan through photos. 地図から辿る写真館。写真に残った旅の断片を巡ろう。";

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
        <MemoryPreferenceProvider>
          <Header />
          <main className="mx-auto w-full max-w-site flex-1 px-4 py-6 pb-24 sm:py-8 md:pb-8">
            {children}
          </main>
          <Footer />
        </MemoryPreferenceProvider>
      </body>
    </html>
  );
}
