"use client";

import "leaflet/dist/leaflet.css";
import { useRouter } from "next/navigation";
import { CircleMarker, MapContainer, TileLayer, Tooltip } from "react-leaflet";
import type { Location } from "@/types";

type Props = { locations: Location[] };

type Positioned = Location & { lat: number; lng: number };

function hasPosition(location: Location): location is Positioned {
  return typeof location.lat === "number" && typeof location.lng === "number";
}

export default function LeafletMap({ locations }: Props) {
  const router = useRouter();
  // GPS未設定の地点は地図に表示しない（一覧には表示される）
  const positioned = locations.filter(hasPosition);

  if (positioned.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-muted">
        地図に表示できる撮影地点がありません
      </div>
    );
  }

  const lats = positioned.map((l) => l.lat);
  const lngs = positioned.map((l) => l.lng);
  const bounds: [[number, number], [number, number]] = [
    [Math.min(...lats), Math.min(...lngs)],
    [Math.max(...lats), Math.max(...lngs)],
  ];

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
      {positioned.map((location) => (
        <CircleMarker
          key={location.id}
          center={[location.lat, location.lng]}
          radius={10}
          pathOptions={{ color: "#0ea5e9", fillColor: "#0ea5e9", fillOpacity: 0.8 }}
          eventHandlers={{
            click: () => router.push(`/location/${location.id}`),
          }}
        >
          <Tooltip>{location.name}</Tooltip>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
