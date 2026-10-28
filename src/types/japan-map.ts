import type { PreviewInfo } from "./preview";

export type JapanMapRegion = {
  id: string;
  name: string;
  prefectureIds: string[];
};

export type AreaTooltipData = {
  areaId: string;
  prefectures: string[];
};

export type Statistics = {
  photoCount: number;
  locationCount: number;
  prefectureCount: number;
  characterCount: number;
};

/** 地図上でHover/選択/遷移できる描画単位（地域・都道府県・サブ地域） */
export type MapUnit = {
  id: string;
  name: string;
  href: string;
  prefectureIds: string[];
  /** 都道府県の一部のみを描画する場合の正規化クリップ座標 */
  clip?: [number, number][];
  /** 補足表示（都道府県名など） */
  members: string[];
  preview: PreviewInfo;
};
