const PREFECTURE_IDS_BY_ISO_CODE = {
  "01": "hokkaido",
  "02": "aomori",
  "03": "iwate",
  "04": "miyagi",
  "05": "akita",
  "06": "yamagata",
  "07": "fukushima",
  "08": "ibaraki",
  "09": "tochigi",
  "10": "gunma",
  "11": "saitama",
  "12": "chiba",
  "13": "tokyo",
  "14": "kanagawa",
  "15": "niigata",
  "16": "toyama",
  "17": "ishikawa",
  "18": "fukui",
  "19": "yamanashi",
  "20": "nagano",
  "21": "gifu",
  "22": "shizuoka",
  "23": "aichi",
  "24": "mie",
  "25": "shiga",
  "26": "kyoto",
  "27": "osaka",
  "28": "hyogo",
  "29": "nara",
  "30": "wakayama",
  "31": "tottori",
  "32": "shimane",
  "33": "okayama",
  "34": "hiroshima",
  "35": "yamaguchi",
  "36": "tokushima",
  "37": "kagawa",
  "38": "ehime",
  "39": "kochi",
  "40": "fukuoka",
  "41": "saga",
  "42": "nagasaki",
  "43": "kumamoto",
  "44": "oita",
  "45": "miyazaki",
  "46": "kagoshima",
  "47": "okinawa",
};

export function prefectureIdFromResult(result, prefectures) {
  const values = [...Object.values(result.address ?? {}), result.displayName].filter(
    (value) => typeof value === "string",
  );
  const matched = prefectures.find((prefecture) => values.some((value) => value.includes(prefecture.name)));
  if (matched) return matched.id;
  const isoCode = result.address?.["ISO3166-2-lvl4"]?.match(/^JP-(\d{2})$/)?.[1];
  const id = isoCode ? PREFECTURE_IDS_BY_ISO_CODE[isoCode] : undefined;
  return prefectures.some((prefecture) => prefecture.id === id) ? id : undefined;
}

export function locationIdFromResult(result, locations) {
  const usedIds = new Set(locations.map((location) => location.id));
  const base =
    result.osmType && result.osmId
      ? `osm_${result.osmType}_${result.osmId}`.toLowerCase().replace(/[^a-z0-9_]/g, "_")
      : "location";
  if (base !== "location" && !usedIds.has(base)) return base;
  for (let number = 1; ; number += 1) {
    const candidate = base === "location" ? `location_${String(number).padStart(3, "0")}` : `${base}_${number}`;
    if (!usedIds.has(candidate)) return candidate;
  }
}
