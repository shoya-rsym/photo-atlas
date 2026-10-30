import { parseDateInput } from "/lib/date.mjs";
import { formatJapaneseAddress } from "/lib/address.mjs";
import { locationIdFromResult, prefectureIdFromResult } from "/lib/location.mjs";
import { findExactName, searchByName } from "/lib/search.mjs";
import { parseFolderName } from "/lib/folder-name.mjs";
import { createSessionMemoryCandidates } from "/lib/memory.mjs";

const $ = (id) => document.getElementById(id);
const IMAGE_EXT = /\.(jpe?g|png|webp)$/i;
const CONCURRENCY = 4;

const state = {
  master: null,
  files: [],
  location: null,
  newLocation: null,
  tagIds: new Set(),
  newTags: [],
  characterIds: new Set(),
  newCharacters: [],
  sessionMemoryDraft: "",
  suggestIndex: 0,
  busy: 0,
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

async function api(path, { method = "GET", body, headers = {} } = {}) {
  const res = await fetch(path, { method, body, headers: { "x-photo-import": "1", ...headers } });
  const isImage = res.headers.get("content-type")?.startsWith("image/");
  const data = isImage ? null : await res.json();
  if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
  return data;
}

const prefName = (id) => state.master.prefectures.find((p) => p.id === id)?.name ?? id;
const tagName = (id) => state.master.tags.find((t) => t.id === id)?.name ?? id;
const charName = (id) => state.master.characters.find((c) => c.id === id)?.name ?? id;

// ---------- 撮影場所 ----------

function currentLocation() {
  if (state.newLocation) return { ...state.newLocation, isNew: true };
  return state.location;
}

function selectLocation(location) {
  state.location = location;
  state.newLocation = null;
  $("locationInput").value = location.name;
  $("locationSuggest").hidden = true;
  $("newLocationBox").hidden = true;
  renderAll();
}

function renderLocationSuggest() {
  const query = $("locationInput").value;
  const list = $("locationSuggest");
  const results = searchByName(state.master.locations, query, (l) => [l.address ?? ""]);
  const exact = findExactName(state.master.locations, query);
  state.suggestIndex = Math.min(state.suggestIndex, Math.max(results.length - 1, 0));
  list.replaceChildren(
    ...results.map((loc, i) =>
      h(
        "li",
        { class: i === state.suggestIndex ? "active" : "", onmousedown: () => selectLocation(loc) },
        `${loc.name}  `,
        h("span", { class: "muted" }, `${prefName(loc.prefectureId)} ${loc.address ?? ""}`),
      ),
    ),
  );
  list.hidden = results.length === 0;
  $("newLocationBox").hidden = query.trim() === "" || Boolean(exact);
  if (!$("newLocationBox").hidden && !$("nlName").value) $("nlName").value = query.trim();
  return results;
}

function renderLocationInfo() {
  const info = $("locationInfo");
  const loc = currentLocation();
  if (!loc) {
    info.replaceChildren();
    return;
  }
  const count = state.master.photoCounts[loc.id] ?? 0;
  const coords = loc.lat !== undefined && loc.lng !== undefined ? `${loc.lat}, ${loc.lng}` : "座標なし";
  info.replaceChildren(
    h("span", { class: loc.isNew ? "warn" : "ok" }, loc.isNew ? "新規地点: " : "✔ "),
    `${prefName(loc.prefectureId)} / ${loc.address || "住所なし"} / ${coords}`,
    loc.isNew ? "" : ` / 登録済み ${count} 枚`,
  );
}

async function searchLocation() {
  const query = $("locationInput").value.trim();
  const button = $("searchLocation");
  const status = $("locationLookupStatus");
  if (!query) {
    status.replaceChildren(h("span", { class: "err" }, "撮影場所を入力してください"));
    return;
  }

  button.disabled = true;
  status.textContent = "検索中…";
  try {
    const results = await api(`/api/location-search?q=${encodeURIComponent(query)}`);
    if ($("locationInput").value.trim() !== query) {
      status.replaceChildren(h("span", { class: "warn" }, "検索中に入力が変更されました。もう一度検索してください"));
      return;
    }
    const result = results[0];
    if (!result) {
      status.replaceChildren(h("span", { class: "warn" }, "撮影場所が見つかりませんでした"));
      return;
    }

    $("nlName").value = result.name || result.displayName.split(",")[0].trim();
    const prefectureId = prefectureIdFromResult(result, state.master.prefectures);
    const prefectureName = state.master.prefectures.find((prefecture) => prefecture.id === prefectureId)?.name;
    $("nlAddress").value = formatJapaneseAddress(result.address, prefectureName);
    $("nlId").value = locationIdFromResult(result, state.master.locations);
    $("nlLat").value = String(result.lat);
    $("nlLng").value = String(result.lon);
    $("nlPrefecture").value = prefectureId ?? "";
    status.replaceChildren(
      h(
        "span",
        { class: prefectureId ? "ok" : "warn" },
        prefectureId
          ? `検索結果を入力しました: ${result.name || result.displayName.split(",")[0].trim()}`
          : `検索結果を入力しました。都道府県を選択してください: ${result.name || result.displayName.split(",")[0].trim()}`,
      ),
    );
  } catch (error) {
    status.replaceChildren(h("span", { class: "err" }, `検索に失敗しました: ${error.message}`));
  } finally {
    button.disabled = false;
  }
}

// ---------- 撮影日 ----------

function renderDate() {
  const result = parseDateInput($("dateInput").value);
  const info = $("dateInfo");
  if (!result.ok) info.replaceChildren(h("span", { class: "err" }, result.error));
  else if (!result.value) info.textContent = "撮影日不明として登録します";
  else
    info.replaceChildren(
      h("span", { class: "ok" }, `→ ${result.value}`),
      result.note ? h("span", { class: "warn" }, `  ${result.note}`) : "",
    );
  return result;
}

// ---------- タグ・キャラクター ----------

function toggleTag(id) {
  if (state.tagIds.has(id)) state.tagIds.delete(id);
  else state.tagIds.add(id);
  renderTags();
  renderReadiness();
}

function addNewTag() {
  const name = $("tagFilter").value.trim();
  if (!name) return;
  const existing = findExactName([...state.master.tags, ...state.newTags], name);
  if (existing) {
    if (state.master.tags.includes(existing)) state.tagIds.add(existing.id);
  } else {
    state.newTags.push({ name, id: $("tagAddId").value.trim() || undefined });
  }
  $("tagFilter").value = "";
  $("tagAddId").value = "";
  renderTags();
  renderReadiness();
}

function renderTags() {
  const query = $("tagFilter").value;
  const all = state.master.tags;
  const shown = query.trim() ? searchByName(all, query, () => [], 60) : all;
  const ordered = [...shown].sort((a, b) => Number(state.tagIds.has(b.id)) - Number(state.tagIds.has(a.id)));
  $("tagChips").replaceChildren(
    ...state.newTags.map((t) =>
      h("button", { type: "button", class: "chip on new", onclick: () => removeNewTag(t) }, `${t.name}（新規）`),
    ),
    ...ordered.map((t) =>
      h(
        "button",
        { type: "button", class: `chip ${state.tagIds.has(t.id) ? "on" : ""}`, onclick: () => toggleTag(t.id) },
        t.name,
      ),
    ),
  );
  const exact = findExactName([...all, ...state.newTags], query);
  $("tagAdd").hidden = !query.trim() || Boolean(exact);
  $("tagAddBtn").textContent = `＋ 新規タグ「${query.trim()}」`;
}

function removeNewTag(tag) {
  state.newTags = state.newTags.filter((t) => t !== tag);
  renderTags();
  renderReadiness();
}

function selectCharacter(id) {
  if (state.characterIds.has(id)) state.characterIds.delete(id);
  else state.characterIds.add(id);
  renderCharacters();
  renderReadiness();
}

function removeNewCharacter(character) {
  state.newCharacters = state.newCharacters.filter((item) => item !== character);
  renderCharacters();
  renderReadiness();
}

function addNewCharacter() {
  const name = $("charFilter").value.trim();
  if (!name) return;
  const existing = findExactName([...state.master.characters, ...state.newCharacters], name);
  if (existing) {
    if (state.master.characters.some((character) => character.id === existing.id)) {
      state.characterIds.add(existing.id);
    }
  } else {
    state.newCharacters.push({ name, id: $("charAddId").value.trim() || undefined });
  }
  $("charFilter").value = "";
  $("charAddId").value = "";
  renderCharacters();
  renderReadiness();
}

function renderCharacters() {
  const query = $("charFilter").value;
  const all = state.master.characters;
  const shown = query.trim() ? searchByName(all, query, () => [], 60) : all;
  const newShown = query.trim() ? searchByName(state.newCharacters, query, () => [], 60) : state.newCharacters;
  $("charChips").replaceChildren(
    ...newShown.map((character) =>
      h(
        "button",
        {
          type: "button",
          class: "chip on new",
          onclick: () => removeNewCharacter(character),
        },
        `${character.name}（新規）`,
      ),
    ),
    ...shown.map((c) =>
      h(
        "button",
        { type: "button", class: `chip ${state.characterIds.has(c.id) ? "on" : ""}`, onclick: () => selectCharacter(c.id) },
        c.name,
      ),
    ),
  );
  const exact = findExactName([...all, ...state.newCharacters], query);
  $("charAdd").hidden = !query.trim() || Boolean(exact);
  $("charAddBtn").textContent = `＋ 新規キャラクター「${query.trim()}」`;
}

// ---------- 最近使った設定 ----------

function renderRecent() {
  const recent = state.master.recent ?? [];
  $("recentBox").hidden = recent.length === 0;
  $("recent").replaceChildren(
    ...recent.map((s) => {
      const loc = state.master.locations.find((l) => l.id === s.locationId);
      if (!loc) return null;
      const characterIds = s.characterIds ?? (s.characterId ? [s.characterId] : []);
      const label = [loc.name, s.tagIds.map(tagName).join("・"), characterIds.map(charName).join("・")]
        .filter(Boolean)
        .join(" / ");
      return h("button", { type: "button", class: "chip", onclick: () => applyRecent(s, loc) }, label);
    }),
  );
}

function applyRecent(setting, location) {
  state.tagIds = new Set(setting.tagIds.filter((id) => state.master.tags.some((t) => t.id === id)));
  state.newTags = [];
  const characterIds = setting.characterIds ?? (setting.characterId ? [setting.characterId] : []);
  state.characterIds = new Set(characterIds.filter((id) => state.master.characters.some((c) => c.id === id)));
  state.newCharacters = [];
  selectLocation(location);
  $("dateInput").focus();
}

// ---------- 画像 ----------

function naturalSort(a, b) {
  return a.name.localeCompare(b.name, "ja", { numeric: true });
}

async function collectDropped(dataTransfer) {
  // 非同期処理の前に entries を取り出す（以降は DataTransfer が無効になるため）
  const entries = [...dataTransfer.items].map((i) => (i.kind === "file" ? i.webkitGetAsEntry?.() : null));
  const plainFiles = [...dataTransfer.files];
  if (entries.every((e) => !e)) return { files: plainFiles.map((file) => ({ file })), folder: null };

  const found = [];
  let folder = null;
  async function walk(entry, top) {
    if (entry.isFile) {
      const file = await new Promise((resolve, reject) => entry.file(resolve, reject));
      found.push({ file });
    } else if (entry.isDirectory) {
      folder ??= top ?? entry.name;
      const reader = entry.createReader();
      for (;;) {
        const batch = await new Promise((resolve, reject) => reader.readEntries(resolve, reject));
        if (batch.length === 0) break;
        for (const child of batch) await walk(child, top ?? entry.name);
      }
    }
  }
  for (const entry of entries) if (entry) await walk(entry, null);
  return { files: found, folder };
}

async function addFiles(list, folder) {
  const images = list.map((x) => x.file).filter((f) => IMAGE_EXT.test(f.name));
  if (images.length === 0) return;
  if (folder) applyFolderHint(folder);
  images.sort(naturalSort);
  const added = images.map((file) => ({
    id: crypto.randomUUID(),
    file,
    name: file.name,
    status: "staging",
    include: false,
    isCover: false,
  }));
  state.files.push(...added);
  renderGrid();

  let done = 0;
  $("progress").hidden = false;
  const queue = [...added];
  const worker = async () => {
    for (let item = queue.shift(); item; item = queue.shift()) {
      try {
        const res = await api(`/api/stage?name=${encodeURIComponent(item.name)}`, { method: "POST", body: item.file });
        Object.assign(item, { token: res.token, hash: res.hash, duplicateOf: res.duplicateOf, status: "ready" });
      } catch (error) {
        Object.assign(item, { status: "error", error: error.message });
      }
      done += 1;
      $("progressBar").style.width = `${(done / added.length) * 100}%`;
      if (done % 10 === 0) renderGrid();
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  markDuplicates();
  $("progress").hidden = true;
  renderGrid();
  renderReadiness();
}

/** 登録済み・バッチ内重複は初期状態で除外。それ以外は登録対象にする */
function markDuplicates() {
  const seen = new Set();
  for (const f of state.files) {
    if (f.status !== "ready") continue;
    f.batchDuplicate = seen.has(f.hash);
    seen.add(f.hash);
    if (f.include === false && !f.decided) f.include = !f.duplicateOf && !f.batchDuplicate;
  }
}

function applyFolderHint(folderName) {
  // フォルダ名解析は未実装（parseFolderName は null を返す）。実装時はここで各入力欄へ反映する
  const hint = parseFolderName(folderName);
  if (!hint) return;
  if (hint.date) $("dateInput").value = hint.date;
  if (hint.locationQuery) {
    const [first] = searchByName(state.master.locations, hint.locationQuery);
    if (first) selectLocation(first);
  }
  renderAll();
}

function renderGrid() {
  const grid = $("grid");
  grid.replaceChildren(
    ...state.files.map((f) =>
      h(
        "div",
        { class: `card ${f.include ? "" : "off"}` },
        f.status === "ready"
          ? h("input", {
              type: "checkbox",
              checked: f.include,
              onchange: (e) => {
                f.include = e.target.checked;
                f.decided = true;
                if (!f.include) f.isCover = false;
                renderGrid();
                renderReadiness();
              },
            })
          : null,
        f.status === "ready"
          ? h(
              "button",
              {
                type: "button",
                class: `star ${f.isCover ? "on" : ""}`,
                title: "代表写真にする",
                onclick: () => {
                  const next = !f.isCover;
                  for (const other of state.files) other.isCover = false;
                  f.isCover = next;
                  if (next) {
                    f.include = true;
                    f.decided = true;
                  }
                  renderGrid();
                  renderReadiness();
                },
              },
              f.isCover ? "★" : "☆",
            )
          : null,
        f.token ? h("img", { src: `/api/preview/${f.token}`, alt: f.name, loading: "lazy" }) : h("img", { alt: "" }),
        h("div", { class: "name", title: f.name }, f.name),
        f.status === "staging" ? h("div", { class: "badge" }, "読み込み中...") : null,
        f.status === "error" ? h("div", { class: "badge err" }, f.error) : null,
        f.duplicateOf ? h("div", { class: "badge" }, `登録済み重複: ${f.duplicateOf}`) : null,
        f.batchDuplicate && !f.duplicateOf ? h("div", { class: "badge" }, "選択内で重複") : null,
      ),
    ),
  );
  const ready = state.files.filter((f) => f.status === "ready");
  const dups = ready.filter((f) => f.duplicateOf || f.batchDuplicate).length;
  const included = state.files.filter((f) => f.include && f.status === "ready").length;
  $("summary").textContent =
    state.files.length === 0
      ? "画像未選択"
      : `${state.files.length} 枚中 ${included} 枚を登録対象${dups ? ` / 重複 ${dups} 枚` : ""}`;
}

// ---------- 登録 ----------

function includedItems() {
  return state.files
    .filter((f) => f.include && f.status === "ready")
    .map((f) => ({
      token: f.token,
      isCover: f.isCover,
      allowDuplicate: Boolean(f.duplicateOf || f.batchDuplicate),
    }));
}

function problems() {
  const list = [];
  if (!currentLocation()) list.push("撮影場所を選択してください");
  if (!parseDateInput($("dateInput").value).ok) list.push("撮影日の形式が不正です");
  if (includedItems().length === 0) list.push("登録する画像がありません");
  if (state.files.some((f) => f.status === "staging")) list.push("画像を読み込み中です");
  return list;
}

function renderReadiness() {
  const list = problems();
  $("readiness").textContent = list.join(" / ");
  $("reviewBtn").disabled = list.length > 0;
}

function buildPayload() {
  const loc = currentLocation();
  return {
    items: includedItems(),
    locationId: loc && !loc.isNew ? loc.id : undefined,
    newLocation: loc?.isNew ? state.newLocation : undefined,
    date: $("dateInput").value,
    sessionMemoryText: state.sessionMemoryDraft,
    tagIds: [...state.tagIds],
    newTags: state.newTags,
    characterIds: [...state.characterIds],
    newCharacters: state.newCharacters,
    title: $("titleInput").value,
    comment: $("commentInput").value,
  };
}

function openConfirm() {
  const payload = buildPayload();
  const loc = currentLocation();
  const date = parseDateInput(payload.date);
  const tags = [...[...state.tagIds].map(tagName), ...state.newTags.map((t) => `${t.name}（新規）`)];
  const characters = [
    ...[...state.characterIds].map(charName),
    ...state.newCharacters.map((character) => `${character.name}（新規）`),
  ];
  const dupCount = payload.items.filter((i) => i.allowDuplicate).length;
  const cover = state.files.find((f) => f.isCover && f.include);
  const sessionMemoryField = $("sessionMemoryField");
  const sessionDate = date.value;
  const sessionLocationId = loc.id ?? loc.name;
  const sessionCount =
    sessionDate && loc.id
      ? state.master.sessionPhotoCounts[`${loc.id}|${sessionDate}`] ?? 0
      : 0;
  const hasSessionMemory = state.master.sessionMemories.some(
    (memory) =>
      memory.locationId === loc.id && memory.sessionDate === sessionDate,
  );
  const needsMemory =
    Boolean(sessionDate) &&
    sessionCount + payload.items.length >= 10 &&
    !hasSessionMemory;
  state.sessionMemoryDraft = "";
  sessionMemoryField.hidden = !needsMemory;
  if (needsMemory) {
    const candidates = createSessionMemoryCandidates({
      locationId: sessionLocationId,
      sessionDate,
      tags: [
        ...[...state.tagIds].map((id) => state.master.tags.find((tag) => tag.id === id)),
        ...state.newTags,
      ].filter(Boolean),
      characters: [
        ...[...state.characterIds].map((id) =>
          state.master.characters.find((character) => character.id === id),
        ),
        ...state.newCharacters,
      ].filter(Boolean),
      photoCount: sessionCount + payload.items.length,
    });
    state.sessionMemoryDraft = candidates[0];
    $("sessionMemoryCandidate").replaceChildren(
      ...candidates.map((candidate) =>
        h("option", { value: candidate }, candidate),
      ),
    );
    $("sessionMemoryHint").textContent =
      `同じ撮影地・撮影日の写真が ${sessionCount + payload.items.length} 枚になります。候補から1つ選び、登録時に保存します。`;
  }
  const rows = [
    ["対象画像", `${payload.items.length} 枚${dupCount ? `（うち重複を承知で登録 ${dupCount} 枚）` : ""}`],
    ["撮影地", `${loc.name}${loc.isNew ? "（新規）" : ""} / ${prefName(loc.prefectureId)} ${loc.address ?? ""}`],
    ["撮影日", date.value ?? "撮影日不明"],
    ["タグ", tags.length ? tags.join("、") : "なし"],
    ["キャラクター", characters.length ? characters.join("、") : "なし"],
    ["タイトル", payload.title.trim() || `${loc.name}${payload.items.length > 1 ? " 01…" : ""}`],
    ["コメント", payload.comment.trim() || "なし"],
    ["代表写真", cover ? cover.name : "指定なし"],
    ...(hasSessionMemory ? [["Session Memory", "既存のMemoryを維持"]] : []),
  ];
  $("confirmBody").replaceChildren(...rows.flatMap(([k, v]) => [h("dt", {}, k), h("dd", {}, v)]));
  $("confirmError").hidden = true;
  $("confirmOk").disabled = false;
  $("confirm").showModal();
}

async function commit() {
  $("confirmOk").disabled = true;
  try {
    const res = await api("/api/commit", {
      method: "POST",
      body: JSON.stringify(buildPayload()),
      headers: { "content-type": "application/json" },
    });
    $("confirm").close();
    const leftovers = state.files.filter((f) => f.token && !f.include).map((f) => f.token);
    if (leftovers.length) await api("/api/discard", { method: "POST", body: JSON.stringify({ tokens: leftovers }) });
    const lines = [
      `${res.count} 枚を登録しました（${res.firstId} 〜 ${res.lastId}）`,
      res.newTags.length ? `新規タグ: ${res.newTags.map((t) => t.name).join("、")}` : "",
      res.newCharacters.length ? `新規キャラクター: ${res.newCharacters.map((c) => c.name).join("、")}` : "",
      res.newLocations.length ? `新規撮影地点: ${res.newLocations.map((l) => l.name).join("、")}` : "",
      res.sessionMemory ? `Session Memoryを保存しました: ${res.sessionMemory.text}` : "",
      `データ検証: ${res.validation.ok ? "OK" : "NG"} ${res.validation.output}`,
      "設定は保持しています。次の画像をドラッグしてください。",
    ].filter(Boolean);
    $("result").className = `result ${res.validation.ok ? "" : "bad"}`;
    $("result").textContent = lines.join("\n");
    $("result").hidden = false;
    state.files = [];
    state.newTags = [];
    state.newCharacters = [];
    state.newLocation = null;
    await loadMaster();
    // 新規で追加した地点・キャラクターを既存データとして選択し直す
    if (res.newLocations[0]) selectLocation(state.master.locations.find((l) => l.id === res.newLocations[0].id));
    for (const character of res.newCharacters) state.characterIds.add(character.id);
    for (const t of res.newTags) state.tagIds.add(t.id);
    renderAll();
  } catch (error) {
    $("confirmError").textContent = error.message;
    $("confirmError").hidden = false;
    $("confirmOk").disabled = false;
  }
}

// ---------- 初期化 ----------

async function loadMaster() {
  state.master = await api("/api/master");
  $("totals").textContent = `登録済み ${state.master.photoTotal} 枚 / 撮影地点 ${state.master.locations.length} 件`;
  $("nlPrefecture").replaceChildren(
    h("option", { value: "" }, "都道府県を選択"),
    ...state.master.prefectures.map((p) => h("option", { value: p.id }, p.name)),
  );
}

function renderAll() {
  renderRecent();
  renderLocationInfo();
  renderDate();
  renderTags();
  renderCharacters();
  renderGrid();
  renderReadiness();
}

function bind() {
  const input = $("locationInput");
  input.addEventListener("input", () => {
    state.location = null;
    state.newLocation = null;
    state.suggestIndex = 0;
    $("locationLookupStatus").replaceChildren();
    renderLocationSuggest();
    renderLocationInfo();
    renderReadiness();
  });
  input.addEventListener("keydown", (e) => {
    const results = renderLocationSuggest();
    if (e.key === "ArrowDown") state.suggestIndex = Math.min(state.suggestIndex + 1, results.length - 1);
    else if (e.key === "ArrowUp") state.suggestIndex = Math.max(state.suggestIndex - 1, 0);
    else if (e.key === "Enter" && results[state.suggestIndex]) {
      e.preventDefault();
      selectLocation(results[state.suggestIndex]);
      $("dateInput").focus();
      return;
    } else return;
    e.preventDefault();
    renderLocationSuggest();
  });
  input.addEventListener("blur", () => setTimeout(() => ($("locationSuggest").hidden = true), 150));

  $("searchLocation").addEventListener("click", searchLocation);

  $("nlApply").addEventListener("click", () => {
    const num = (id) => {
      const v = $(id).value.trim();
      return v === "" ? undefined : Number(v);
    };
    const name = $("nlName").value.trim();
    if (!name) return;
    if (!$("nlPrefecture").value) {
      $("locationLookupStatus").replaceChildren(h("span", { class: "err" }, "都道府県を選択してください"));
      $("nlPrefecture").focus();
      return;
    }
    state.location = null;
    state.newLocation = {
      name,
      prefectureId: $("nlPrefecture").value,
      address: $("nlAddress").value,
      id: $("nlId").value.trim() || undefined,
      lat: num("nlLat"),
      lng: num("nlLng"),
    };
    $("locationInput").value = name;
    $("locationSuggest").hidden = true;
    renderLocationInfo();
    renderReadiness();
  });

  $("dateInput").addEventListener("input", () => {
    renderDate();
    renderReadiness();
  });

  $("tagFilter").addEventListener("input", renderTags);
  $("tagFilter").addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const [first] = searchByName(state.master.tags, $("tagFilter").value);
    if (first && normalizeEq(first.name, $("tagFilter").value)) {
      toggleTag(first.id);
      $("tagFilter").value = "";
      renderTags();
    } else addNewTag();
  });
  $("tagAddBtn").addEventListener("click", addNewTag);

  $("charFilter").addEventListener("input", renderCharacters);
  $("charFilter").addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const [first] = searchByName([...state.master.characters, ...state.newCharacters], $("charFilter").value);
    if (first && normalizeEq(first.name, $("charFilter").value)) {
      if (state.master.characters.some((character) => character.id === first.id)) {
        selectCharacter(first.id);
      } else {
        removeNewCharacter(first);
      }
      $("charFilter").value = "";
      renderCharacters();
    } else addNewCharacter();
  });
  $("charAddBtn").addEventListener("click", addNewCharacter);

  const drop = $("drop");
  drop.addEventListener("dragover", (e) => {
    e.preventDefault();
    drop.classList.add("over");
  });
  drop.addEventListener("dragleave", () => drop.classList.remove("over"));
  drop.addEventListener("drop", async (e) => {
    e.preventDefault();
    drop.classList.remove("over");
    const { files, folder } = await collectDropped(e.dataTransfer);
    await addFiles(files, folder);
  });
  // ページのどこへ落としてもブラウザが画像を開かないようにする
  window.addEventListener("dragover", (e) => e.preventDefault());
  window.addEventListener("drop", (e) => e.preventDefault());

  $("pickFiles").addEventListener("click", () => $("fileInput").click());
  $("pickFolder").addEventListener("click", () => $("folderInput").click());
  $("fileInput").addEventListener("change", async (e) => {
    await addFiles([...e.target.files].map((file) => ({ file })), null);
    e.target.value = "";
  });
  $("folderInput").addEventListener("change", async (e) => {
    const files = [...e.target.files];
    const folder = files[0]?.webkitRelativePath.split("/")[0] ?? null;
    await addFiles(files.map((file) => ({ file })), folder);
    e.target.value = "";
  });

  const setAll = (include) => {
    for (const f of state.files) {
      if (f.status !== "ready") continue;
      f.include = include;
      f.decided = true;
      if (!include) f.isCover = false;
    }
    renderGrid();
    renderReadiness();
  };
  $("selectAll").addEventListener("click", () => setAll(true));
  $("selectNone").addEventListener("click", () => setAll(false));
  $("clearAll").addEventListener("click", async () => {
    const tokens = state.files.flatMap((f) => (f.token ? [f.token] : []));
    state.files = [];
    if (tokens.length) await api("/api/discard", { method: "POST", body: JSON.stringify({ tokens }) });
    renderGrid();
    renderReadiness();
  });

  $("reviewBtn").addEventListener("click", openConfirm);
  $("sessionMemoryCandidate").addEventListener("change", (event) => {
    state.sessionMemoryDraft = event.target.value;
  });
  $("confirmCancel").addEventListener("click", () => $("confirm").close());
  $("confirmOk").addEventListener("click", commit);
}

function normalizeEq(a, b) {
  return findExactName([{ id: "", name: a }], b) !== undefined;
}

await loadMaster();
bind();
renderAll();
$("locationInput").focus();
