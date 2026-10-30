const NEUTRAL_CANDIDATES = [
  "人の流れが落ち着き、周囲に静かな間が生まれていた。",
  "光がやわらぎ、景色の色合いが穏やかに見える時間帯だった。",
  "遠くのざわめきが薄れ、周囲の音も少しずつ落ち着いていた。",
  "風が通り抜け、光の揺らぎが静かに残っている。",
  "日差しが傾き、普段の景色にやわらかな余白が生まれていた。",
  "人影がまばらになり、周囲の明るさが少しずつ変わっていた。",
];

const TAG_CANDIDATES = [
  {
    keywords: ["海", "水", "川", "湖", "港"],
    text: "水辺に光の揺らぎが重なり、周囲の景色が穏やかに見えていた。",
  },
  {
    keywords: ["花", "桜", "紅葉", "植物"],
    text: "色づいた景色の輪郭がやわらぎ、静かな間が広がっていた。",
  },
  {
    keywords: ["夜", "ライト", "イルミネーション"],
    text: "明かりが広がり、通りの輪郭が静かに浮かんでいた。",
  },
];

function hashSeed(value) {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function createSessionMemoryCandidates({
  locationId,
  sessionDate,
  tags = [],
  characters = [],
  photoCount,
}) {
  const tagTexts = tags.map((tag) => `${tag.id} ${tag.name}`);
  const contextual = TAG_CANDIDATES.filter((candidate) =>
    candidate.keywords.some((keyword) =>
      tagTexts.some((tagText) => tagText.includes(keyword)),
    ),
  ).map((candidate) => candidate.text);
  const candidates = [...contextual, ...NEUTRAL_CANDIDATES];
  const seed = hashSeed(
    JSON.stringify([
      locationId,
      sessionDate,
      tags.map((tag) => tag.id).sort(),
      characters.map((character) => character.id).sort(),
      photoCount,
    ]),
  );
  const offset = seed % candidates.length;
  const rotated = [...candidates.slice(offset), ...candidates.slice(0, offset)];
  return [...new Set(rotated)].slice(0, 3);
}
