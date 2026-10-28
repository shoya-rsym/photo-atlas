import { withBasePath } from "@/lib/paths";

export type ShapeElement = { tag: "path" | "polygon"; attr: string; value: string };
export type Box = { x0: number; y0: number; x1: number; y1: number };
export type PrefectureShape = {
  prefectureId: string;
  transform: string;
  translate: [number, number];
  elements: ShapeElement[];
  /** 遠隔離島を除いた、都道府県ローカル座標の外接矩形 */
  localBox: Box;
  /** 全要素を含む外接矩形 */
  fullBox: Box;
};
export type MapShapes = {
  viewBox: string;
  /** 都道府県グループの祖先に掛かっている transform（外側から順） */
  outerTransform: string;
  outer: Affine;
  shapes: PrefectureShape[];
};
type Affine = [number, number, number, number, number, number];

const SVG_URL = "/maps/japan-regions.svg";
const PREFECTURE_ID_PREFIX = "pref-";
/** 最大の島からこの比率（島の大きさ基準）以内の島を本体として扱う */
const NEAR_RATIO = 0.6;
const FIT_PADDING = 0.05;
/** 他の都道府県から、最大の都道府県の大きさ以上離れているものを飛び地（沖縄など）とみなす */
const OUTLIER_RATIO = 1;
const INSET_MARGIN = 16;

export { PREFECTURE_ID_PREFIX };

function numbersOf(value: string): number[] {
  return (value.match(/-?\d*\.?\d+(?:e-?\d+)?/gi) ?? []).map(Number);
}

function boxOf(value: string): Box | null {
  const n = numbersOf(value);
  if (n.length < 4) return null;
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (let i = 0; i + 1 < n.length; i += 2) {
    x0 = Math.min(x0, n[i]);
    x1 = Math.max(x1, n[i]);
    y0 = Math.min(y0, n[i + 1]);
    y1 = Math.max(y1, n[i + 1]);
  }
  return { x0, y0, x1, y1 };
}

function unionBox(list: Box[]): Box {
  return {
    x0: Math.min(...list.map((b) => b.x0)),
    y0: Math.min(...list.map((b) => b.y0)),
    x1: Math.max(...list.map((b) => b.x1)),
    y1: Math.max(...list.map((b) => b.y1)),
  };
}

function boxGap(a: Box, b: Box): number {
  const dx = Math.max(a.x0 - b.x1, b.x0 - a.x1, 0);
  const dy = Math.max(a.y0 - b.y1, b.y0 - a.y1, 0);
  return Math.max(dx, dy);
}

const boxArea = (b: Box) => (b.x1 - b.x0) * (b.y1 - b.y0);
const boxSize = (b: Box) => Math.max(b.x1 - b.x0, b.y1 - b.y0);

/** 最大の島とその近傍の島のみを本体とする（遠隔離島を除外） */
function mainBox(elements: ShapeElement[]): { main: Box; full: Box } {
  const boxes = elements.flatMap((el) => {
    const b = boxOf(el.value);
    return b ? [b] : [];
  });
  const largest = boxes.reduce((a, b) => (boxArea(b) > boxArea(a) ? b : a));
  const near = boxes.filter((b) => boxGap(b, largest) <= boxSize(largest) * NEAR_RATIO);
  return { main: unionBox(near), full: unionBox(boxes) };
}


function parseAffine(transform: string): Affine {
  const m = /matrix\(([^)]*)\)/.exec(transform);
  const n = m ? numbersOf(m[1]) : [];
  return n.length === 6 ? [n[0], n[1], n[2], n[3], n[4], n[5]] : [1, 0, 0, 1, 0, 0];
}

function parseTranslate(transform: string): [number, number] {
  const m = /translate\(([^)]*)\)/.exec(transform);
  const n = m ? numbersOf(m[1]) : [];
  return [n[0] ?? 0, n[1] ?? 0];
}

function applyAffine(t: Affine, x: number, y: number): [number, number] {
  return [t[0] * x + t[2] * y + t[4], t[1] * x + t[3] * y + t[5]];
}

function composeAffine(transforms: string[]): Affine {
  // 外側 → 内側の順に適用されるため、内側から外側へ座標変換する
  return transforms.reduceRight<Affine>(
    (acc, t) => {
      const a = parseAffine(t);
      return [
        a[0] * acc[0] + a[2] * acc[1],
        a[1] * acc[0] + a[3] * acc[1],
        a[0] * acc[2] + a[2] * acc[3],
        a[1] * acc[2] + a[3] * acc[3],
        a[0] * acc[4] + a[2] * acc[5] + a[4],
        a[1] * acc[4] + a[3] * acc[5] + a[5],
      ];
    },
    [1, 0, 0, 1, 0, 0],
  );
}

