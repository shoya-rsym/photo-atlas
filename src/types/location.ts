export type Location = {
  id: string;
  name: string;
  prefectureId: string;
  /** 都道府県内の細分地域（北海道の道央など）。任意 */
  subregionId?: string;
  address?: string;
  lat?: number;
  lng?: number;
};
