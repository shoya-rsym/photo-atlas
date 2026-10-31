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
  variant?: "default" | "home";
  idPrefix?: string;
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

function unitSvgId(idPrefix: string, unitId: string): string {
  return `unit-${idPrefix ? `${idPrefix}-` : ""}${unitId}`;
}

function clipPathId(
  idPrefix: string,
  unitId: string,
  prefectureId: string,
): string {
  return `clip-${idPrefix ? `${idPrefix}-` : ""}${unitId}-${prefectureId}`;
}

function prefectureClipPathId(idPrefix: string, prefectureId: string): string {
  return `clip-shape-${idPrefix ? `${idPrefix}-` : ""}${prefectureId}`;
}

type Offsets = Record<string, [number, number]>;

function UnitShapes({
  unit,
  map,
  offsets,
  idPrefix,
}: {
  unit: MapUnit;
  map: MapShapes;
  offsets: Offsets;
  idPrefix: string;
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
              unit.clip
                ? `url(#${clipPathId(idPrefix, unit.id, shape.prefectureId)})`
                : undefined
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
  idPrefix,
}: {
  unit: MapUnit;
  map: MapShapes;
  offsets: Offsets;
  tone: Tone;
  idPrefix: string;
}) {
  const s = TONE_STYLE[tone];
  return (
    <g
      className="map-unit"
      pointerEvents="none"
      style={{ fill: s.fill, stroke: s.stroke, strokeWidth: s.width }}
    >
      <UnitShapes
        unit={unit}
        map={map}
        offsets={offsets}
        idPrefix={idPrefix}
      />
    </g>
  );
}

function SubregionBoundaries({
  units,
  map,
  offsets,
  idPrefix,
}: {
  units: MapUnit[];
  map: MapShapes;
  offsets: Offsets;
  idPrefix: string;
}) {
  return (
    <g
      fill="none"
      stroke="var(--map-stroke)"
      strokeWidth={1}
      pointerEvents="none"
    >
      {units.flatMap((unit) =>
        unit.clip
          ? unitShapes(unit, map).map((shape) => {
              const offset = offsets[shape.prefectureId];
              const transform = offset
                ? `translate(${offset[0]} ${offset[1]}) ${shape.transform}`
                : shape.transform;
              return (
                <g
                  key={`${unit.id}-${shape.prefectureId}`}
                  transform={transform || undefined}
                  clipPath={`url(#${prefectureClipPathId(idPrefix, shape.prefectureId)})`}
                >
                  <polygon points={clipPoints(shape, unit.clip ?? [])} />
                </g>
              );
            })
          : [],
      )}
    </g>
  );
}

