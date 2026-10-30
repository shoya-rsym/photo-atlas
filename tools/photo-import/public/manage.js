import { parseDateInput } from "/lib/date.mjs";
import { formatJapaneseAddress } from "/lib/address.mjs";
import { prefectureIdFromResult } from "/lib/location.mjs";
import { findExactName, normalize, searchByName } from "/lib/search.mjs";

const $ = (id) => document.getElementById(id);
const PAGE_SIZE = 120;

const state = {
  master: null,
  photos: [],
  results: [],
  page: 0,
  selected: new Set(),
  lastClicked: null,
  addTags: new Set(),
  removeTags: new Set(),
  bulkCharacters: new Set(),
  bulkLocation: null,
  editing: null,
  editTags: new Set(),
  editCharacters: new Set(),
  locationMode: "update",
  similarPairs: [],
  similarPage: 0,
  similarSelected: new Set(),
  similarAnalyzedCount: 0,
  similarSkipped: [],
  sessionMemoryCandidates: [],
};

function h(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key === "class") node.className = value;
    else if (key.startsWith("on")) node.addEventListener(key.slice(2), value);
    else if (value !== undefined && value !== false) node.setAttribute(key, value === true ? "" : value);
  }
  node.append(...children.flat().filter((c) => c !== null && c !== undefined));
  return node;
}

async function api(path, body) {
  const res = await fetch(path, {
    method: body ? "POST" : "GET",
    body: body ? JSON.stringify(body) : undefined,
    headers: { "x-photo-import": "1", ...(body ? { "content-type": "application/json" } : {}) },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
  return data;
}

const tagName = (id) => state.master.tags.find((t) => t.id === id)?.name ?? id;
const charName = (id) => state.master.characters.find((c) => c.id === id)?.name ?? "";
const charNames = (ids) => (ids ?? []).map(charName);
const locName = (id) => state.master.locations.find((l) => l.id === id)?.name ?? id;

// ---------- 検索・一覧 ----------

function searchText(p) {
  return normalize(
    [p.title, p.comment ?? "", locName(p.locationId), ...charNames(p.characterIds), ...(p.tags ?? []).map(tagName)].join(" "),
  );
}

function applyFilter() {
  const words = $("search").value.split(/[\s\u3000]+/).filter(Boolean).map(normalize);
  const filter = $("filter").value;
  const sessionMemoryKeys = new Set(
    (state.master.sessionMemories ?? []).map(
      (memory) => `${memory.locationId}|${memory.sessionDate}`,
    ),
  );
  let list = state.photos.filter((p) => {
    if (filter === "nodate" && p.date) return false;
    if (filter === "notag" && (p.tags ?? []).length > 0) return false;
    if (filter === "nochar" && (p.characterIds ?? []).length > 0) return false;
    if (filter === "cover" && !p.isCover) return false;
    const hasPhotoMemory = typeof p.photoMemory === "string" && p.photoMemory.trim().length > 0;
    if (filter === "photoMemory" && !hasPhotoMemory) return false;
    if (filter === "noPhotoMemory" && hasPhotoMemory) return false;
    const hasSessionMemory = Boolean(
      p.date && sessionMemoryKeys.has(`${p.locationId}|${p.date}`),
    );
    if (filter === "sessionMemory" && !hasSessionMemory) return false;
    if (filter === "noSessionMemory" && hasSessionMemory) return false;
    if (words.length === 0) return true;
    const text = searchText(p);
    return words.every((w) => text.includes(w));
  });
  const sort = $("sort").value;
  const byCreated = (a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id);
  if (sort === "createdAsc") list = list.sort((a, b) => byCreated(b, a));
  else if (sort === "date") list = list.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "") || byCreated(a, b));
  else if (sort === "location") list = list.sort((a, b) => locName(a.locationId).localeCompare(locName(b.locationId), "ja") || byCreated(a, b));
  else list = list.sort(byCreated);
  state.results = list;
  state.page = 0;
  renderList();
}

function pageItems() {
  return state.results.slice(state.page * PAGE_SIZE, (state.page + 1) * PAGE_SIZE);
}

function renderList() {
  const pages = Math.max(1, Math.ceil(state.results.length / PAGE_SIZE));
  state.page = Math.min(state.page, pages - 1);
  $("grid").replaceChildren(...pageItems().map(renderCard));
  $("summary").textContent = `${state.results.length} 件ヒット（全 ${state.photos.length} 枚）`;
  for (const control of document.querySelectorAll("[data-page-control]")) {
    const input = control.querySelector("[data-page-number]");
    input.value = String(state.page + 1);
    input.max = String(pages);
    control.querySelector("[data-page-count]").textContent = `/ ${pages}`;
    control.querySelector('[data-page-action="first"]').disabled = state.page === 0;
    control.querySelector('[data-page-action="previous"]').disabled = state.page === 0;
    control.querySelector('[data-page-action="next"]').disabled = state.page >= pages - 1;
    control.querySelector('[data-page-action="last"]').disabled = state.page >= pages - 1;
  }
  renderBulk();
}

function setPage(page) {
  const pages = Math.max(1, Math.ceil(state.results.length / PAGE_SIZE));
  state.page = Math.max(0, Math.min(pages - 1, page));
  renderList();
}

function goToPage(control) {
  const input = control.querySelector("[data-page-number]");
  const page = Number(input.value);
  if (!Number.isInteger(page) || page < 1) {
    input.value = String(state.page + 1);
    return;
  }
  setPage(page - 1);
}

function renderCard(p) {
  const tags = (p.tags ?? []).map(tagName).join("・") || "タグなし";
  return h(
    "div",
    {
      class: `card ${state.selected.has(p.id) ? "sel" : ""}`,
      "data-id": p.id,
      onclick: (e) => toggleSelect(p.id, e.shiftKey),
      ondblclick: () => openEditor(p.id),
    },
    h("img", { src: p.thumbnail, alt: p.title, loading: "lazy" }),
    p.isCover ? h("span", { class: "cover", title: "代表写真" }, "★") : null,
    h("div", { class: "title", title: p.title }, p.title),
    h("div", { class: "meta" }, locName(p.locationId)),
    h("div", { class: "meta", title: tags }, tags),
    h("div", { class: "meta" }, `${p.date ?? "撮影日不明"}${p.characterIds?.length ? ` / ${charNames(p.characterIds).join("・")}` : ""}`),
    h(
      "button",
      {
        type: "button",
        class: "edit",
        onclick: (e) => {
          e.stopPropagation();
          openEditor(p.id);
        },
      },
      "編集",
    ),
  );
}

