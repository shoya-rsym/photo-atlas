export const MEMORY_REVIEW_RATINGS = ["A", "B", "C", "NG"];

const RATING_LABELS = {
  A: "A評価",
  B: "B評価",
  C: "C評価",
  NG: "NG",
};

const COMMON_JAPANESE_WORDS = new Set([
  "いる",
  "ある",
  "する",
  "した",
  "して",
  "です",
  "ます",
  "よう",
  "ような",
  "こと",
  "もの",
  "ところ",
  "とき",
  "から",
  "まで",
  "だけ",
  "少し",
  "その",
  "この",
  "あの",
  "いる",
]);

export function memoryReviewKey(sessionMemoryId, text) {
  return `session\u0000${sessionMemoryId}\u0000${text}`;
}

export function favoriteMemoryReviewKey(photoId, text) {
  return `favorite\u0000${photoId}\u0000${text}`;
}

function getMemoryReviewKey(review) {
  if (review.memoryType === "favorite" || review.photoId) {
    return favoriteMemoryReviewKey(review.photoId, review.text);
  }
  return memoryReviewKey(review.sessionMemoryId, review.text);
}

function getReviewTimestamp(review) {
  return review.reviewedAt ?? review.createdAt ?? "";
}

export function getLatestMemoryReviews(library) {
  const latest = new Map();
  for (const review of library) {
    const key = getMemoryReviewKey(review);
    const current = latest.get(key);
    if (!current || getReviewTimestamp(review).localeCompare(getReviewTimestamp(current)) >= 0) {
      latest.set(key, review);
    }
  }
  return latest;
}

export function getLatestMemoryReviewEntries(library) {
  return [...getLatestMemoryReviews(library).values()].sort((left, right) =>
    getReviewTimestamp(right).localeCompare(getReviewTimestamp(left)),
  );
}

function getWordCounts(texts) {
  const counts = new Map();
  const segmenter =
    typeof Intl.Segmenter === "function"
      ? new Intl.Segmenter("ja", { granularity: "word" })
      : null;
  for (const text of texts) {
    const words = segmenter
      ? [...segmenter.segment(text)]
          .filter((segment) => segment.isWordLike)
          .map((segment) => segment.segment.normalize("NFKC"))
      : (text.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}ー]{2,}/gu) ?? []);
    for (const word of new Set(words)) {
      if ([...word].length < 2 || COMMON_JAPANESE_WORDS.has(word)) continue;
      counts.set(word, (counts.get(word) ?? 0) + 1);
    }
  }
  return [...counts]
    .map(([word, count]) => ({ word, count }))
    .sort((left, right) => right.count - left.count || left.word.localeCompare(right.word, "ja"))
    .slice(0, 10);
}

function getUsageCounts(memories) {
  const counts = new Map();
  for (const memory of memories) {
    counts.set(memory.text, (counts.get(memory.text) ?? 0) + 1);
  }
  return counts;
}

function getTextGroups(memories) {
  const counts = getUsageCounts(memories);
  return [...counts]
    .map(([text, count]) => ({ text, count }))
    .sort((left, right) => right.count - left.count || left.text.localeCompare(right.text, "ja"));
}

export function buildMemoryAnalytics(memoryRows) {
  const ratingDistribution = { A: 0, B: 0, C: 0, NG: 0 };
  for (const row of memoryRows) {
    if (row.review && Object.hasOwn(ratingDistribution, row.review.rating)) {
      ratingDistribution[row.review.rating] += 1;
    }
  }
  const usageCounts = getUsageCounts(memoryRows);
  const lengths = memoryRows.map((row) => [...row.text].length);
  const totalCharacters = lengths.reduce((sum, length) => sum + length, 0);
  const commonWords = getWordCounts(memoryRows.map((row) => row.text));
  const duplicateMemories = getTextGroups(memoryRows).filter((entry) => entry.count > 1);
  const biasThreshold = Math.max(3, Math.ceil(memoryRows.length * 0.2));
  return {
    totalMemoryCount: memoryRows.length,
    reviewedCount: Object.values(ratingDistribution).reduce((sum, count) => sum + count, 0),
    ratingDistribution,
    averageLength: lengths.length ? Math.round((totalCharacters / lengths.length) * 10) / 10 : 0,
    commonWords,
    duplicateMemories,
    biasThreshold,
    biasWarnings: [
      ...duplicateMemories
        .filter((entry) => entry.count >= biasThreshold)
        .map((entry) => ({
          text: entry.text,
          count: entry.count,
          kind: "重複Memory",
        })),
      ...commonWords
        .filter((entry) => entry.count >= biasThreshold)
        .map((entry) => ({
          text: entry.word,
          count: entry.count,
          kind: "頻出表現",
        })),
    ],
    popularMemories: getTextGroups(memoryRows).slice(0, 10),
    bestMemories: memoryRows
      .filter((row) => row.review?.rating === "A")
      .sort(
        (left, right) =>
          (usageCounts.get(right.text) ?? 0) - (usageCounts.get(left.text) ?? 0) ||
          getReviewTimestamp(right.review ?? {}).localeCompare(
            getReviewTimestamp(left.review ?? {}),
          ),
      )
      .slice(0, 10),
    ngMemories: memoryRows.filter((row) => row.review?.rating === "NG"),
    unreviewedMemories: memoryRows.filter((row) => !row.review),
  };
}

