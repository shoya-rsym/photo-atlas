const $ = (id) => document.getElementById(id);
const RATINGS = ["A", "B", "C", "NG"];
let reviewData = null;

function element(tag, attributes = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attributes)) {
    if (key === "class") node.className = value;
    else if (key.startsWith("on")) node.addEventListener(key.slice(2), value);
    else if (value !== undefined && value !== false) {
      node.setAttribute(key, value === true ? "" : value);
    }
  }
  node.append(...children.flat().filter((child) => child !== null && child !== undefined));
  return node;
}

async function api(path, body) {
  const response = await fetch(path, {
    method: body ? "POST" : "GET",
    body: body ? JSON.stringify(body) : undefined,
    headers: {
      "x-photo-import": "1",
      ...(body ? { "content-type": "application/json" } : {}),
    },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error ?? `HTTP ${response.status}`);
  return data;
}

function setMessage(message, isError = false) {
  const node = $("memoryReviewMessage");
  node.textContent = message;
  node.className = isError ? "error" : "info";
}

function makeRatingSelect(value, label) {
  const select = element(
    "select",
    { "aria-label": label },
    element("option", { value: "" }, "未評価"),
    ...RATINGS.map((rating) => element("option", { value: rating }, rating)),
  );
  select.value = value ?? "";
  return select;
}

function addToCandidatePool(text) {
  $("memoryCandidateText").value = text;
  switchTab("candidates");
  $("memoryCandidateText").focus();
  setMessage("候補文を入力欄にセットしました。確認してから追加してください。");
}

async function saveReview(memory, rating, memo, button) {
  if (!rating) {
    setMessage("A・B・C・NGのいずれかを選択してください。", true);
    return;
  }
  button.disabled = true;
  try {
    const result = await api("/api/memory-reviews/save", {
      sessionMemoryId: memory.id,
      rating,
      memo,
    });
    await loadReviewData();
    setMessage(
      result.unchanged
        ? "この評価とコメントは保存済みです。"
        : `${memory.locationName} / ${memory.sessionDate} の評価を保存しました。`,
    );
  } catch (error) {
    setMessage(error.message, true);
  } finally {
    button.disabled = false;
  }
}

function renderReviewRows() {
  if (!reviewData) return;
  const filter = $("memoryReviewFilter").value;
  const memories = reviewData.memories.filter((memory) => {
    if (filter === "unreviewed") return !memory.review;
    if (RATINGS.includes(filter)) return memory.review?.rating === filter;
    return true;
  });
  $("memoryReviewRows").replaceChildren(
    ...(memories.length
      ? memories.map((memory) => {
          const rating = makeRatingSelect(
            memory.review?.rating,
            `${memory.locationName} ${memory.sessionDate} の評価`,
          );
          const memo = element("textarea", {
            rows: "2",
            maxlength: "500",
            placeholder: "任意コメント",
            "aria-label": `${memory.locationName} ${memory.sessionDate} のコメント`,
          });
          memo.value = memory.review?.memo ?? "";
          const saveButton = element("button", { type: "button", class: "primary" }, "評価を保存");
          saveButton.addEventListener("click", () =>
            saveReview(memory, rating.value, memo.value, saveButton),
          );
          return element(
            "article",
            { class: "memory-review-card" },
            element(
              "header",
              { class: "memory-review-card-heading" },
              element("strong", {}, memory.session),
              element(
                "span",
                { class: "muted" },
                `Session ${memory.id} / ${memory.photoCount}枚`,
              ),
            ),
            element("blockquote", { class: "memory-review-text" }, memory.text),
            element(
              "div",
              { class: "memory-review-controls" },
              element("label", {}, "評価", rating),
              element("label", { class: "memory-review-memo" }, "コメント", memo),
              saveButton,
            ),
          );
        })
      : [
          reviewData.memories.length
            ? element("p", { class: "muted" }, "この条件に一致するMemoryはありません。")
            : element(
                "div",
                { class: "memory-review-empty" },
                element(
                  "p",
                  { class: "muted" },
                  reviewData.backfillCandidateCount > 0
                    ? `評価できるSession Memoryはまだありません。付与対象セッションが${reviewData.backfillCandidateCount}件あります。`
                    : "Session Memoryがありません。既存セッションへの付与後にレビューできます。",
                ),
                reviewData.backfillCandidateCount > 0
                  ? element(
                      "button",
                      {
                        type: "button",
                        class: "primary",
                        onclick: () => {
                          $("memoryReviewEditor").close();
                          $("manageSessionMemories").click();
                          $("sessionMemoryBackfillOpen").click();
                        },
                      },
                      "対象セッションのMemory付与へ",
                    )
                  : null,
              ),
        ]),
  );
}

function renderLibraryRows() {
  if (!reviewData) return;
  const query = $("memoryLibrarySearch").value.trim().toLocaleLowerCase("ja");
  const ratingFilter = $("memoryLibraryRating").value;
  const entries = reviewData.library.filter((review) => {
    if (ratingFilter && review.rating !== ratingFilter) return false;
    const searchable = [
      review.text,
      review.locationName,
      review.sessionDate,
      review.memo ?? "",
    ]
      .join(" ")
      .toLocaleLowerCase("ja");
    return !query || searchable.includes(query);
  });
  $("memoryLibraryRows").replaceChildren(
    ...(entries.length
      ? entries.map((review) =>
          element(
            "article",
            { class: "memory-review-card" },
            element(
              "header",
              { class: "memory-review-card-heading" },
              element("strong", {}, `${review.locationName} / ${review.sessionDate}`),
              element("span", { class: `memory-rating rating-${review.rating}` }, review.rating),
            ),
            element("blockquote", { class: "memory-review-text" }, review.text),
            review.memo
              ? element("p", { class: "muted" }, `コメント: ${review.memo}`)
              : null,
            element(
              "div",
              { class: "memory-review-card-footer" },
              `レビュー: ${new Date(review.reviewedAt).toLocaleString("ja-JP")}`,
              ["A", "B"].includes(review.rating)
                ? element(
                    "button",
                    { type: "button", onclick: () => addToCandidatePool(review.text) },
                    "Candidate Poolへ",
                  )
                : null,
            ),
          ),
        )
      : [element("p", { class: "muted" }, "該当する評価済みMemoryはありません。")]),
  );
}

function renderMemorySummaryList(title, rows, textForRow) {
  return element(
    "section",
    { class: "memory-analytics-section" },
    element("h3", {}, title),
    element(
      "div",
      { class: "memory-analytics-list" },
      ...(rows.length
        ? rows.map((row) =>
            element(
              "article",
              { class: "memory-analytics-item" },
              element("strong", {}, textForRow(row)),
              element("p", {}, row.text),
              row.review?.memo ? element("small", {}, `コメント: ${row.review.memo}`) : null,
            ),
          )
        : [element("p", { class: "muted" }, "該当なし")]),
    ),
  );
}

function renderAnalytics() {
  if (!reviewData) return;
  const analytics = reviewData.analytics;
  const metrics = [
    ["総Memory数", analytics.totalMemoryCount],
    ["評価済み", analytics.reviewedCount],
    ["A", analytics.ratingDistribution.A],
    ["B", analytics.ratingDistribution.B],
    ["C", analytics.ratingDistribution.C],
    ["NG", analytics.ratingDistribution.NG],
    ["平均文字数", analytics.averageLength],
  ];
  const metricCards = element(
    "div",
    { class: "memory-analytics-metrics" },
    ...metrics.map(([label, value]) =>
      element(
        "article",
        { class: "memory-analytics-metric" },
        element("span", {}, label),
        element("strong", {}, String(value)),
      ),
    ),
  );
  const popular = element(
    "section",
    { class: "memory-analytics-section" },
    element("h3", {}, "よく使われるMemory"),
    element(
      "ol",
      {},
      ...(analytics.popularMemories.length
        ? analytics.popularMemories.map(({ text, count }) =>
            element("li", {}, `${text}（${count}回）`),
          )
        : [element("li", {}, "該当なし")]),
    ),
  );
  const words = element(
    "section",
    { class: "memory-analytics-section" },
    element("h3", {}, "よく使われる単語・表現"),
    element(
      "div",
      { class: "memory-word-list" },
      ...(analytics.commonWords.length
        ? analytics.commonWords.map(({ word, count }) =>
            element("span", { class: "memory-word" }, `${word} · ${count}`),
          )
        : [element("span", { class: "muted" }, "集計できるMemoryがありません")]),
    ),
  );
  const duplicates = element(
    "section",
    { class: "memory-analytics-section" },
    element("h3", {}, "重複Memory（再利用警告）"),
    element(
      "ul",
      {},
      ...(analytics.duplicateMemories.length
        ? analytics.duplicateMemories.map(({ text, count }) =>
            element("li", {}, `「${text}」— 使用回数 ${count}`),
          )
        : [element("li", {}, "重複はありません")]),
    ),
  );
  const biasWarnings = element(
    "section",
    { class: "memory-analytics-section" },
    element("h3", {}, `偏り警告（${analytics.biasThreshold}回以上）`),
    element(
      "ul",
      {},
      ...(analytics.biasWarnings.length
        ? analytics.biasWarnings.map(
            ({ text, count, kind }) =>
              element("li", {}, `${kind}: 「${text}」— ${count}件`),
          )
        : [element("li", {}, "偏りは検出されていません")]),
    ),
  );
  const best = renderMemorySummaryList(
    "ベストMemory TOP10（A評価）",
    analytics.bestMemories,
    (row) => `${row.locationName} / ${row.sessionDate}`,
  );
  const ng = renderMemorySummaryList(
    "NG Memory",
    analytics.ngMemories,
    (row) => `${row.locationName} / ${row.sessionDate}`,
  );
  const unreviewed = renderMemorySummaryList(
    "未評価Memory",
    analytics.unreviewedMemories,
    (row) => `${row.locationName} / ${row.sessionDate}`,
  );
  $("memoryReviewAnalytics").replaceChildren(
    metricCards,
    popular,
    words,
    duplicates,
    biasWarnings,
    best,
    ng,
    unreviewed,
  );
}

async function saveCandidate(rawText) {
  const text = rawText.trim();
  if (!text) {
    setMessage("候補文を入力してください。", true);
    return;
  }
  try {
    await api("/api/memory-candidates/add", { text });
    $("memoryCandidateText").value = "";
    await loadReviewData();
    switchTab("candidates");
    setMessage("Memory Candidate Poolに追加しました。");
  } catch (error) {
    setMessage(error.message, true);
  }
}

function renderCandidates() {
  if (!reviewData) return;
  const query = $("memoryCandidateSearch").value.trim().toLocaleLowerCase("ja");
  const candidates = reviewData.candidates.filter((candidate) =>
    candidate.toLocaleLowerCase("ja").includes(query),
  );
  $("memoryCandidateRows").replaceChildren(
    ...(candidates.length
      ? candidates.map((candidate) =>
          element(
            "article",
            { class: "memory-candidate-item" },
            element("p", {}, candidate),
            element(
              "button",
              {
                type: "button",
                class: "danger",
                onclick: async () => {
                  try {
                    await api("/api/memory-candidates/delete", { text: candidate });
                    await loadReviewData();
                    setMessage("Memory Candidate Poolから削除しました。");
                  } catch (error) {
                    setMessage(error.message, true);
                  }
                },
              },
              "削除",
            ),
          ),
        )
      : [element("p", { class: "muted" }, "候補がありません。")]),
  );
}

async function loadReviewData() {
  reviewData = await api("/api/memory-review");
  const analytics = reviewData.analytics;
  $("memoryReviewSummary").textContent =
    `Session Memory ${analytics.totalMemoryCount}件 / 評価済み ${analytics.reviewedCount}件 / 未評価 ${analytics.unreviewedMemories.length}件 / 付与対象 ${reviewData.backfillCandidateCount}件`;
  renderReviewRows();
  renderLibraryRows();
  renderAnalytics();
  renderCandidates();
}

function switchTab(tab) {
  for (const button of document.querySelectorAll("[data-memory-tab]")) {
    button.classList.toggle("active", button.dataset.memoryTab === tab);
  }
  for (const section of document.querySelectorAll(".memory-review-pane")) {
    section.hidden = section.id !== `memoryReview${tab[0].toUpperCase()}${tab.slice(1)}Pane`;
  }
}

$("manageMemoryReview").addEventListener("click", async () => {
  $("memoryReviewEditor").showModal();
  setMessage("Memory Reviewを読み込んでいます。");
  try {
    await loadReviewData();
    setMessage("");
  } catch (error) {
    setMessage(error.message, true);
  }
});

$("memoryReviewClose").addEventListener("click", () => $("memoryReviewEditor").close());
for (const button of document.querySelectorAll("[data-memory-tab]")) {
  button.addEventListener("click", () => switchTab(button.dataset.memoryTab));
}
$("memoryReviewFilter").addEventListener("change", renderReviewRows);
$("memoryLibrarySearch").addEventListener("input", renderLibraryRows);
$("memoryLibraryRating").addEventListener("change", renderLibraryRows);
$("memoryCandidateSearch").addEventListener("input", renderCandidates);
$("memoryCandidateAdd").addEventListener("click", () => saveCandidate($("memoryCandidateText").value));