function toggleSelect(id, range) {
  const ids = state.results.map((p) => p.id);
  if (range && state.lastClicked && ids.includes(state.lastClicked)) {
    const [a, b] = [ids.indexOf(state.lastClicked), ids.indexOf(id)].sort((x, y) => x - y);
    for (const rid of ids.slice(a, b + 1)) state.selected.add(rid);
  } else if (state.selected.has(id)) state.selected.delete(id);
  else state.selected.add(id);
  state.lastClicked = id;
  for (const card of $("grid").children) card.classList.toggle("sel", state.selected.has(card.dataset.id));
  renderBulk();
}

// ---------- 一括編集パネル ----------

function selectedPhotos() {
  return state.photos.filter((p) => state.selected.has(p.id));
}

function renderBulk() {
  const count = state.selected.size;
  $("selCount").textContent = count ? `${count} 枚選択中` : "";
  $("bulkBody").hidden = count === 0;
  $("bulkHint").hidden = count > 0;
  $("createLocation").disabled = count === 0;
  if (count === 0) return;

  const query = $("addTagFilter").value;
  const shown = query.trim() ? searchByName(state.master.tags, query, () => [], 60) : state.master.tags;
  $("addTagChips").replaceChildren(
    ...shown.map((t) =>
      h(
        "button",
        {
          type: "button",
          class: `chip ${state.addTags.has(t.id) ? "on" : ""}`,
          onclick: () => {
            if (state.addTags.has(t.id)) state.addTags.delete(t.id);
            else state.addTags.add(t.id);
            renderBulk();
          },
        },
        t.name,
      ),
    ),
  );
  $("addTagBtn").disabled = state.addTags.size === 0;

  // 選択中の写真に実際に付いているタグだけ（件数付き）を削除候補にする
  const counts = new Map();
  for (const p of selectedPhotos()) for (const t of p.tags ?? []) counts.set(t, (counts.get(t) ?? 0) + 1);
  for (const id of [...state.removeTags]) if (!counts.has(id)) state.removeTags.delete(id);
  $("removeTagChips").replaceChildren(
    ...(counts.size === 0
      ? [h("span", { class: "muted" }, "タグが付いていません")]
      : [...counts].map(([id, n]) =>
          h(
            "button",
            {
              type: "button",
              class: `chip ${state.removeTags.has(id) ? "on" : ""}`,
              onclick: () => {
                if (state.removeTags.has(id)) state.removeTags.delete(id);
                else state.removeTags.add(id);
                renderBulk();
              },
            },
            `${tagName(id)} (${n})`,
          ),
        )),
  );
  $("removeTagBtn").disabled = state.removeTags.size === 0;
  for (const id of [...state.bulkCharacters]) {
    if (!state.master.characters.some((character) => character.id === id)) state.bulkCharacters.delete(id);
  }
  $("bulkCharacterChips").replaceChildren(
    ...state.master.characters.map((character) =>
      h(
        "button",
        {
          type: "button",
          class: `chip ${state.bulkCharacters.has(character.id) ? "on" : ""}`,
          onclick: () => {
            if (state.bulkCharacters.has(character.id)) state.bulkCharacters.delete(character.id);
            else state.bulkCharacters.add(character.id);
            renderBulk();
          },
        },
        character.name,
      ),
    ),
  );
  $("bulkCharacterBtn").disabled = state.bulkCharacters.size === 0;
  $("bulkCharacterClearBtn").disabled = selectedPhotos().every((photo) => !(photo.characterIds ?? []).length);
  $("bulkLocationBtn").disabled = !state.bulkLocation;
  $("createLocation").disabled = count === 0;
  $("createTagBtn").disabled = count === 0 || !$("newTagName").value.trim();
  const date = parseDateInput($("bulkDate").value);
  $("bulkDateInfo").textContent = !date.ok ? date.error : date.value ? `→ ${date.value}` : "撮影日不明にします";
  $("bulkDateBtn").disabled = !date.ok;
}

function suggestLocations(input, list, onPick) {
  const results = searchByName(state.master.locations, input.value, (l) => [l.address ?? ""]);
  list.replaceChildren(
    ...results.map((loc) => h("li", { onmousedown: () => onPick(loc) }, `${loc.name}  `, h("span", { class: "muted" }, loc.address ?? ""))),
  );
  list.hidden = results.length === 0;
  return results;
}

function renderSimilarPhoto(photo) {
  const selected = state.similarSelected.has(photo.id);
  return h(
    "div",
    { class: "similar-photo" },
    h("img", { src: photo.thumbnail, alt: photo.title, loading: "lazy" }),
    h("div", { class: "title", title: photo.title }, photo.title),
    h("div", { class: "meta" }, locName(photo.locationId)),
    h("div", { class: "meta" }, photo.date ?? "撮影日不明"),
    h(
      "label",
      { class: "check" },
      h("input", {
        type: "checkbox",
        checked: selected,
        onchange: (event) => {
          if (event.currentTarget.checked) state.similarSelected.add(photo.id);
          else state.similarSelected.delete(photo.id);
          renderSimilarCandidates();
        },
      }),
      "削除対象にする",
    ),
    h("button", { type: "button", onclick: () => openEditor(photo.id) }, "詳細確認"),
  );
}