function collectElements(group: Element): ShapeElement[] {
  const elements: ShapeElement[] = [];
  group.querySelectorAll("path, polygon").forEach((node) => {
    if (node.tagName.toLowerCase() === "path") {
      const value = node.getAttribute("d");
      if (value) elements.push({ tag: "path", attr: "d", value });
    } else {
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
  let outerTransforms: string[] = [];
  doc.querySelectorAll(`[id^="${PREFECTURE_ID_PREFIX}"]`).forEach((node) => {
    const elements = collectElements(node);
    if (elements.length === 0) return;
    if (shapes.length === 0) {
      const transforms: string[] = [];
      for (let p = node.parentElement; p && p !== root; p = p.parentElement) {
        const t = p.getAttribute("transform");
        if (t) transforms.unshift(t);
      }
      outerTransforms = transforms;
    }
    const transform = node.getAttribute("transform") ?? "";
    const { main, full } = mainBox(elements);
    shapes.push({
      prefectureId: (node.getAttribute("id") ?? "").slice(PREFECTURE_ID_PREFIX.length),
      transform,
      translate: parseTranslate(transform),
      elements,
      localBox: main,
      fullBox: full,
    });
  });

  const viewBox = root.getAttribute("viewBox");
  if (!viewBox || shapes.length === 0) return null;
  return {
    viewBox,
    outerTransform: outerTransforms.join(" "),
    outer: composeAffine(outerTransforms),
    shapes,
  };
}

let cache: Promise<MapShapes | null> | null = null;

export function loadJapanSvg(): Promise<MapShapes | null> {
  if (!cache) {
    cache = fetch(withBasePath(SVG_URL))
      .then((res) => (res.ok ? res.text() : null))
      .then((text) => (text ? parseSvg(text) : null))
      .catch(() => null);
    cache.then((map) => {
      if (!map) cache = null;
    });
  }
  return cache;
}

export type FitTarget = {
  prefectureIds: string[];
  clip?: [number, number][];
};

/** 指定した描画単位が収まる viewBox を返す。対象が無ければ全体の viewBox */
export function fitViewBox(
  map: MapShapes,
  targets: FitTarget[],
  offsets: Record<string, [number, number]> = {},
): string {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const target of targets) {
    for (const prefectureId of target.prefectureIds) {
      const shape = map.shapes.find((s) => s.prefectureId === prefectureId);
      if (!shape) continue;
      const [ox, oy] = offsets[prefectureId] ?? [0, 0];
      const b = offsets[prefectureId] ? shape.fullBox : shape.localBox;
      const translate = shape.translate;
      const w = b.x1 - b.x0;
      const h = b.y1 - b.y0;
      const nx = target.clip?.map((p) => p[0]) ?? [0, 1];
      const ny = target.clip?.map((p) => p[1]) ?? [0, 1];
      const corners: [number, number][] = [
        [b.x0 + Math.min(...nx) * w, b.y0 + Math.min(...ny) * h],
        [b.x0 + Math.max(...nx) * w, b.y0 + Math.max(...ny) * h],
      ];
      for (const [cx, cy] of corners) {
        const [px, py] = applyAffine(
          map.outer,
          cx + translate[0] + ox,
          cy + translate[1] + oy,
        );
        x0 = Math.min(x0, px);
        y0 = Math.min(y0, py);
        x1 = Math.max(x1, px);
        y1 = Math.max(y1, py);
      }
    }
  }
  if (!Number.isFinite(x0)) return map.viewBox;
  const padX = (x1 - x0) * FIT_PADDING + 4;
  const padY = (y1 - y0) * FIT_PADDING + 4;
  return `${x0 - padX} ${y0 - padY} ${x1 - x0 + padX * 2} ${y1 - y0 + padY * 2}`;
}

/**
 * 拡大表示用の配置補正。他から大きく離れた都道府県（沖縄の挿入枠など）を
 * 本体の南西側へ移し、表示範囲が不必要に広がるのを防ぐ。補正が必要なものだけ返す
 */
export function computeOffsets(
  map: MapShapes,
  prefectureIds: string[],
): Record<string, [number, number]> {
  const items = prefectureIds.flatMap((id) => {
    const shape = map.shapes.find((s) => s.prefectureId === id);
    if (!shape) return [];
    const [tx, ty] = shape.translate;
    const b = shape.localBox;
    return [
      { id, shape, box: { x0: b.x0 + tx, y0: b.y0 + ty, x1: b.x1 + tx, y1: b.y1 + ty } },
    ];
  });
  if (items.length < 2) return {};
  const anchor = items.reduce((a, b) => (boxArea(b.box) > boxArea(a.box) ? b : a));
  const outliers = items.filter(
    (i) => boxGap(i.box, anchor.box) > boxSize(anchor.box) * OUTLIER_RATIO,
  );
  if (outliers.length === 0) return {};
  const rest = unionBox(items.filter((i) => !outliers.includes(i)).map((i) => i.box));
  const result: Record<string, [number, number]> = {};
  let cursorX = rest.x0;
  for (const o of outliers) {
    const f = o.shape.fullBox;
    const [tx, ty] = o.shape.translate;
    result[o.id] = [
      cursorX - (f.x0 + tx),
      rest.y1 + INSET_MARGIN - (f.y0 + ty),
    ];
    cursorX += f.x1 - f.x0 + INSET_MARGIN;
  }
  return result;
}

/** 正規化クリップ座標を都道府県ローカル座標の points 文字列へ変換 */
export function clipPoints(shape: PrefectureShape, clip: [number, number][]): string {
  const { localBox: b } = shape;
  return clip
    .map(([nx, ny]) => `${b.x0 + nx * (b.x1 - b.x0)},${b.y0 + ny * (b.y1 - b.y0)}`)
    .join(" ");
}
