"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import PreviewCard from "@/components/PreviewCard";
import {
  clipPoints,
  computeOffsets,
  fitViewBox,
  loadJapanSvg,
  type MapShapes,
  type PrefectureShape,
} from "@/lib/japan-svg";
import { pickRandom } from "@/lib/random";
import type { MapUnit, PreviewPhoto } from "@/types";

type Props = {
  units: MapUnit[];
  /** all: 日本全体 / units: 渡した描画単位が収まる範囲に拡大 */
  fit?: "all" | "units";
  ariaLabel: string;
  hint?: string;
};

type LoadState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; map: MapShapes };

const PREVIEW_PHOTO_COUNT = 4;

type Tone = "base" | "hover" | "selected";

const TONE_STYLE: Record<Tone, { fill: string; stroke: string; width: number }> = {
  base: { fill: "var(--map-fill)", stroke: "var(--map-stroke)", width: 1 },
  hover: { fill: "var(--map-hover)", stroke: "var(--map-hover-stroke)", width: 2 },
  selected: {
    fill: "var(--map-selected)",
    stroke: "var(--map-hover-stroke)",
    width: 2,
  },
};

function unitShapes(unit: MapUnit, map: MapShapes): PrefectureShape[] {
  return unit.prefectureIds.flatMap((id) => {
    const shape = map.shapes.find((s) => s.prefectureId === id);
    return shape ? [shape] : [];
  });
}

type Offsets = Record<string, [number, number]>;