function renderSimilarCandidates() {
  const availableIds = new Set(state.photos.map((photo) => photo.id));
  state.similarPairs = state.similarPairs.filter(
    (pair) => availableIds.has(pair.first.id) && availableIds.has(pair.second.id),
  );
  for (const id of [...state.similarSelected]) {
    if (!availableIds.has(id)) state.similarSelected.delete(id);
  }
  const pageCount = Math.max(1, Math.ceil(state.similarPairs.length / 20));
  state.similarPage = Math.min(state.similarPage, pageCount - 1);
  const pagePairs = state.similarPairs.slice(state.similarPage * 20, (state.similarPage + 1) * 20);
  $("similarSummary").textContent =
    state.similarPairs.length > 0
      ? `${state.similarPairs.length}組の候補（${state.similarAnalyzedCount}枚を解析。距離が小さいほど似ています）`
      : `${state.similarAnalyzedCount}枚を解析しました。類似候補はありません`;
  $("similarSkipped").replaceChildren(
    ...(state.similarSkipped.length
      ? [
          h(
            "details",
            {},
            h("summary", {}, `解析できなかった写真 ${state.similarSkipped.length} 枚`),
            h(
              "ul",
              {},
              ...state.similarSkipped.map((item) => h("li", {}, `${item.id} (${item.title}): ${item.reason}`)),
            ),
          ),
        ]
      : []),
  );
  $("similarPairs").replaceChildren(
    ...pagePairs.flatMap((pair) => {
      const first = state.photos.find((photo) => photo.id === pair.first.id);
      const second = state.photos.find((photo) => photo.id === pair.second.id);
      if (!first || !second) return [];
      return [
        h(
          "article",
          { class: "similar-pair" },
          h("div", { class: "similar-distance" }, `画像差分 ${pair.distance}/64`),
          renderSimilarPhoto(first),
          renderSimilarPhoto(second),
        ),
      ];
    }),
  );
  $("similarPageInfo").textContent = state.similarPairs.length ? `${state.similarPage + 1} / ${pageCount}` : "";
  $("similarPrevious").disabled = state.similarPage === 0;
  $("similarNext").disabled = state.similarPage >= pageCount - 1;
  $("deleteSimilar").disabled = state.similarSelected.size === 0;
  $("deleteSimilar").textContent = `選択した候補写真を削除 (${state.similarSelected.size})`;
}

async function searchSimilarPhotos() {
  const button = $("searchSimilar");
  $("similarPanel").hidden = false;
  $("similarSummary").textContent = "画像を解析しています…";
  $("similarSkipped").replaceChildren();
  $("similarPairs").replaceChildren();
  button.disabled = true;
  try {
    const result = await api("/api/photos/similar");
    state.similarPairs = result.pairs;
    state.similarPage = 0;
    state.similarSelected.clear();
    state.similarAnalyzedCount = result.analyzedCount;
    state.similarSkipped = result.skipped;
    renderSimilarCandidates();
  } catch (error) {
    $("similarSummary").replaceChildren(h("span", { class: "err" }, error.message));
  } finally {
    button.disabled = false;
  }
}

async function deleteSimilarPhotos() {
  const photos = state.photos.filter((photo) => state.similarSelected.has(photo.id));
  const ids = photos.map((photo) => photo.id);
  if (ids.length === 0) return;
  const names = photos.slice(0, 10).map((photo) => `・${photo.title} (${photo.id})`).join("\n");
  const remainder = photos.length > 10 ? `\nほか ${photos.length - 10} 枚` : "";
  if (
    !confirm(
      `${photos.length} 枚を削除します。実体はPhoto-Manageのゴミ箱へ退避されます。\n${names}${remainder}`,
    )
  ) {
    return;
  }

  const button = $("deleteSimilar");
  button.disabled = true;
  try {
    const result = await api("/api/photos/delete", { ids });
    const deletedIds = new Set(ids);
    state.similarSelected.clear();
    state.similarPairs = state.similarPairs.filter(
      (pair) => !deletedIds.has(pair.first.id) && !deletedIds.has(pair.second.id),
    );
    await reload();
    renderSimilarCandidates();
    showResult(`${ids.length} 枚の候補写真を削除しました`, result);
  } catch (error) {
    showResult(`類似候補の削除に失敗しました: ${error.message}`, null, true);
  } finally {
    button.disabled = false;
  }
}

// ---------- 操作の実行 ----------

async function run(label, path, body) {
  try {
    const res = await api(path, body);
    await reload();
    showResult(label, res);
    return res;
  } catch (error) {
    showResult(`失敗: ${error.message}`, null, true);
    return null;
  }
}

function showResult(label, res, bad = false) {
  const box = $("result");
  box.replaceChildren();
  const lines = [label];
  if (res) lines.push(`データ検証: ${res.validation.ok ? "OK" : "NG"} ${res.validation.output}`);
  if (res?.renumbered) {
    lines.push(
      `地点ごとに ${res.renumberedCount} 枚を再採番し、タイトル ${res.titleUpdatedCount} 件を更新しました`,
    );
  }
  if (res?.titleUpdatedCount > 0) {
    lines.push(`地点名に合わせて写真タイトルを ${res.titleUpdatedCount} 件更新しました`);
  }
  box.append(...lines.map((l) => h("div", {}, l)));
  if (res?.orphanLocations?.length) {
    const names = res.orphanLocations.map(locName).join("、");
    box.append(
      h("div", { class: "warn" }, `写真が0枚の撮影地点: ${names}`),
      h(
        "button",
        {
          type: "button",
          onclick: async () => {
            const names2 = res.orphanLocations.map(locName).join("、");
            if (!confirm(`写真が0枚の撮影地点を削除します: ${names2}`)) return;
            await run(`撮影地点を削除しました: ${names2}`, "/api/locations/prune", {});
          },
        },
        "空の撮影地点を削除",
      ),
    );
  }
  box.className = `result ${bad || (res && !res.validation.ok) ? "bad" : ""}`;
  box.hidden = false;
}

function renderUndo(status) {
  $("undoBar").hidden = !status.available;
  $("undoDescription").textContent = status.available
    ? `「${status.label}」の更新前の保存情報に戻せます${status.photoCount > 0 ? `（写真 ${status.photoCount} 枚）` : ""}`
    : "";
}

