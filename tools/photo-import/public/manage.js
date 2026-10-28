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
  bulkLocation: null,
  editing: null,
  editTags: new Set(),
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
const locName = (id) => state.master.locations.find((l) => l.id === id)?.name ?? id;

// ---------- 検索・一覧 ----------

function searchText(p) {
  return normalize(
    [p.title, p.comment ?? "", locName(p.locationId), charName(p.characterId), ...(p.tags ?? []).map(tagName)].join(" "),
  );
}

function applyFilter() {
  const words = $("search").value.split(/[\s\u3000]+/).filter(Boolean).map(normalize);
  const filter = $("filter").value;
  let list = state.photos.filter((p) => {
    if (filter === "nodate" && p.date) return false;
    if (filter === "notag" && (p.tags ?? []).length > 0) return false;
    if (filter === "nochar" && p.characterId) return false;
    if (filter === "cover" && !p.isCover) return false;
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
  $("pageInfo").textContent = `${state.page + 1} / ${pages}`;
  $("prev").disabled = state.page === 0;
  $("next").disabled = state.page >= pages - 1;
  renderBulk();
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
    h("div", { class: "meta" }, `${p.date ?? "撮影日不明"}${p.characterId ? ` / ${charName(p.characterId)}` : ""}`),
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
  $("bulkLocationBtn").disabled = !state.bulkLocation;
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

async function reload() {
  state.photos = await api("/api/photos");
  state.master = await api("/api/master");
  const ids = new Set(state.photos.map((p) => p.id));
  for (const id of [...state.selected]) if (!ids.has(id)) state.selected.delete(id);
  $("totals").textContent = `登録済み ${state.photos.length} 枚 / 撮影地点 ${state.master.locations.length} 件`;
  fillCharacterSelects();
  const keepPage = state.page;
  applyFilter();
  state.page = keepPage;
  renderList();
}

function fillCharacterSelects() {
  const options = (first) => [first, ...state.master.characters.map((c) => h("option", { value: c.id }, c.name))];
  $("bulkCharacter").replaceChildren(...options(h("option", { value: "" }, "（キャラクターなしにする）")));
  $("edCharacter").replaceChildren(...options(h("option", { value: "" }, "（なし）")));
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

function fillLocationEditor(location) {
  $("locationName").value = location.name;
  $("locationPrefecture").value = location.prefectureId;
  $("locationAddress").value = location.address ?? "";
  $("locationId").value = location.id;
  $("locationLat").value = location.lat ?? "";
  $("locationLng").value = location.lng ?? "";
  $("locationSearchStatus").replaceChildren();
  $("locationError").hidden = true;
}

function openLocationEditor() {
  const location = state.master.locations.find((item) => item.id === $("locationSelect").value);
  if (!location) return;
  fillLocationEditor(location);
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
  const coordinate = (id) => {
    const value = $(id).value.trim();
    if (value === "") return null;
    const number = Number(value);
    if (!Number.isFinite(number)) throw new Error("緯度・経度は数値で入力してください");
    return number;
  };
  const button = $("locationSave");
  button.disabled = true;
  $("locationError").hidden = true;
  try {
    const res = await api("/api/locations/update", {
      id: locationId,
      patch: {
        name: $("locationName").value,
        prefectureId: $("locationPrefecture").value,
        address: $("locationAddress").value,
        lat: coordinate("locationLat"),
        lng: coordinate("locationLng"),
      },
    });
    $("locationEditor").close();
    await reload();
    showResult(`${res.location.name} の地点情報を更新しました`, res);
  } catch (error) {
    $("locationError").textContent = error.message;
    $("locationError").hidden = false;
  } finally {
    button.disabled = false;
  }
}

const selectedIds = () => [...state.selected];

async function bulk(label, op) {
  const n = state.selected.size;
  if (!confirm(`${n} 枚に対して実行します: ${label}`)) return;
  await run(`${n} 枚: ${label}`, "/api/photos/bulk", { ids: selectedIds(), ...op });
}

// ---------- 詳細編集 ----------

function openEditor(id) {
  const p = state.photos.find((x) => x.id === id);
  if (!p) return;
  state.editing = p;
  state.editTags = new Set(p.tags ?? []);
  $("edImage").src = p.image;
  $("edTitle").value = p.title;
  $("edDate").value = p.date ?? "";
  $("edLocation").value = locName(p.locationId);
  $("edCharacter").value = p.characterId ?? "";
  $("edComment").value = p.comment ?? "";
  $("edCover").checked = Boolean(p.isCover);
  $("edError").hidden = true;
  renderEditorTags();
  renderEditorDate();
  $("editor").showModal();
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
        characterId: $("edCharacter").value || null,
        tagIds: [...state.editTags],
        comment: $("edComment").value,
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
  $("prev").addEventListener("click", () => {
    state.page -= 1;
    renderList();
  });
  $("next").addEventListener("click", () => {
    state.page += 1;
    renderList();
  });
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
  $("locationSelect").addEventListener("change", () => {
    const location = state.master.locations.find((item) => item.id === $("locationSelect").value);
    if (location) fillLocationEditor(location);
  });
  $("locationName").addEventListener("input", () => $("locationSearchStatus").replaceChildren());
  $("locationSearch").addEventListener("click", searchManageLocation);
  $("locationSave").addEventListener("click", saveLocationEditor);
  $("locationCancel").addEventListener("click", () => $("locationEditor").close());

  $("addTagFilter").addEventListener("input", renderBulk);
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
    const id = $("bulkCharacter").value;
    return bulk(`キャラクター変更 → ${id ? charName(id) : "なし"}`, { characterId: id || null });
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
