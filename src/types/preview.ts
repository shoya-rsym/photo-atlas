export type PreviewPhoto = {
  id: string;
  title: string;
  thumbnail: string;
};

/** Hover時に表示する要約。photos はランダム抽出の候補 */
export type PreviewInfo = {
  name: string;
  photoCount: number;
  locationCount: number;
  photos: PreviewPhoto[];
};