async function restoreLastChange() {
  const status = await api("/api/photos/undo-status");
  renderUndo(status);
  if (!status.available) {
    showResult("取り消せる更新がありません", null, true);
    return;
  }
  if (!confirm(`「${status.label}」を取り消し、更新前の保存情報へ戻します。よろしいですか？`)) return;

  const button = $("undoLastChange");
  button.disabled = true;
  try {
    const res = await api("/api/photos/undo", {});
    await reload();
    showResult(`「${res.undone}」を取り消し、更新前の保存情報に戻しました`, res);
  } catch (error) {
    await reload();
    throw error;
  } finally {
    button.disabled = false;
  }
}

async function reload() {
  const [photos, master, undo] = await Promise.all([
    api("/api/photos"),
    api("/api/master"),
    api("/api/photos/undo-status"),
  ]);
  state.photos = photos;
  state.master = master;
  renderUndo(undo);
  const ids = new Set(state.photos.map((p) => p.id));
  for (const id of [...state.selected]) if (!ids.has(id)) state.selected.delete(id);
  $("totals").textContent = `登録済み ${state.photos.length} 枚 / 撮影地点 ${state.master.locations.length} 件`;
  fillCharacterSelects();
  const keepPage = state.page;
  applyFilter();
  state.page = keepPage;
  renderList();
  if (!$("similarPanel").hidden && state.similarPairs.length) renderSimilarCandidates();
}

function fillCharacterSelects() {
  $("edLocationList").replaceChildren(...state.master.locations.map((l) => h("option", { value: l.name })));
  const selectedLocationId = $("locationSelect").value;
  $("locationSelect").replaceChildren(
    ...state.master.locations.map((location) => h("option", { value: location.id }, location.name)),
  );
  if (state.master.locations.some((location) => location.id === selectedLocationId)) {
    $("locationSelect").value = selectedLocationId;
  }
  $("manageLocations").disabled = state.master.locations.length === 0;
  $("locationPrefecture").replaceChildren(
    h("option", { value: "" }, "都道府県を選択"),
    ...state.master.prefectures.map((prefecture) => h("option", { value: prefecture.id }, prefecture.name)),
  );
}

function renderCharacterManager() {
  const usageCounts = new Map();
  for (const photo of state.photos) {
    for (const id of photo.characterIds ?? []) usageCounts.set(id, (usageCounts.get(id) ?? 0) + 1);
  }
  $("characterList").replaceChildren(
    ...(state.master.characters.length
      ? state.master.characters.map((character) => {
          const usageCount = usageCounts.get(character.id) ?? 0;
          return h(
            "div",
            { class: "character-item" },
            h(
              "div",
              {},
              h("strong", {}, character.name),
              h("div", { class: "muted" }, [character.series, `${usageCount} 枚で使用中`].filter(Boolean).join(" / ")),
            ),
            h(
              "button",
              {
                type: "button",
                class: "danger",
                disabled: usageCount > 0,
                title: usageCount > 0 ? "使用中のキャラクターは削除できません" : "キャラクターを削除",
                onclick: () => deleteManagedCharacter(character),
              },
              "削除",
            ),
          );
        })
      : [h("p", { class: "muted" }, "キャラクターが登録されていません")]),
  );
}

function renderSessionMemoryManager() {
  const memories = state.master.sessionMemories ?? [];
  $("sessionMemoryList").replaceChildren(
    ...(memories.length
      ? memories.map((memory) => {
          const textInput = h(
            "textarea",
            { maxlength: "120", "aria-label": "Session Memory" },
            memory.text,
          );
          return h(
            "div",
            { class: "session-memory-item" },
            h("strong", {}, `${locName(memory.locationId)} / ${memory.sessionDate}`),
            h("span", { class: "muted" }, `作成方法: ${memory.generatedBy}`),
            textInput,
            h(
              "div",
              { class: "row" },
              h(
                "button",
                {
                  type: "button",
                  class: "primary",
                  onclick: () => saveSessionMemory(memory.id, textInput.value),
                },
                "保存",
              ),
              h(
                "button",
                {
                  type: "button",
                  class: "danger",
                  onclick: () => removeSessionMemory(memory),
                },
                "削除",
              ),
            ),
          );
        })
      : [h("p", { class: "muted" }, "Session Memoryはまだありません")]),
  );
}

function updateSessionMemoryBackfillControls() {
  const selectedCount = state.sessionMemoryCandidates.filter((candidate) => candidate.selected).length;
  const candidateCount = state.sessionMemoryCandidates.length;
  $("sessionMemoryBackfillSummary").textContent =
    `${candidateCount} セッションが対象です（${selectedCount} 件選択中）`;
  $("sessionMemoryBackfillApply").disabled = selectedCount === 0;
  $("sessionMemoryBackfillSelectAll").textContent =
    candidateCount > 0 && selectedCount === candidateCount ? "選択解除" : "すべて選択";
}

function renderSessionMemoryBackfill() {
  const sessions = state.sessionMemoryCandidates;
  $("sessionMemoryBackfillList").replaceChildren(
    ...(sessions.length
      ? sessions.map((session) => {
          const checkbox = h("input", { type: "checkbox" });
          checkbox.checked = session.selected;
          checkbox.addEventListener("change", () => {
            session.selected = checkbox.checked;
            updateSessionMemoryBackfillControls();
          });
          const choice = h(
            "select",
            { "aria-label": `${session.locationName} ${session.sessionDate} の候補` },
            ...session.candidates.map((text, index) =>
              h("option", { value: String(index) }, `候補 ${index + 1}`),
            ),
          );
          const textInput = h("textarea", {
            maxlength: "120",
            "aria-label": `${session.locationName} ${session.sessionDate} のMemory文`,
          });
          choice.value = String(session.selectedCandidate ?? 0);
          textInput.value = session.draftText;
          choice.addEventListener("change", () => {
            session.selectedCandidate = Number(choice.value);
            session.draftText = session.candidates[session.selectedCandidate] ?? "";
            textInput.value = session.draftText;
          });
          textInput.addEventListener("input", () => {
            session.draftText = textInput.value;
          });
          const previews = h(
            "div",
            { class: "session-memory-previews" },
            ...session.previewPhotos.map((photo) =>
              h("img", {
                src: photo.thumbnail,
                alt: photo.title,
                loading: "lazy",
              }),
            ),
          );
          return h(
            "article",
            { class: "session-memory-item session-memory-backfill-item" },
            h(
              "label",
              { class: "check" },
              checkbox,
              ` ${session.locationName} / ${session.sessionDate}（写真 ${session.photoCount} 枚）`,
            ),
            previews,
            h("label", {}, "候補", choice),
            textInput,
          );
        })
      : [h("p", { class: "muted" }, "Memory未設定で付与条件を満たすセッションはありません")]),
  );
  updateSessionMemoryBackfillControls();
}

