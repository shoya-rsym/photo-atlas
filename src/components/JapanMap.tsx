"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { withBasePath } from "@/lib/paths";
import type { Area, AreaTooltipData, JapanMapRegion, Prefecture } from "@/types";

type Props = {
  regions: JapanMapRegion[];
  areas: Area[];
  prefectures: Prefecture[];
};

type ShapeElement = { tag: "path" | "polygon"; attr: string; value: string };
type PrefectureShape = {
  prefectureId: string;
  transform: string;
  elements: ShapeElement[];
};
type MapShapes = {
  viewBox: string;
  /** 都道府県グループの祖先に掛かっている transform（外側から順） */
  outerTransform: string;
  shapes: PrefectureShape[];
};
type LoadState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; map: MapShapes };

const SVG_URL = "/maps/japan-regions.svg";
const PREFECTURE_ID_PREFIX = "pref-";

function collectElements(group: Element): ShapeElement[] {
  const elements: ShapeElement[] = [];
  group.querySelectorAll("path, polygon").forEach((node) => {
    const tag = node.tagName.toLowerCase();
    if (tag === "path") {
      const value = node.getAttribute("d");
      if (value) elements.push({ tag, attr: "d", value });
    } else if (tag === "polygon") {
      const value = node.getAttribute("points");
      if (value) elements.push({ tag: "polygon", attr: "points", value });
    }
  });
  return elements;
}

/** 都道府県単位（id="pref-<prefectureId>"）のグループを読み取る */
function parseSvg(text: string): MapShapes | null {
  const doc = new DOMParser().parseFromString(text, "image/svg+xml");
  const root = doc.documentElement;
  if (root.nodeName !== "svg" || doc.querySelector("parsererror")) return null;

  const shapes: PrefectureShape[] = [];
  let outerTransform = "";
  doc.querySelectorAll(`[id^="${PREFECTURE_ID_PREFIX}"]`).forEach((node) => {
    const id = node.getAttribute("id") ?? "";
    const elements = collectElements(node);
    if (elements.length === 0) return;
    if (shapes.length === 0) {
      const transforms: string[] = [];
      for (let p = node.parentElement; p && p !== root; p = p.parentElement) {
        const t = p.getAttribute("transform");
        if (t) transforms.unshift(t);
      }
      outerTransform = transforms.join(" ");
    }
    shapes.push({
      prefectureId: id.slice(PREFECTURE_ID_PREFIX.length),
      transform: node.getAttribute("transform") ?? "",
      elements,
    });
  });

  const viewBox = root.getAttribute("viewBox");
  if (!viewBox || shapes.length === 0) return null;
  return { viewBox, outerTransform, shapes };
}

