import { subregions } from "@/lib/data";
import type { Location } from "@/types";

export function getSubregionIdForLocation(
  location: Pick<Location, "prefectureId" | "subregionId" | "address">,
): string | undefined {
  if (location.subregionId) return location.subregionId;
  if (!location.address) return undefined;

  const address = location.address.replace(/\s+/g, "");
  const matches = subregions.filter(
    (subregion) =>
      subregion.prefectureId === location.prefectureId &&
      subregion.addressKeywords?.some((keyword) => address.includes(keyword)),
  );

  if (matches.length > 1) {
    throw new Error(
      `住所から複数の細分地域を判定しました: ${location.address}`,
    );
  }
  return matches[0]?.id;
}