async function reloadSessionMemoryBackfillCandidates() {
  const previous = new Map(
    state.sessionMemoryCandidates.map((candidate) => [
      `${candidate.locationId}|${candidate.sessionDate}`,
      candidate,
    ]),
  );
  const candidates = await api("/api/session-memories/backfill-candidates");
  state.sessionMemoryCandidates = candidates.map((candidate) => {
    const old = previous.get(`${candidate.locationId}|${candidate.sessionDate}`);
    return {
      ...candidate,
      selected: old?.selected ?? false,
      selectedCandidate: old?.selectedCandidate ?? 0,
      draftText: old?.draftText ?? candidate.candidates[0] ?? "",
    };
  });
  renderSessionMemoryBackfill();
}

function openSessionMemoryManager() {
  $("sessionMemoryError").hidden = true;
  $("sessionMemoryManageSection").hidden = false;
  $("sessionMemoryBackfillSection").hidden = true;
  renderSessionMemoryManager();
  $("sessionMemoryEditor").showModal();
}

async function openSessionMemoryBackfill() {
  $("sessionMemoryError").hidden = true;
  $("sessionMemoryManageSection").hidden = true;
  $("sessionMemoryBackfillSection").hidden = false;
  try {
    await reloadSessionMemoryBackfillCandidates();
  } catch (error) {
    $("sessionMemoryError").textContent = error.message;
    $("sessionMemoryError").hidden = false;
  }
}

async function applySessionMemoryBackfill() {
  const selected = state.sessionMemoryCandidates.filter((candidate) => candidate.selected);
  if (selected.length === 0) return;
  if (!confirm(`選択した ${selected.length} セッションにMemoryを付与します。写真データは変更しません。よろしいですか？`)) return;

  const button = $("sessionMemoryBackfillApply");
  button.disabled = true;
  $("sessionMemoryError").hidden = true;
  try {
    const result = await api("/api/session-memories/backfill", {
      entries: selected.map((candidate) => ({
        locationId: candidate.locationId,
        sessionDate: candidate.sessionDate,
        text: candidate.draftText,
      })),
    });
    await reload();
    renderSessionMemoryManager();
    await reloadSessionMemoryBackfillCandidates();
    showResult(`${result.addedCount} セッションにMemoryを付与しました`, result);
  } catch (error) {
    $("sessionMemoryError").textContent = error.message;
    $("sessionMemoryError").hidden = false;
  } finally {
    updateSessionMemoryBackfillControls();
  }
}

async function saveSessionMemory(id, text) {
  try {
    const result = await api("/api/session-memories/update", { id, text });
    await reload();
    renderSessionMemoryManager();
    showResult(`${locName(result.sessionMemory.locationId)} のSession Memoryを保存しました`, result);
  } catch (error) {
    $("sessionMemoryError").textContent = error.message;
    $("sessionMemoryError").hidden = false;
  }
}

async function removeSessionMemory(memory) {
  if (!confirm(`${locName(memory.locationId)} / ${memory.sessionDate} のSession Memoryを削除しますか？`)) return;
  try {
    const result = await api("/api/session-memories/delete", { id: memory.id });
    await reload();
    renderSessionMemoryManager();
    showResult(`${locName(memory.locationId)} のSession Memoryを削除しました`, result);
  } catch (error) {
    $("sessionMemoryError").textContent = error.message;
    $("sessionMemoryError").hidden = false;
  }
}

function openCharacterManager() {
  $("characterName").value = "";
  $("characterSeries").value = "";
  $("characterError").hidden = true;
  $("characterStatus").textContent = "";
  renderCharacterManager();
  $("characterEditor").showModal();
}

async function createManagedCharacter() {
  const name = $("characterName").value.trim();
  if (!name) {
    $("characterError").textContent = "キャラクター名を入力してください";
    $("characterError").hidden = false;
    return;
  }
  try {
    await api("/api/characters/create", {
      name,
      series: $("characterSeries").value,
    });
    $("characterName").value = "";
    $("characterSeries").value = "";
    $("characterError").hidden = true;
    $("characterStatus").textContent = `「${name}」を追加しました`;
    await reload();
    renderCharacterManager();
  } catch (error) {
    $("characterError").textContent = error.message;
    $("characterError").hidden = false;
  }
}

async function deleteManagedCharacter(character) {
  const usageCount = state.photos.filter((photo) => (photo.characterIds ?? []).includes(character.id)).length;
  if (usageCount > 0) {
    $("characterError").textContent = `写真 ${usageCount} 枚で使用中のため削除できません`;
    $("characterError").hidden = false;
    return;
  }
  if (!confirm(`キャラクター「${character.name}」を削除しますか？`)) return;
  try {
    await api("/api/characters/delete", { id: character.id });
    $("characterError").hidden = true;
    $("characterStatus").textContent = `「${character.name}」を削除しました`;
    state.bulkCharacters.delete(character.id);
    state.editCharacters.delete(character.id);
    await reload();
    renderCharacterManager();
  } catch (error) {
    $("characterError").textContent = error.message;
    $("characterError").hidden = false;
  }
}

function fillLocationEditor(location) {
  state.locationMode = "update";
  $("locationSave").textContent = "保存";
  $("locationEditorTitle").textContent = "撮影地点情報の編集";
  $("locationSelectRow").hidden = false;
  $("locationIdRow").hidden = false;
  $("locationName").value = location.name;
  $("locationPrefecture").value = location.prefectureId;
  $("locationAddress").value = location.address ?? "";
  $("locationId").value = location.id;
  $("locationLat").value = location.lat ?? "";
  $("locationLng").value = location.lng ?? "";
  $("locationSearchStatus").replaceChildren();
  $("locationError").hidden = true;
  const affected = state.photos.filter((photo) => photo.locationId === location.id).length;
  $("locationAffected").textContent =
    `この地点の名前を変更すると、参照している写真 ${affected} 枚に反映され、地点名＋番号形式のタイトルも自動修正されます。`;
}