export default function JapanMap({ regions, areas, prefectures }: Props) {
  const router = useRouter();
  const [load, setLoad] = useState<LoadState>({ status: "loading" });
  const [hoveredAreaId, setHoveredAreaId] = useState<string | null>(null);
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  const pointerType = useRef<string>("mouse");

  useEffect(() => {
    let cancelled = false;
    fetch(withBasePath(SVG_URL))
      .then((res) => (res.ok ? res.text() : Promise.reject(new Error("fetch"))))
      .then((text) => {
        const map = parseSvg(text);
        if (cancelled) return;
        setLoad(map ? { status: "ready", map } : { status: "error" });
      })
      .catch(() => {
        if (!cancelled) setLoad({ status: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // 都道府県ID -> 地域ID
  const areaByPrefecture = useMemo(() => {
    const result: Record<string, string> = {};
    for (const region of regions) {
      for (const prefectureId of region.prefectureIds) {
        result[prefectureId] = region.id;
      }
    }
    return result;
  }, [regions]);

  const prefectureNames = useMemo(() => {
    const result: Record<string, string> = {};
    for (const prefecture of prefectures) result[prefecture.id] = prefecture.name;
    return result;
  }, [prefectures]);

  const tooltipData = useMemo(() => {
    const result: Record<string, AreaTooltipData> = {};
    for (const region of regions) {
      result[region.id] = {
        areaId: region.id,
        prefectures: region.prefectureIds.map((id) => prefectureNames[id] ?? id),
      };
    }
    return result;
  }, [regions, prefectureNames]);

  const activeAreaId = hoveredAreaId ?? selectedAreaId;
  const activeArea = areas.find((a) => a.id === activeAreaId);
  const activeTooltip = activeAreaId ? tooltipData[activeAreaId] : undefined;

  const goToArea = (areaId: string) => router.push(`/area/${areaId}`);

  const handleClick = (areaId: string) => {
    if (pointerType.current === "mouse") {
      goToArea(areaId);
      return;
    }
    // タッチ操作: 1回目で地域情報表示、2回目で遷移
    if (selectedAreaId === areaId) {
      goToArea(areaId);
    } else {
      setSelectedAreaId(areaId);
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <div className="rounded-lg border border-border bg-card p-2 sm:p-4">
        {load.status === "loading" ? (
          <p className="py-16 text-center text-muted">読み込み中...</p>
        ) : null}
        {load.status === "error" ? (
          <p role="alert" className="py-16 text-center text-muted">
            日本地図を表示できません
          </p>
        ) : null}
        {load.status === "ready" ? (
          <svg
            viewBox={load.map.viewBox}
            role="group"
            aria-label="日本地図"
            className="mx-auto h-auto w-full max-w-xl"
            onPointerDown={(e) => {
              pointerType.current = e.pointerType;
            }}
          >
            <g transform={load.map.outerTransform || undefined}>
              {load.map.shapes.map((shape) => {
                const areaId = areaByPrefecture[shape.prefectureId];
                if (!areaId) return null;
                const name = prefectureNames[shape.prefectureId] ?? shape.prefectureId;
                const areaName = areas.find((a) => a.id === areaId)?.name ?? "";
                const isActive = areaId === activeAreaId;
                return (
                  <g
                    key={shape.prefectureId}
                    id={`${PREFECTURE_ID_PREFIX}${shape.prefectureId}`}
                    transform={shape.transform || undefined}
                    role="link"
                    tabIndex={0}
                    aria-label={`${name}（${areaName}）`}
                    style={{
                      fill: isActive ? "var(--map-active)" : "var(--map-fill)",
                      stroke: "var(--map-stroke)",
                      strokeWidth: 1.5,
                      strokeLinejoin: "round",
                      cursor: "pointer",
                      transition: "fill 120ms",
                    }}
                    onPointerEnter={(e) => {
                      if (e.pointerType === "mouse") setHoveredAreaId(areaId);
                    }}
                    onPointerLeave={(e) => {
                      if (e.pointerType === "mouse") setHoveredAreaId(null);
                    }}
                    onFocus={() => setSelectedAreaId(areaId)}
                    onClick={() => handleClick(areaId)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") goToArea(areaId);
                    }}
                  >
                    <title>{name}</title>
                    {shape.elements.map((el, i) =>
                      el.tag === "path" ? (
                        <path key={i} d={el.value} />
                      ) : (
                        <polygon key={i} points={el.value} />
                      ),
                    )}
                  </g>
                );
              })}
            </g>
          </svg>
        ) : null}
      </div>

      <aside
        aria-live="polite"
        className="rounded-lg border border-border bg-card p-4"
      >
        <h2 className="text-sm text-muted">選択地域</h2>
        {activeArea && activeTooltip ? (
          <div className="mt-2">
            <p className="text-xl font-bold">{activeArea.name}</p>
            <ul className="mt-3 flex flex-wrap gap-2 text-sm">
              {activeTooltip.prefectures.map((name) => (
                <li
                  key={name}
                  className="rounded border border-border px-2 py-0.5"
                >
                  {name}
                </li>
              ))}
            </ul>
            <Link
              href={`/area/${activeArea.id}`}
              className="mt-4 inline-block text-accent underline"
            >
              {activeArea.name}の地域ページへ
            </Link>
          </div>
        ) : (
          <p className="mt-2 text-muted">
            地図の地域にカーソルを合わせる（スマホはタップ）と、都道府県が表示されます。
          </p>
        )}
      </aside>
    </div>
  );
}
