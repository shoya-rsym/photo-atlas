export type Photo = {
  id: string;
  title: string;
  image: string;
  thumbnail: string;
  /** YYYY-MM-DD。不明な場合は未設定 */
  date?: string;
  /** ISO8601 */
  createdAt: string;
  locationId: string;
  /** Tag.id の配列 */
  tags: string[];
  /** Character.id */
  characterId?: string;
  comment?: string;
  /** 撮影地点の代表写真。地点ごとに1枚を想定 */
  isCover?: boolean;
};