function openLocationEditor() {
  const location = state.master.locations.find((item) => item.id === $("locationSelect").value);
  if (!location) return;
  fillLocationEditor(location);
  $("locationEditor").showModal();
}

function openCreateLocation() {
  if (state.selected.size === 0) {
    showResult("先に新しい地点へ移動する写真を選択してください", null, true);
    return;
  }
  state.locationMode = "create";
  $("locationEditorTitle").textContent = "新しい撮影地点を追加";
  $("locationSave").textContent = "追加して写真に適用";
  $("locationSelectRow").hidden = true;
  $("locationIdRow").hidden = true;
  $("locationName").value = "";
  $("locationPrefecture").value = "";
  $("locationAddress").value = "";
  $("locationId").value = "";
  $("locationLat").value = "";
  $("locationLng").value = "";
  $("locationSearchStatus").replaceChildren();
  $("locationError").hidden = true;
  $("locationAffected").textContent =
    `選択中の写真 ${state.selected.size} 枚を、この地点へ一括で移動します。`;
  $("locationSave").textContent = "追加して写真に適用";
  $("locationEditor").showModal();
}

async function searchManageLocation() {
  const query = $("locationName").value.trim();
  const button = $("locationSearch");
  const status = $("locationSearchStatus");
  if (!query) {
    status.replaceChildren(h("span", { class: "err" }, "撮影地点名を入力してください"));
    return;
  }
  button.disabled = true;
  status.textContent = "検索中…";
  try {
    const results = await api(`/api/location-search?q=${encodeURIComponent(query)}`);
    if ($("locationName").value.trim() !== query) {
      status.replaceChildren(h("span", { class: "warn" }, "検索中に入力が変更されました。もう一度検索してください"));
      return;
    }
    const result = results[0];
    if (!result) {
      status.replaceChildren(h("span", { class: "warn" }, "撮影場所が見つかりませんでした"));
      return;
    }
    const prefectureId = prefectureIdFromResult(result, state.master.prefectures);
    const prefectureName = state.master.prefectures.find((prefecture) => prefecture.id === prefectureId)?.name;
    $("locationName").value = result.name || result.displayName.split(",")[0].trim();
    $("locationPrefecture").value = prefectureId ?? "";
    $("locationAddress").value = formatJapaneseAddress(result.address, prefectureName);
    $("locationLat").value = String(result.lat);
    $("locationLng").value = String(result.lon);
    status.replaceChildren(
      h(
        "span",
        { class: prefectureId ? "ok" : "warn" },
        prefectureId
          ? "検索結果を入力しました"
          : "検索結果を入力しました。都道府県を選択してください",
      ),
    );
  } catch (error) {
    status.replaceChildren(h("span", { class: "err" }, `検索に失敗しました: ${error.message}`));
  } finally {
    button.disabled = false;
  }
}

async function saveLocationEditor() {
  const locationId = $("locationSelect").value;
  const button = $("locationSave");
  const coordinate = (id) => {
    const value = $(id).value.trim();
    if (value === "") return null;
    const number = Number(value);
    if (!Number.isFinite(number)) throw new Error("緯度・経度は数値で入力してください");
    return number;
  };
  button.disabled = true;
  $("locationError").hidden = true;
  try {
    const locationData = {
      name: $("locationName").value,
      prefectureId: $("locationPrefecture").value,
      address: $("locationAddress").value,
      lat: coordinate("locationLat"),
      lng: coordinate("locationLng"),
    };
    if (state.locationMode === "create") {
      const photoIds = selectedIds();
      if (!confirm(
        `新しい撮影地点「${locationData.name.trim()}」を追加し、選択中の写真 ${photoIds.length} 枚に適用します。よろしいですか？`,
      )) return;
      const res = await api("/api/locations/create", {
        ...locationData,
        photoIds,
      });
      $("locationEditor").close();
      await reload();
      state.bulkLocation = res.location;
      $("bulkLocation").value = res.location.name;
      $("bulkLocationInfo").textContent = res.location.address ?? "";
      renderBulk();
      showResult(
        `撮影地点「${res.location.name}」を追加し、${res.changed} 枚に適用しました`,
        res,
      );
      return;
    }

    const current = state.master.locations.find((item) => item.id === locationId);
    const affectedPhotos = state.photos.filter((photo) => photo.locationId === locationId).length;
    if (
      current &&
      current.name !== locationData.name.trim() &&
      !confirm(
        `地点名を「${locationData.name.trim()}」に変更します。この地点を使用している写真 ${affectedPhotos} 枚に反映し、地点名＋番号形式のタイトルも自動修正します。よろしいですか？`,
      )
    ) {
      return;
    }
    const res = await api("/api/locations/update", {
      id: locationId,
      patch: locationData,
    });
    $("locationEditor").close();
    await reload();
    showResult(
      `${res.location.name} の地点情報を更新しました（関連写真 ${res.affectedPhotos} 枚に反映）`,
      res,
    );
  } catch (error) {
    $("locationError").textContent = error.message;
    $("locationError").hidden = false;
  } finally {
    button.disabled = false;
    button.textContent =
      state.locationMode === "create" ? "追加して写真に適用" : "保存";
  }
}

const selectedIds = () => [...state.selected];

async function bulk(label, op) {
  const n = state.selected.size;
  if (!confirm(`${n} 枚に対して実行します: ${label}`)) return;
  await run(`${n} 枚: ${label}`, "/api/photos/bulk", { ids: selectedIds(), ...op });
}

async function renumberSelectedTitles() {
  const ids = selectedIds();
  if (
    !confirm(
      `選択した ${ids.length} 枚のタイトルを、地点ごとに空いている最小番号から再採番します。よろしいですか？`,
    )
  ) {
    return;
  }
  await run(
    `${ids.length} 枚のタイトルを地点名＋番号に再編集しました`,
    "/api/photos/renumber",
    { ids },
  );
}

