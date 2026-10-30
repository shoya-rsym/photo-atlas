import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Breadcrumb from "@/components/Breadcrumb";
import FeaturedPhotoCard from "@/components/FeaturedPhotoCard";
import { SessionMemoryText } from "@/components/MemoryDisclosure";
import PhotoGrid from "@/components/PhotoGrid";
import PhotoTags from "@/components/PhotoTags";
import SummaryCards from "@/components/SummaryCards";
import VisualHero from "@/components/VisualHero";
import { locations, sessionMemories } from "@/lib/data";
import { getRepresentativePhoto, UNKNOWN_DATE_LABEL } from "@/lib/photos";
import {
  findLocation,
  getLocationStatistics,
  getLocationTrail,
  getPhotosByLocation,
  getTagIdsByLocation,
} from "@/lib/queries";
import type { Photo, SessionMemory } from "@/types";

type Props = { params: Promise<{ id: string }> };
type PhotoSession = {
  date?: string;
  photos: Photo[];
  memory?: SessionMemory;
};

function PhotoSessions({ sessions }: { sessions: PhotoSession[] }) {
  if (sessions.length === 0) {
    return (
      <p className="rounded-xl border border-border bg-card p-6 text-muted">
        ここには、まだ写真がありません
      </p>
    );
  }

  return (
    <div className="space-y-8">
      {sessions.map((session) => (
        <section key={session.date ?? "unknown"} className="space-y-3">
          <h3 className="text-sm font-semibold text-muted">
            {session.date ?? UNKNOWN_DATE_LABEL} · {session.photos.length} 枚
          </h3>
          {session.memory ? (
            <SessionMemoryText
              text={session.memory.text}
              date={session.memory.sessionDate}
            />
          ) : null}
          <PhotoGrid photos={session.photos} />
        </section>
      ))}
    </div>
  );
}

export const dynamicParams = false;

export function generateStaticParams() {
  return locations.map((location) => ({ id: location.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const location = findLocation(id);
  if (!location) return {};
  const title = `${location.name} | Photo Atlas`;
  const description = `${location.name}に残る写真と、場所の記憶を辿る。`;
  return { title, description, openGraph: { title, description } };
}

export default async function LocationPage({ params }: Props) {
  const { id } = await params;
  const location = findLocation(id);
  if (!location) notFound();

  const { area, prefecture } = getLocationTrail(location);
  const photos = getPhotosByLocation(location.id);
  const stats = getLocationStatistics(location.id);
  const tagIds = getTagIdsByLocation(location.id);
  const representative = getRepresentativePhoto(photos);
  const memoriesByDate = new Map(
    sessionMemories
      .filter((memory) => memory.locationId === location.id)
      .map((memory) => [memory.sessionDate, memory]),
  );
  const photosByDate = new Map<string, PhotoSession>();
  for (const photo of photos) {
    const key = photo.date ?? "";
    const session = photosByDate.get(key) ?? {
      date: photo.date,
      photos: [],
      memory: photo.date ? memoriesByDate.get(photo.date) : undefined,
    };
    session.photos.push(photo);
    photosByDate.set(key, session);
  }
  const sessions = [...photosByDate.values()];

  return (
    <>
      <div className="space-y-6 md:hidden">
        {representative ? (
          <FeaturedPhotoCard
            photo={representative}
            href={`/photo/${representative.id}`}
            label="この場所に残る一枚"
            title={representative.title}
            detail={location.name}
            titleAsText
          />
        ) : null}
        <section aria-labelledby="mobile-location-title">
          <p className="text-xs font-semibold tracking-[0.18em] text-accent uppercase">
            {[area?.name, prefecture?.name].filter(Boolean).join(" · ")}
          </p>
          <h1 id="mobile-location-title" className="mt-1 text-2xl font-black">
            {location.name}
          </h1>
          <p className="mt-2 leading-6 text-muted">
            {location.address ?? "住所の手がかりはありません"}
          </p>
          <Breadcrumb
            items={[
              ...(area ? [{ label: area.name, href: `/area/${area.id}` }] : []),
              ...(prefecture
                ? [{ label: prefecture.name, href: `/prefecture/${prefecture.id}` }]
                : []),
              { label: location.name },
            ]}
          />
        </section>
        <section
          aria-labelledby="mobile-location-tags-title"
          className="rounded-2xl border border-border bg-card p-4"
        >
          <h2 id="mobile-location-tags-title" className="mb-3 text-lg font-bold">
            写真の手がかり
          </h2>
          <PhotoTags tagIds={tagIds} />
        </section>
        <SummaryCards
          items={[
            { label: "残された写真", value: `${stats.photoCount} 枚` },
            {
              label: "最初の記録",
              value: stats.firstPhotoDate ?? UNKNOWN_DATE_LABEL,
            },
            {
              label: "近ごろの記録",
              value: stats.latestPhotoDate ?? UNKNOWN_DATE_LABEL,
            },
          ]}
        />
        <section aria-labelledby="mobile-location-photos-title">
          <div className="mb-3">
            <p className="text-xs font-semibold tracking-[0.18em] text-accent uppercase">
              Photos from this place
            </p>
            <h2 id="mobile-location-photos-title" className="mt-1 text-xl font-bold">
              ここに残る写真
            </h2>
          </div>
          <PhotoSessions sessions={sessions} />
        </section>
      </div>

      <div className="hidden space-y-8 sm:space-y-10 md:block">
        <VisualHero
          eyebrow={[area?.name, prefecture?.name].filter(Boolean).join(" · ")}
          title={location.name}
          description={`${location.address ?? "住所の手がかりはありません"}。ここに残る景色を辿る。`}
          photo={representative}
          breadcrumbs={[
            ...(area ? [{ label: area.name, href: `/area/${area.id}` }] : []),
            ...(prefecture
              ? [{ label: prefecture.name, href: `/prefecture/${prefecture.id}` }]
              : []),
            { label: location.name },
          ]}
        />
        <SummaryCards
          items={[
            { label: "残された写真", value: `${stats.photoCount} 枚` },
            { label: "最初の記録", value: stats.firstPhotoDate ?? UNKNOWN_DATE_LABEL },
            { label: "近ごろの記録", value: stats.latestPhotoDate ?? UNKNOWN_DATE_LABEL },
            { label: "写真の手がかり", value: `${tagIds.length} 種類` },
          ]}
        />

        <section
          aria-labelledby="location-tags-title"
          className="rounded-2xl border border-border bg-card p-5"
        >
          <p className="text-xs font-semibold tracking-[0.2em] text-accent uppercase">
            A place in the album
          </p>
          <h2 id="location-tags-title" className="mb-3 mt-1 text-xl font-bold">
            写真の手がかり
          </h2>
          <PhotoTags tagIds={tagIds} />
        </section>

        <section aria-labelledby="location-photos-title">
          <div className="mb-4">
            <p className="text-xs font-semibold tracking-[0.2em] text-accent uppercase">
              Photos from this place
            </p>
            <h2 id="location-photos-title" className="mt-1 text-2xl font-bold">
              ここに残る写真
            </h2>
          </div>
          <PhotoSessions sessions={sessions} />
        </section>
      </div>
    </>
  );
}
