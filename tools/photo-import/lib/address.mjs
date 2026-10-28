function addressPart(address, key) {
  const value = address?.[key];
  return typeof value === "string" ? value.trim().replace(/\s+/g, "") : "";
}

export function formatJapaneseAddress(address, prefectureName) {
  const parts = [];
  const add = (value) => {
    if (!value || parts.some((part) => part.includes(value))) return;
    const parentIndex = parts.findIndex((part) => value.includes(part));
    if (parentIndex >= 0) parts[parentIndex] = value;
    else parts.push(value);
  };

  add(prefectureName || addressPart(address, "state") || addressPart(address, "province"));
  for (const key of ["city", "city_district", "county", "town", "village", "municipality"]) {
    add(addressPart(address, key));
  }

  let hasTownName = false;
  for (const key of ["suburb", "neighbourhood", "quarter", "hamlet", "residential"]) {
    const value = addressPart(address, key);
    if (value) hasTownName = true;
    add(value);
  }
  if (!hasTownName) add(addressPart(address, "road"));
  add(addressPart(address, "house_number"));
  return parts.join("");
}