// ---------- 詳細編集 ----------

function openEditor(id) {
  const p = state.photos.find((x) => x.id === id);
  if (!p) return;
  state.editing = p;
  state.editTags = new Set(p.tags ?? []);
  state.editCharacters = new Set(p.characterIds ?? []);
  $("edImage").src = p.image;
  $("edTitle").value = p.title;
  $("edDate").value = p.date ?? "";
  $("edLocation").value = locName(p.locationId);
  $("edComment").value = p.comment ?? "";
  $("edPhotoMemory").value = p.photoMemory ?? "";
  $("edPhotoMemoryCount").textContent = `${[...$("edPhotoMemory").value].length} / 120`;
  $("edCover").checked = Boolean(p.isCover);
  $("edNewTagName").value = "";
  $("edCreateTagBtn").disabled = true;
  $("edError").hidden = true;
  renderEditorTags();
  renderEditorCharacters();
  renderEditorDate();
  $("editor").showModal();
}

function renderEditorCharacters() {
  for (const id of [...state.editCharacters]) {
    if (!state.master.characters.some((character) => character.id === id)) state.editCharacters.delete(id);
  }
  $("edCharacterChips").replaceChildren(
    ...state.master.characters.map((character) =>
      h(
        "button",
        {
          type: "button",
          class: `chip ${state.editCharacters.has(character.id) ? "on" : ""}`,
          onclick: () => {
            if (state.editCharacters.has(character.id)) state.editCharacters.delete(character.id);
            else state.editCharacters.add(character.id);
            renderEditorCharacters();
          },
        },
        character.name,
      ),
    ),
  );
}

function renderEditorTags() {
  $("edTags").replaceChildren(
    ...state.master.tags.map((t) =>
      h(
        "button",
        {
          type: "button",
          class: `chip ${state.editTags.has(t.id) ? "on" : ""}`,
          onclick: () => {
            if (state.editTags.has(t.id)) state.editTags.delete(t.id);
            else state.editTags.add(t.id);
            renderEditorTags();
          },
        },
        t.name,
      ),
    ),
  );
}

async function createTagForEditedPhoto() {
  const name = $("edNewTagName").value.trim();
  if (!name || !state.editing) return;
  try {
    const res = await api("/api/tags/create", { name, photoIds: [state.editing.id] });
    state.editTags.add(res.tag.id);
    $("edNewTagName").value = "";
    $("edCreateTagBtn").disabled = true;
    await reload();
    renderEditorTags();
    showResult(`タグ「${res.tag.name}」を作成して写真に追加しました`, res);
  } catch (error) {
    $("edError").textContent = error.message;
    $("edError").hidden = false;
  }
}

function renderEditorDate() {
  const r = parseDateInput($("edDate").value);
  $("edDateInfo").textContent = !r.ok ? r.error : r.value ? `→ ${r.value}${r.note ? `（${r.note}）` : ""}` : "撮影日不明";
}

async function saveEditor() {
  const location = findExactName(state.master.locations, $("edLocation").value);
  if (!location) {
    $("edError").textContent = "地点名が一覧にありません（登録済みの地点を選んでください）";
    $("edError").hidden = false;
    return;
  }
  try {
    const res = await api("/api/photos/update", {
      id: state.editing.id,
      patch: {
        title: $("edTitle").value,
        date: $("edDate").value,
        locationId: location.id,
        characterIds: [...state.editCharacters],
        tagIds: [...state.editTags],
        comment: $("edComment").value,
        photoMemory: $("edPhotoMemory").value,
        isCover: $("edCover").checked,
      },
    });
    $("editor").close();
    await reload();
    showResult(`${state.editing.id} を更新しました`, res);
  } catch (error) {
    $("edError").textContent = error.message;
    $("edError").hidden = false;
  }
}

// ---------- イベント ----------

