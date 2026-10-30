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
  /** Character.id の配列。キャラクター未設定の場合は省略 */
  characterIds?: string[];
  comment?: string;
  /** 写真から閲覧者の想像を広げる短い一文 */
  photoMemory?: string;
  /** 管理者が共有するお気に入り写真 */
  isFavorite?: boolean;
  /** Favorite Memoryを採用した日時 */
  photoMemoryGeneratedAt?: string;
  /** Memoryの設定元 */
  photoMemorySource?: "copilot" | "manual";
  /** 撮影地点の代表写真。地点ごとに1枚を想定 */
  isCover?: boolean;
};
