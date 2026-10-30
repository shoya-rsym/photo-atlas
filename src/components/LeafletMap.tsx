"use client";

import "leaflet/dist/leaflet.css";
import type { LeafletMouseEvent } from "leaflet";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { CircleMarker, MapContainer, TileLayer, Tooltip } from "react-leaflet";
import PreviewCard from "@/components/PreviewCard";
import { pickRandom } from "@/lib/random";
import type { Location, PreviewInfo, PreviewPhoto } from "@/types";

export type LocationPreview = { location: Location; preview: PreviewInfo };

type Props = { items: LocationPreview[] };

type Positioned = LocationPreview & {
  location: Location & { lat: number; lng: number };
};

const PREVIEW_PHOTO_COUNT = 4;

function hasPosition(item: LocationPreview): item is Positioned {
  return (
    typeof item.location.lat === "number" && typeof item.location.lng === "number"
  );
}

export default function LeafletMap({ items }: Props) {
  const router = useRouter();
  const [shown, setShown] = useState<Record<string, PreviewPhoto[]>>(() =>
    Object.fromEntries(
      items.map((i) => [
        i.location.id,
        pickRandom(i.preview.photos, PREVIEW_PHOTO_COUNT),
      ]),
    ),
  );
  const tappedId = useRef<string | null>(null);

  // GPS未設定の地点は地図に表示しない（一覧には表示される）
  const positioned = items.filter(hasPosition);

  if (positioned.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-muted">
        この地図に表示できる場所は、まだありません
      </div>
    );
  }

  const lats = positioned.map((i) => i.location.lat);
  const lngs = positioned.map((i) => i.location.lng);
  const bounds: [[number, number], [number, number]] = [
    [Math.min(...lats), Math.min(...lngs)],
    [Math.max(...lats), Math.max(...lngs)],
  ];

  const reshuffle = (item: LocationPreview) =>
    setShown((prev) => ({
      ...prev,
      [item.location.id]: pickRandom(item.preview.photos, PREVIEW_PHOTO_COUNT),
    }));

  const handleClick = (item: LocationPreview, e: LeafletMouseEvent) => {
    const href = `/location/${item.location.id}`;
    const isTouch = window.matchMedia("(hover: none)").matches;
    // タッチ操作: 1回目でプレビュー表示、2回目で遷移
    if (isTouch && tappedId.current !== item.location.id) {
      tappedId.current = item.location.id;
      reshuffle(item);
      e.target.openTooltip();
      return;
    }
    router.push(href);
  };

  return (
    <MapContainer
      bounds={bounds}
      boundsOptions={{ padding: [40, 40], maxZoom: 14 }}
      scrollWheelZoom={false}
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {positioned.map((item) => (
        <CircleMarker
          key={item.location.id}
          center={[item.location.lat, item.location.lng]}
          radius={10}
          pathOptions={{ color: "#ffffff", weight: 2, fillColor: "#0ea5e9", fillOpacity: 0.9 }}
          eventHandlers={{
            mouseover: () => reshuffle(item),
            click: (e) => handleClick(item, e),
          }}
        >
          <Tooltip className="photo-preview-tooltip" direction="top" offset={[0, -8]}>
            <PreviewCard
              preview={item.preview}
              photos={shown[item.location.id] ?? []}
              showLocationCount={false}
            />
          </Tooltip>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