function bind() {
  let timer;
  $("search").addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(applyFilter, 150);
  });
  $("filter").addEventListener("change", applyFilter);
  $("sort").addEventListener("change", applyFilter);
  $("searchSimilar").addEventListener("click", searchSimilarPhotos);
  $("closeSimilar").addEventListener("click", () => ($("similarPanel").hidden = true));
  $("similarPrevious").addEventListener("click", () => {
    state.similarPage -= 1;
    renderSimilarCandidates();
  });
  $("similarNext").addEventListener("click", () => {
    state.similarPage += 1;
    renderSimilarCandidates();
  });
  $("deleteSimilar").addEventListener("click", deleteSimilarPhotos);
  for (const control of document.querySelectorAll("[data-page-control]")) {
    control.addEventListener("click", (event) => {
      const button = event.target.closest("[data-page-action]");
      if (!button) return;
      const pages = Math.max(1, Math.ceil(state.results.length / PAGE_SIZE));
      switch (button.dataset.pageAction) {
        case "first":
          setPage(0);
          break;
        case "previous":
          setPage(state.page - 1);
          break;
        case "next":
          setPage(state.page + 1);
          break;
        case "last":
          setPage(pages - 1);
          break;
        case "go":
          goToPage(control);
          break;
      }
    });
    control.querySelector("[data-page-number]").addEventListener("keydown", (event) => {
      if (event.key === "Enter") goToPage(control);
    });
  }
  $("selectPage").addEventListener("click", () => {
    for (const p of pageItems()) state.selected.add(p.id);
    renderList();
  });
  $("selectAllResults").addEventListener("click", () => {
    for (const p of state.results) state.selected.add(p.id);
    renderList();
  });
  $("selectNone").addEventListener("click", () => {
    state.selected.clear();
    renderList();
  });

  $("manageLocations").addEventListener("click", openLocationEditor);
  $("manageSessionMemories").addEventListener("click", openSessionMemoryManager);
  $("sessionMemoryClose").addEventListener("click", () => $("sessionMemoryEditor").close());
  $("sessionMemoryBackfillOpen").addEventListener("click", openSessionMemoryBackfill);
  $("sessionMemoryBackfillBack").addEventListener("click", () => {
    $("sessionMemoryBackfillSection").hidden = true;
    $("sessionMemoryManageSection").hidden = false;
    renderSessionMemoryManager();
  });
  $("sessionMemoryBackfillRefresh").addEventListener("click", async () => {
    $("sessionMemoryError").hidden = true;
    try {
      await reloadSessionMemoryBackfillCandidates();
    } catch (error) {
      $("sessionMemoryError").textContent = error.message;
      $("sessionMemoryError").hidden = false;
    }
  });
  $("sessionMemoryBackfillSelectAll").addEventListener("click", () => {
    const select = !state.sessionMemoryCandidates.every((candidate) => candidate.selected);
    for (const candidate of state.sessionMemoryCandidates) candidate.selected = select;
    renderSessionMemoryBackfill();
  });
  $("sessionMemoryBackfillApply").addEventListener("click", applySessionMemoryBackfill);
  $("edPhotoMemory").addEventListener("input", () => {
    $("edPhotoMemoryCount").textContent = `${[...$("edPhotoMemory").value].length} / 120`;
  });
  $("undoLastChange").addEventListener("click", async () => {
    try {
      await restoreLastChange();
    } catch (error) {
      showResult(`取り消しに失敗しました: ${error.message}`, null, true);
    }
  });
  $("manageCharacters").addEventListener("click", openCharacterManager);
  $("characterCreate").addEventListener("click", createManagedCharacter);
  $("characterClose").addEventListener("click", () => $("characterEditor").close());
  $("createLocation").addEventListener("click", openCreateLocation);
  $("locationSelect").addEventListener("change", () => {
    const location = state.master.locations.find((item) => item.id === $("locationSelect").value);
    if (location) fillLocationEditor(location);
  });
  $("locationName").addEventListener("input", () => $("locationSearchStatus").replaceChildren());
  $("locationSearch").addEventListener("click", searchManageLocation);
  $("locationSave").addEventListener("click", saveLocationEditor);
  $("locationCancel").addEventListener("click", () => $("locationEditor").close());

  $("addTagFilter").addEventListener("input", renderBulk);
  $("newTagName").addEventListener("input", renderBulk);
  $("renumberTitlesBtn").addEventListener("click", renumberSelectedTitles);
  $("createTagBtn").addEventListener("click", async () => {
    const name = $("newTagName").value.trim();
    const ids = selectedIds();
    if (!name || ids.length === 0) return;
    const res = await run(
      `タグ「${name}」を作成して ${ids.length} 枚に追加しました`,
      "/api/tags/create",
      { name, photoIds: ids },
    );
    if (!res) return;
    $("newTagName").value = "";
    state.addTags.clear();
    renderBulk();
  });
  $("addTagBtn").addEventListener("click", async () => {
    await bulk(`タグ追加 ${[...state.addTags].map(tagName).join("、")}`, { addTagIds: [...state.addTags] });
    state.addTags.clear();
    renderBulk();
  });
  $("removeTagBtn").addEventListener("click", async () => {
    await bulk(`タグ削除 ${[...state.removeTags].map(tagName).join("、")}`, { removeTagIds: [...state.removeTags] });
    state.removeTags.clear();
    renderBulk();
  });

  const pick = (loc) => {
    state.bulkLocation = loc;
    $("bulkLocation").value = loc.name;
    $("bulkLocationSuggest").hidden = true;
    $("bulkLocationInfo").textContent = loc.address ?? "";
    renderBulk();
  };
  $("bulkLocation").addEventListener("input", () => {
    state.bulkLocation = findExactName(state.master.locations, $("bulkLocation").value) ?? null;
    $("bulkLocationInfo").textContent = state.bulkLocation ? (state.bulkLocation.address ?? "") : "";
    suggestLocations($("bulkLocation"), $("bulkLocationSuggest"), pick);
    renderBulk();
  });
  $("bulkLocation").addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const [first] = searchByName(state.master.locations, $("bulkLocation").value, (l) => [l.address ?? ""]);
    if (first) pick(first);
  });
  $("bulkLocation").addEventListener("blur", () => setTimeout(() => ($("bulkLocationSuggest").hidden = true), 150));
  $("bulkLocationBtn").addEventListener("click", () =>
    bulk(`地点変更 → ${state.bulkLocation.name}`, { locationId: state.bulkLocation.id }),
  );

  $("bulkCharacterBtn").addEventListener("click", () => {
    const names = [...state.bulkCharacters].map(charName).join("、");
    return bulk(`キャラクターを置き換え → ${names}`, { characterIds: [...state.bulkCharacters] });
  });
  $("bulkCharacterClearBtn").addEventListener("click", () => {
    return bulk("キャラクター設定を解除", { characterIds: [] });
  });

  $("bulkDate").addEventListener("input", renderBulk);
  $("bulkDateBtn").addEventListener("click", () => {
    const r = parseDateInput($("bulkDate").value);
    return bulk(`撮影日変更 → ${r.value ?? "撮影日不明"}`, { date: $("bulkDate").value });
  });

  $("bulkDeleteBtn").addEventListener("click", async () => {
    const n = state.selected.size;
    if (!confirm(`${n} 枚を削除します。\nphotos.json・原寸画像・サムネイルが削除されます（実体は tools/photo-import/.local/trash に退避）。`)) return;
    const res = await run(`${n} 枚を削除しました`, "/api/photos/delete", { ids: selectedIds() });
    if (res) state.selected.clear();
    renderList();
  });

  $("edDate").addEventListener("input", renderEditorDate);
  $("edNewTagName").addEventListener("input", () => {
    $("edCreateTagBtn").disabled = !$("edNewTagName").value.trim();
  });
  $("edCreateTagBtn").addEventListener("click", createTagForEditedPhoto);
  $("edCancel").addEventListener("click", () => $("editor").close());
  $("edSave").addEventListener("click", saveEditor);
  $("edDelete").addEventListener("click", async () => {
    const p = state.editing;
    if (!confirm(`「${p.title}」を削除します。`)) return;
    $("editor").close();
    state.selected.delete(p.id);
    await run(`${p.id} を削除しました`, "/api/photos/delete", { ids: [p.id] });
  });
}

await reload();
bind();
$("search").focus();