function UnitShapes({
  unit,
  map,
  offsets,
}: {
  unit: MapUnit;
  map: MapShapes;
  offsets: Offsets;
}) {
  return (
    <>
      {unitShapes(unit, map).map((shape) => {
        const offset = offsets[shape.prefectureId];
        const transform = offset
          ? `translate(${offset[0]} ${offset[1]}) ${shape.transform}`
          : shape.transform;
        return (
          <g
            key={shape.prefectureId}
            data-prefecture={shape.prefectureId}
            transform={transform || undefined}
            clipPath={
              unit.clip ? `url(#clip-${unit.id}-${shape.prefectureId})` : undefined
            }
          >
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
    </>
  );
}

function Overlay({
  unit,
  map,
  offsets,
  tone,
}: {
  unit: MapUnit;
  map: MapShapes;
  offsets: Offsets;
  tone: Tone;
}) {
  const s = TONE_STYLE[tone];
  return (
    <g
      className="map-unit"
      pointerEvents="none"
      style={{ fill: s.fill, stroke: s.stroke, strokeWidth: s.width }}
    >
      <UnitShapes unit={unit} map={map} offsets={offsets} />
    </g>
  );
}

export default function JapanMap({
  units,
  fit = "all",
  ariaLabel,
  hint = "地図の地域にカーソルを合わせる（スマホはタップ）と、写真のプレビューが表示されます。",
}: Props) {
  const router = useRouter();
  const [load, setLoad] = useState<LoadState>({ status: "loading" });
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [shown, setShown] = useState<{ id: string; photos: PreviewPhoto[] } | null>(
    null,
  );
  const pointerType = useRef<string>("mouse");

  useEffect(() => {
    let cancelled = false;
    loadJapanSvg().then((map) => {
      if (!cancelled) setLoad(map ? { status: "ready", map } : { status: "error" });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const offsets = useMemo(() => {
    if (load.status !== "ready" || fit !== "units") return {};
    return computeOffsets(load.map, units.flatMap((u) => u.prefectureIds));
  }, [load, fit, units]);

  const viewBox = useMemo(() => {
    if (load.status !== "ready") return "";
    return fit === "units"
      ? fitViewBox(load.map, units, offsets)
      : load.map.viewBox;
  }, [load, fit, units, offsets]);

  const activeId = hoveredId ?? selectedId;
  const activeUnit = units.find((u) => u.id === activeId);

  const reveal = (id: string | null) => {
    const unit = units.find((u) => u.id === id);
    setShown(
      unit
        ? { id: unit.id, photos: pickRandom(unit.preview.photos, PREVIEW_PHOTO_COUNT) }
        : null,
    );
  };

  const handleClick = (unit: MapUnit) => {
    if (pointerType.current === "mouse") {
      router.push(unit.href);
      return;
    }
    // タッチ操作: 1回目でプレビュー表示、2回目で遷移
    if (selectedId === unit.id) {
      router.push(unit.href);
    } else {
      setSelectedId(unit.id);
      reveal(unit.id);
    }
  };

  const selectedUnit = units.find((u) => u.id === selectedId);

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
            viewBox={viewBox}
            role="group"
            aria-label={ariaLabel}
            className="mx-auto h-auto max-h-[70vh] w-full max-w-xl"
            onPointerDown={(e) => {
              pointerType.current = e.pointerType;
            }}
          >
            <defs>
              {units.flatMap((unit) =>
                unit.clip
                  ? unitShapes(unit, load.map).map((shape) => (
                      <clipPath
                        key={`${unit.id}-${shape.prefectureId}`}
                        id={`clip-${unit.id}-${shape.prefectureId}`}
                      >
                        <polygon points={clipPoints(shape, unit.clip ?? [])} />
                      </clipPath>
                    ))
                  : [],
              )}
            </defs>
            <g transform={load.map.outerTransform || undefined}>
              {units.map((unit) => {
                const s = TONE_STYLE.base;
                return (
                  <g
                    key={unit.id}
                    id={`unit-${unit.id}`}
                    className="map-unit"
                    role="link"
                    tabIndex={0}
                    aria-label={unit.name}
                    style={{
                      fill: s.fill,
                      stroke: s.stroke,
                      strokeWidth: s.width,
                      cursor: "pointer",
                      opacity: activeId && activeId !== unit.id ? 0.75 : 1,
                      transition: "opacity 120ms",
                    }}
                    onPointerEnter={(e) => {
                      if (e.pointerType !== "mouse") return;
                      setHoveredId(unit.id);
                      reveal(unit.id);
                    }}
                    onPointerLeave={(e) => {
                      if (e.pointerType !== "mouse") return;
                      setHoveredId(null);
                      reveal(selectedId);
                    }}
                    onFocus={() => {
                      setSelectedId(unit.id);
                      reveal(unit.id);
                    }}
                    onClick={() => handleClick(unit)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") router.push(unit.href);
                    }}
                  >
                    <title>{unit.name}</title>
                    <UnitShapes unit={unit} map={load.map} offsets={offsets} />
                  </g>
                );
              })}
              {selectedUnit ? (
                <Overlay
                  unit={selectedUnit}
                  map={load.map}
                  offsets={offsets}
                  tone="selected"
                />
              ) : null}
              {hoveredId && activeUnit && hoveredId !== selectedId ? (
                <Overlay
                  unit={activeUnit}
                  map={load.map}
                  offsets={offsets}
                  tone="hover"
                />
              ) : null}
            </g>
          </svg>
        ) : null}
      </div>

      <aside
        aria-live="polite"
        className="rounded-lg border border-border bg-card p-4"
      >
        {activeUnit && shown && shown.id === activeUnit.id ? (
          <div>
            <PreviewCard preview={activeUnit.preview} photos={shown.photos} />
            {activeUnit.members.length > 0 ? (
              <ul className="mt-3 flex flex-wrap gap-2 text-sm">
                {activeUnit.members.map((name) => (
                  <li
                    key={name}
                    className="rounded border border-border px-2 py-0.5"
                  >
                    {name}
                  </li>
                ))}
              </ul>
            ) : null}
            <Link
              href={activeUnit.href}
              className="mt-4 inline-block text-accent underline"
            >
              {activeUnit.name}のページへ
            </Link>
          </div>
        ) : (
          <p className="text-muted">{hint}</p>
        )}
      </aside>
    </div>
  );
}
