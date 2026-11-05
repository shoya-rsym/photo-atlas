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
  variant?: "default" | "home" | "area";
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
type PreviewPosition = {
  left: number;
  top: number;
  width: number;
  maxHeight: number;
};

const PREVIEW_CARD_WIDTH = 256;
const PREVIEW_CARD_HEIGHT = 320;
const PREVIEW_GAP = 12;
const PREVIEW_MARGIN = 8;

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
  const [previewPosition, setPreviewPosition] =
    useState<PreviewPosition | null>(null);
  const mapSurfaceRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const pointerType = useRef<string>("mouse");
  const previewPhotoCount =
    variant === "home" ? 2 : PREVIEW_PHOTO_COUNT;

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

  const updatePreviewPosition = (clientX: number, clientY: number) => {
    const surface = mapSurfaceRef.current?.getBoundingClientRect();
    if (!surface) return;

    const width = Math.min(
      PREVIEW_CARD_WIDTH,
      Math.max(surface.width - PREVIEW_MARGIN * 2, 0),
    );
    const height = Math.min(
      PREVIEW_CARD_HEIGHT,
      Math.max(surface.height - PREVIEW_MARGIN * 2, 0),
    );
    const x = clientX - surface.left;
    const y = clientY - surface.top;
    const fitsRight =
      x + PREVIEW_GAP + width <= surface.width - PREVIEW_MARGIN;
    const fitsBelow =
      y + PREVIEW_GAP + height <= surface.height - PREVIEW_MARGIN;
    const left = fitsRight ? x + PREVIEW_GAP : x - PREVIEW_GAP - width;
    const top = fitsBelow ? y + PREVIEW_GAP : y - PREVIEW_GAP - height;

    setPreviewPosition({
      left: Math.max(
        PREVIEW_MARGIN,
        Math.min(left, surface.width - width - PREVIEW_MARGIN),
      ),
      top: Math.max(
        PREVIEW_MARGIN,
        Math.min(top, surface.height - height - PREVIEW_MARGIN),
      ),
      width,
      maxHeight: height,
    });
  };

  const reveal = (id: string | null) => {
    const unit = units.find((u) => u.id === id);
    setShown(
      unit
        ? { id: unit.id, photos: pickRandom(unit.preview.photos, previewPhotoCount) }
        : null,
    );
  };

  const handleClick = (unit: MapUnit, clientX: number, clientY: number) => {
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
      if (variant === "home") updatePreviewPosition(clientX, clientY);
    }
  };

  const selectedUnit = units.find((u) => u.id === selectedId);

  return (
    <div
      className={
        variant === "home"
          ? ""
          : variant === "area"
            ? "grid items-start gap-4 md:grid-cols-[minmax(0,1.45fr)_minmax(230px,0.9fr)]"
            : "grid items-start gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]"
      }
    >
      <div className="rounded-lg border border-border bg-card p-2 sm:p-4">
        <div ref={mapSurfaceRef} className="relative">
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
              className={`mx-auto h-auto w-full ${variant === "home" ? "max-h-[42rem] max-w-none" : variant === "area" ? "max-h-[34rem] max-w-3xl" : "max-h-[70vh] max-w-xl"}`}
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
                      if (variant === "home") {
                        updatePreviewPosition(e.clientX, e.clientY);
                      }
                    }}
                    onPointerLeave={(e) => {
                      if (e.pointerType !== "mouse") return;
                      if (
                        variant === "home" &&
                        e.relatedTarget instanceof Node &&
                        previewRef.current?.contains(e.relatedTarget)
                      ) {
                        return;
                      }
                      setHoveredId(null);
                      reveal(selectedId);
                    }}
                    onFocus={(e) => {
                      setSelectedId(unit.id);
                      reveal(unit.id);
                      if (variant === "home") {
                        const bounds = e.currentTarget.getBoundingClientRect();
                        updatePreviewPosition(
                          bounds.left + bounds.width / 2,
                          bounds.top + bounds.height / 2,
                        );
                      }
                    }}
                    onClick={(e) =>
                      handleClick(unit, e.clientX, e.clientY)
                    }
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
          {variant === "home" &&
          activeUnit &&
          shown?.id === activeUnit.id &&
          previewPosition ? (
            <div
              ref={previewRef}
              aria-live="polite"
              className="pointer-events-auto absolute z-20 hidden overflow-y-auto rounded-lg border border-border bg-card/95 p-3 shadow-xl backdrop-blur-sm md:block"
              style={{
                left: previewPosition.left,
                top: previewPosition.top,
                width: previewPosition.width,
                maxHeight: previewPosition.maxHeight,
              }}
              onPointerLeave={(e) => {
                if (e.pointerType !== "mouse") return;
                const nextTarget = e.relatedTarget;
                if (
                  nextTarget instanceof Element &&
                  nextTarget.closest(".map-unit[role='link']")
                ) {
                  return;
                }
                setHoveredId(null);
                reveal(selectedId);
              }}
            >
              <PreviewCard
                preview={activeUnit.preview}
                photos={shown.photos}
                showLocationCount={false}
                className="space-y-1"
              />
              {activeUnit.members.length > 0 ? (
                <ul className="mt-2 flex flex-wrap gap-1.5 text-xs">
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
                className="mt-2 inline-block text-sm font-semibold text-accent underline underline-offset-4"
              >
                {activeUnit.name}を辿る
              </Link>
            </div>
          ) : null}
        </div>
        {(variant === "home" || variant === "area") &&
        load.status === "ready" ? (
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

      {variant === "home" &&
      activeUnit &&
      shown?.id === activeUnit.id ? (
        <aside
          aria-live="polite"
          className="mt-3 rounded-lg border border-border bg-card p-3 md:hidden"
        >
          <PreviewCard
            preview={activeUnit.preview}
            photos={shown.photos}
            showLocationCount={false}
          />
          {activeUnit.members.length > 0 ? (
            <ul className="mt-2 flex flex-wrap gap-1.5 text-xs">
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
            className="mt-2 inline-block text-sm font-semibold text-accent underline underline-offset-4"
          >
            {activeUnit.name}を辿る
          </Link>
        </aside>
      ) : null}

      {variant !== "home" ? (
        <aside
          aria-live="polite"
          className="rounded-lg border border-border bg-card p-4"
        >
          {activeUnit && shown?.id === activeUnit.id ? (
            <div>
              <PreviewCard
                preview={activeUnit.preview}
                photos={shown.photos}
              />
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
                className="mt-4 inline-block font-semibold text-accent underline underline-offset-4"
              >
                {activeUnit.name}を辿る
              </Link>
            </div>
          ) : (
            <div className="flex h-full flex-col justify-center">
              <p className="hidden text-muted md:block">{hint}</p>
              <p className="text-sm leading-6 text-muted md:hidden">
                地図をタップすると写真がひらきます。もう一度タップすると場所へ進みます。
              </p>
            </div>
          )}
        </aside>
      ) : null}
    </div>
  );
}