function markdownText(value) {
  return String(value ?? "")
    .replace(/\r?\n/g, " ")
    .replace(/\\/g, "\\\\")
    .replace(/([`*_{}\[\]()#+.!|>])/g, "\\$1")
    .trim();
}

function reviewMarkdownEntry(review) {
  const location = markdownText(review.locationName ?? review.locationId);
  const isFavorite = review.memoryType === "favorite" || Boolean(review.photoId);
  const context = isFavorite
    ? `Favorite Memory / ${location} / ${markdownText(review.photoTitle ?? review.photoId)}`
    : `${location} / ${markdownText(review.sessionDate)}`;
  const text = markdownText(review.text);
  const memo = review.memo?.trim() ? `\n  - コメント: ${markdownText(review.memo)}` : "";
  return `- **${context}**\n  > ${text}\n  - 評価: ${review.rating}${memo}`;
}

export function buildMemoryReviewMarkdown(library, locations = []) {
  const reviews = getLatestMemoryReviewEntries(library);
  const locationNames = new Map(locations.map((location) => [location.id, location.name]));
  const sections = [
    "# Memory Review Library",
    "",
    "Memoryの文体を人の目でレビューするための記録です。説明ではなく、写真と閲覧者の間に残る余白を基準に確認してください。",
    "",
  ];
  for (const rating of MEMORY_REVIEW_RATINGS) {
    sections.push(`## ${RATING_LABELS[rating]}`, "");
    const entries = reviews
      .filter((review) => review.rating === rating)
      .map((review) => ({
        ...review,
        locationName:
          locationNames.get(review.locationId) ?? review.locationName ?? review.locationId,
      }));
    sections.push(
      ...(entries.length ? entries.map(reviewMarkdownEntry) : ["- なし"]),
      "",
    );
  }
  return `${sections.join("\n").trimEnd()}\n`;
}

export function buildMemoryReportMarkdown({ month, sessionMemories, library }) {
  const monthlyReviews = library.filter((review) => review.reviewedAt.startsWith(month));
  const monthlyLatestReviews = getLatestMemoryReviewEntries(monthlyReviews);
  const distribution = { A: 0, B: 0, C: 0, NG: 0 };
  for (const review of monthlyLatestReviews) {
    if (Object.hasOwn(distribution, review.rating)) distribution[review.rating] += 1;
  }
  const popular = getTextGroups(sessionMemories).slice(0, 10);
  const improvementEntries = monthlyLatestReviews.filter(
    (review) => review.rating === "C" || review.rating === "NG",
  );
  const commonWords = getWordCounts(monthlyLatestReviews.map((review) => review.text));
  const distributionLines = MEMORY_REVIEW_RATINGS.map(
    (rating) => `- ${RATING_LABELS[rating]}: ${distribution[rating]}`,
  );
  const popularLines = popular.length
    ? popular.map(({ text, count }) => `- ${markdownText(text)}（${count}回）`)
    : ["- なし"];
  const wordLines = commonWords.length
    ? commonWords.map(({ word, count }) => `- ${markdownText(word)}（${count}件）`)
    : ["- なし"];
  const improvementLines = improvementEntries.length
    ? improvementEntries.map(reviewMarkdownEntry)
    : ["- なし"];

  return [
    `# Memory Review Report (${month})`,
    "",
    "## 総数",
    "",
    `- 現在のSession Memory: ${sessionMemories.length}件`,
    `- 対象月のレビュー: ${monthlyReviews.length}件`,
    "",
    "## 評価分布",
    "",
    ...distributionLines,
    "",
    "## 人気Memory",
    "",
    ...popularLines,
    "",
    "## よく使用される表現",
    "",
    ...wordLines,
    "",
    "## 改善候補（C / NG）",
    "",
    ...improvementLines,
    "",
  ].join("\n");
}
