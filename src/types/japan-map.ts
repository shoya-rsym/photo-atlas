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
};
