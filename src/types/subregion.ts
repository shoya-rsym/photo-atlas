export type Subregion = {
  id: string;
  name: string;
  prefectureId: string;
  /** 都道府県の外接矩形を 0〜1 に正規化した座標で表す、地図上の描画範囲 */
  mapClip?: [number, number][];
};