export default function JapanMap({
  units,
  fit = "all",
  ariaLabel,
  hint = "地域を選ぶと、そこに残る写真がひらきます。",
  variant = "default",
  idPrefix = "",
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
    <div
      className={`grid gap-4 ${variant === "home" ? "md:grid-cols-[minmax(0,1.45fr)_minmax(230px,0.9fr)]" : "md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]"}`}
    >
      <div className="rounded-lg border border-border bg-card p-2 sm:p-4">
        {load.status === "loading" ? (
          <p className="py-16 text-center text-muted">地図をひらいています…</p>
        ) : null}
        {load.status === "error" ? (
          <p role="alert" className="py-16 text-center text-muted">
            日本地図を表示できませんでした
          </p>
        ) : null}
        {load.status === "ready" ? (
          <svg
            viewBox={viewBox}
            role="group"
            aria-label={ariaLabel}
            className={`mx-auto h-auto w-full ${variant === "home" ? "max-h-[34rem] max-w-3xl" : "max-h-[70vh] max-w-xl"}`}
            onPointerDown={(e) => {
              pointerType.current = e.pointerType;
            }}
          >
            <defs>
              {load.map.shapes
                .filter((shape) =>
                  units.some(
                    (unit) =>
                      unit.clip && unit.prefectureIds.includes(shape.prefectureId),
                  ),
                )
                .map((shape) => (
                  <clipPath
                    key={shape.prefectureId}
                    id={prefectureClipPathId(idPrefix, shape.prefectureId)}
                  >
                    {shape.elements.map((element, index) =>
                      element.tag === "path" ? (
                        <path key={index} d={element.value} />
                      ) : (
                        <polygon key={index} points={element.value} />
                      ),
                    )}
                  </clipPath>
                ))}
              {units.flatMap((unit) =>
                unit.clip
                  ? unitShapes(unit, load.map).map((shape) => (
                      <clipPath
                        key={`${unit.id}-${shape.prefectureId}`}
                        id={clipPathId(idPrefix, unit.id, shape.prefectureId)}
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
                    id={unitSvgId(idPrefix, unit.id)}
                    className="map-unit"
                    role="link"
                    tabIndex={0}
                    aria-label={unit.name}
                    style={{
                      fill:
                        unit.preview.photoCount > 0
                          ? "var(--map-fill-photos)"
                          : s.fill,
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
                    <UnitShapes
                      unit={unit}
                      map={load.map}
                      offsets={offsets}
                      idPrefix={idPrefix}
                    />
                  </g>
                );
              })}
              <SubregionBoundaries
                units={units}
                map={load.map}
                offsets={offsets}
                idPrefix={idPrefix}
              />
              {selectedUnit ? (
                <Overlay
                  unit={selectedUnit}
                  map={load.map}
                  offsets={offsets}
                  tone="selected"
                  idPrefix={idPrefix}
                />
              ) : null}
              {hoveredId && activeUnit && hoveredId !== selectedId ? (
                <Overlay
                  unit={activeUnit}
                  map={load.map}
                  offsets={offsets}
                  tone="hover"
                  idPrefix={idPrefix}
                />
              ) : null}
            </g>
          </svg>
        ) : null}
        {variant === "home" && load.status === "ready" ? (
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 px-2 text-xs text-muted">
            <span>
              <span
                className="map-legend-swatch mr-2"
                style={{ backgroundColor: "var(--map-fill-photos)" }}
              />
              写真が残る場所
            </span>
            <span>
              <span
                className="map-legend-swatch mr-2"
                style={{ backgroundColor: "var(--map-fill)" }}
              />
              まだ写真のない場所
            </span>
            <span className="hidden text-accent md:inline">
              地域にカーソルを重ねて写真をひらく
            </span>
            <span className="text-accent md:hidden">タップして写真をひらく</span>
          </div>
        ) : null}
      </div>

      <aside
        aria-live="polite"
        className={`rounded-lg border border-border bg-card p-4 ${variant === "home" ? "min-h-64 md:p-5" : ""}`}
      >
        {activeUnit && shown && shown.id === activeUnit.id ? (
          <div>
            <PreviewCard
              preview={activeUnit.preview}
              photos={shown.photos}
              className={variant === "home" ? "space-y-1" : undefined}
            />
            {activeUnit.members.length > 0 ? (
              <ul className={`mt-3 flex flex-wrap gap-2 text-sm ${variant === "home" ? "text-xs" : ""}`}>
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
              className="mt-4 inline-block font-semibold text-accent underline underline-offset-4"
            >
              {activeUnit.name}を辿る
            </Link>
          </div>
        ) : (
          <div className="flex h-full flex-col justify-center">
            {variant === "home" ? (
              <>
                <p className="text-lg font-bold">地図から写真を辿る</p>
                <p className="mt-2 hidden text-sm leading-6 text-muted md:block">
                  地域にカーソルを重ねると、そこに残る写真がひらきます。
                  選ぶと、その地域へ辿れます。
                </p>
                <p className="mt-2 text-sm leading-6 text-muted md:hidden">
                  地域をタップすると写真がひらきます。もう一度タップすると地域へ進みます。
                </p>
                <p className="mt-4 hidden text-xs text-muted md:block">{hint}</p>
              </>
            ) : (
              <>
                <p className="hidden text-muted md:block">{hint}</p>
                <p className="text-sm leading-6 text-muted md:hidden">
                  地図をタップすると写真がひらきます。もう一度タップすると場所へ進みます。
                </p>
              </>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}
