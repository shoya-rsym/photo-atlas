const $ = (id) => document.getElementById(id);
const SAVE_DELAY = 500;

const state = {
  photos: [],
  master: null,
  photoById: new Map(),
  locationById: new Map(),
  prefectureById: new Map(),
  photosByPrefecture: new Map(),
  photosByLocation: new Map(),
  drafts: new Map(),
  timers: new Map(),
  storyDrafts: new Map(),
  storySavingKey: null,
  selectedPrefectureId: null,
  selectedLocationId: null,
  selectedPhotoId: null,
  saveQueue: Promise.resolve(),
};

function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

async function request(path, body) {
  const response = await fetch(path, {
    method: body ? "POST" : "GET",
    headers: {
      "x-photo-import": "1",
      ...(body ? { "content-type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result?.error ?? `HTTP ${response.status}`);
  return result;
}

function photosForLocation(locationId) {
  return state.photosByLocation.get(locationId) ?? [];
}

function photosForPrefecture(prefectureId) {
  return state.photosByPrefecture.get(prefectureId) ?? [];
}

function storySessionKey(locationId, sessionDate) {
  return `${locationId}|${sessionDate}`;
}

function locationStoryForSession(locationId, sessionDate) {
  return (state.master.locationStories ?? [])
    .filter(
      (story) =>
        story.locationId === locationId && story.sessionDate === sessionDate,
    )
    .reduce(
      (latest, story) =>
        !latest ||
        story.version > latest.version ||
        (story.version === latest.version &&
          story.updatedAt > latest.updatedAt)
          ? story
          : latest,
      null,
    );
}

function sortPhotos(photos) {
  return [...photos].sort(
    (left, right) =>
      (right.date ?? "").localeCompare(left.date ?? "") ||
      right.createdAt.localeCompare(left.createdAt),
  );
}

function buildIndexes() {
  state.photoById = new Map(state.photos.map((photo) => [photo.id, photo]));
  state.locationById = new Map(
    state.master.locations.map((location) => [location.id, location]),
  );
  state.prefectureById = new Map(
    state.master.prefectures.map((prefecture) => [prefecture.id, prefecture]),
  );
  const locationPhotos = new Map();
  const prefecturePhotos = new Map();

  for (const photo of state.photos) {
    const location = state.locationById.get(photo.locationId);
    if (!location) continue;
    const atLocation = locationPhotos.get(location.id) ?? [];
    atLocation.push(photo);
    locationPhotos.set(location.id, atLocation);
    const atPrefecture = prefecturePhotos.get(location.prefectureId) ?? [];
    atPrefecture.push(photo);
    prefecturePhotos.set(location.prefectureId, atPrefecture);
  }

  state.photosByLocation = new Map(
    [...locationPhotos].map(([id, photos]) => [id, sortPhotos(photos)]),
  );
  state.photosByPrefecture = new Map(
    [...prefecturePhotos].map(([id, photos]) => [id, sortPhotos(photos)]),
  );
}

function updateMapStyles() {
  const map = $("mapBrowseMap");
  for (const shape of map.querySelectorAll("g[data-prefecture-id]")) {
    const prefectureId = shape.dataset.prefectureId;
    const count = photosForPrefecture(prefectureId).length;
    shape.classList.toggle("has-photos", count > 0);
    shape.classList.toggle(
      "selected",
      prefectureId === state.selectedPrefectureId,
    );
    shape.setAttribute(
      "aria-label",
      `${state.prefectureById.get(prefectureId)?.name ?? prefectureId}、写真${count}枚`,
    );
    const title = shape.querySelector("title");
    if (title) {
      title.textContent = `${state.prefectureById.get(prefectureId)?.name ?? prefectureId}（写真 ${count} 枚）`;
    }
  }
}

async function loadMap() {
  const response = await fetch("/maps/japan-regions.svg");
  if (!response.ok) throw new Error(`日本地図を読み込めませんでした（HTTP ${response.status}）`);
  const source = await response.text();
  const document = new DOMParser().parseFromString(source, "image/svg+xml");
  const svg = document.documentElement;
  if (svg.localName !== "svg" || document.querySelector("parsererror")) {
    throw new Error("日本地図のSVGデータが正しくありません");
  }
  const map = document.importNode(svg, true);
  map.classList.add("map-browse-svg");
  map.setAttribute("role", "group");
  map.setAttribute("aria-label", "都道府県を選択する日本地図");

  for (const shape of map.querySelectorAll("g[id^='pref-']")) {
    const prefectureId = shape.id.slice("pref-".length);
    shape.dataset.prefectureId = prefectureId;
    shape.setAttribute("role", "button");
    shape.setAttribute("tabindex", "0");
    shape.addEventListener("click", () => selectPrefecture(prefectureId));
    shape.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      selectPrefecture(prefectureId);
    });
  }

  $("mapBrowseMap").replaceChildren(map);
  updateMapStyles();
}

function renderLocations() {
  const prefectureId = state.selectedPrefectureId;
  const prefecture = state.prefectureById.get(prefectureId);
  const photos = photosForPrefecture(prefectureId);
  $("mapBrowsePrefectureTitle").textContent = prefecture
    ? `${prefecture.name}（写真 ${photos.length} 枚）`
    : "都道府県を選択";

  const locations = state.master.locations
    .filter((location) => location.prefectureId === prefectureId)
    .map((location) => ({
      location,
      count: photosForLocation(location.id).length,
    }))
    .filter(({ count }) => count > 0)
    .sort(
      (left, right) =>
        right.count - left.count ||
        left.location.name.localeCompare(right.location.name, "ja"),
    );

  const list = $("mapBrowseLocations");
  if (!prefecture) {
    list.replaceChildren(node("p", "muted", "地図上の都道府県を選択してください。"));
    return;
  }
  if (locations.length === 0) {
    list.replaceChildren(node("p", "muted", "この都道府県には写真がありません。"));
    return;
  }

  list.replaceChildren(
    ...locations.map(({ location, count }) => {
      const button = node(
        "button",
        `map-browse-location${location.id === state.selectedLocationId ? " selected" : ""}`,
      );
      button.type = "button";
      button.append(
        node("span", "", location.name),
        node("small", "", `${count}枚`),
      );
      button.addEventListener("click", () => selectLocation(location.id));
      return button;
    }),
  );
}

function renderLocationPhotos() {
  const location = state.locationById.get(state.selectedLocationId);
  const photos = location ? photosForLocation(location.id) : [];
  $("mapBrowseLocationTitle").textContent = location
    ? `${location.name}（${photos.length}枚）`
    : "撮影地点";
  const list = $("mapBrowsePhotos");

  if (!location) {
    list.replaceChildren(
      node("p", "muted", "撮影地点を選択すると写真が表示されます。"),
    );
    return;
  }

  list.replaceChildren(
    ...photos.map((photo) => {
      const button = node(
        "button",
        `map-browse-thumbnail${photo.id === state.selectedPhotoId ? " selected" : ""}`,
      );
      button.type = "button";
      const image = node("img");
      image.src = photo.thumbnail;
      image.alt = photo.title;
      image.loading = "lazy";
      button.append(
        image,
        node("span", "", photo.title),
        node("small", "", photo.date ?? "撮影日不明"),
      );
      button.addEventListener("click", () => selectPhoto(photo.id));
      return button;
    }),
  );
}

function draftFor(photo) {
  let draft = state.drafts.get(photo.id);
  if (!draft) {
    draft = {
      comment: photo.comment ?? "",
      photoMemory: photo.photoMemory ?? "",
      isFavorite: photo.isFavorite === true,
      version: 0,
      savedVersion: 0,
    };
    state.drafts.set(photo.id, draft);
  }
  return draft;
}

function renderPhotoDetail() {
  const photo = state.photoById.get(state.selectedPhotoId);
  const detail = $("mapBrowsePhotoDetail");
  if (!photo) {
    detail.hidden = true;
    return;
  }

  const location = state.locationById.get(photo.locationId);
  const draft = draftFor(photo);
  detail.hidden = false;
  $("mapBrowseImage").src = photo.image;
  $("mapBrowseImage").alt = photo.title;
  $("mapBrowsePhotoCaption").textContent =
    `${photo.title} · ${photo.date ?? "撮影日不明"}`;
  $("mapBrowsePhotoMeta").textContent =
    `${location?.name ?? photo.locationId} / ${photo.date ?? "撮影日不明"} / ${photo.id}`;
  $("mapBrowseFavorite").checked = draft.isFavorite;
  $("mapBrowseComment").value = draft.comment;
  $("mapBrowseMemory").value = draft.photoMemory;
  $("mapBrowseGenerateMemory").disabled = !draft.isFavorite;
  $("mapBrowsePrevious").disabled =
    photosForLocation(photo.locationId).findIndex((item) => item.id === photo.id) <= 0;
  $("mapBrowseNext").disabled =
    photosForLocation(photo.locationId).findIndex((item) => item.id === photo.id) >=
    photosForLocation(photo.locationId).length - 1;
  $("mapBrowseSaveStatus").textContent =
    draft.version > draft.savedVersion ? "未保存の変更があります" : "";
  renderStoryEditor(photo, location);
  renderLocationPhotos();
}

function renderStoryEditor(photo, location) {
  const hasSessionDate = Boolean(photo.date);
  const key = hasSessionDate
    ? storySessionKey(photo.locationId, photo.date)
    : null;
  const story = hasSessionDate
    ? locationStoryForSession(photo.locationId, photo.date)
    : null;
  const persistedText = story?.text ?? "";
  const draftText = key && state.storyDrafts.has(key)
    ? state.storyDrafts.get(key)
    : persistedText;
  const isDirty = draftText.trim() !== persistedText;

  $("mapBrowseStorySession").textContent = hasSessionDate
    ? `${location?.name ?? photo.locationId} / ${photo.date}${story ? ` / 現在の版 v${story.version}` : " / 未登録"}`
    : "撮影日不明の写真にはStoryを設定できません。";
  $("mapBrowseStory").value = draftText;
  $("mapBrowseStory").disabled =
    !hasSessionDate || state.storySavingKey === key;
  $("mapBrowseStorySave").disabled =
    !hasSessionDate || !isDirty || state.storySavingKey === key;
  $("mapBrowseStoryDelete").disabled =
    !story || isDirty || state.storySavingKey === key;
  $("mapBrowseStoryStatus").textContent = isDirty
    ? "未保存の編集があります"
    : "";
}

function selectPrefecture(prefectureId) {
  if (!state.prefectureById.has(prefectureId)) return;
  state.selectedPrefectureId = prefectureId;
  state.selectedLocationId = null;
  state.selectedPhotoId = null;
  renderLocations();
  renderLocationPhotos();
  renderPhotoDetail();
  updateMapStyles();
  const count = photosForPrefecture(prefectureId).length;
  $("mapBrowseMapStatus").textContent =
    `${state.prefectureById.get(prefectureId).name}を選択中 · 写真 ${count} 枚`;
}

function selectLocation(locationId) {
  state.selectedLocationId = locationId;
  const photos = photosForLocation(locationId);
  state.selectedPhotoId = photos[0]?.id ?? null;
  renderLocations();
  renderLocationPhotos();
  renderPhotoDetail();
}

function selectPhoto(photoId) {
  state.selectedPhotoId = photoId;
  renderPhotoDetail();
}

function updateDraftFromForm() {
  const photo = state.photoById.get(state.selectedPhotoId);
  if (!photo) return null;
  const draft = draftFor(photo);
  draft.comment = $("mapBrowseComment").value;
  draft.photoMemory = $("mapBrowseMemory").value;
  draft.isFavorite = $("mapBrowseFavorite").checked;
  draft.version += 1;
  $("mapBrowseGenerateMemory").disabled = !draft.isFavorite;
  $("mapBrowseSaveStatus").textContent = "入力中…";
  return { id: photo.id, draft };
}

function persistDraft(id) {
  const draft = state.drafts.get(id);
  if (!draft || draft.savedVersion >= draft.version) return state.saveQueue;
  const snapshot = {
    comment: draft.comment,
    photoMemory: draft.photoMemory,
    isFavorite: draft.isFavorite,
    version: draft.version,
  };

  state.saveQueue = state.saveQueue
    .catch(() => undefined)
    .then(async () => {
      if (state.selectedPhotoId === id) {
        $("mapBrowseSaveStatus").textContent = "保存中…";
      }
      const result = await request("/api/photos/update", {
        id,
        patch: {
          comment: snapshot.comment,
          photoMemory: snapshot.photoMemory,
          isFavorite: snapshot.isFavorite,
        },
      });
      const photo = state.photoById.get(id);
      if (photo) {
        photo.comment = snapshot.comment;
        photo.photoMemory = snapshot.photoMemory || undefined;
        photo.isFavorite = snapshot.isFavorite ? true : undefined;
      }
      const currentDraft = state.drafts.get(id);
      if (currentDraft) {
        currentDraft.savedVersion = Math.max(
          currentDraft.savedVersion,
          snapshot.version,
        );
      }
      if (state.selectedPhotoId === id) {
        $("mapBrowseSaveStatus").textContent =
          currentDraft && currentDraft.version > snapshot.version
            ? "未保存の変更があります"
            : "保存しました";
      }
      return result;
    })
    .catch((error) => {
      if (state.selectedPhotoId === id) {
        $("mapBrowseSaveStatus").textContent = `保存に失敗しました: ${error.message}`;
      }
    });
  return state.saveQueue;
}

function scheduleSave(id) {
  clearTimeout(state.timers.get(id));
  const timer = setTimeout(() => {
    state.timers.delete(id);
    persistDraft(id);
  }, SAVE_DELAY);
  state.timers.set(id, timer);
}

async function flushDrafts() {
  for (const [id, timer] of state.timers) {
    clearTimeout(timer);
    state.timers.delete(id);
    await persistDraft(id);
  }
  await state.saveQueue;
}

async function showFavoriteMemoryPrompt() {
  const photoId = state.selectedPhotoId;
  await flushDrafts();
  const photo = state.photoById.get(photoId);
  if (!photo || !photo.isFavorite) return;
  const location = state.locationById.get(photo.locationId);
  const sessionMemory = photo.date
    ? (state.master.sessionMemories ?? []).find(
        (memory) =>
          memory.locationId === photo.locationId &&
          memory.sessionDate === photo.date,
      )
    : null;
  const tagNames = (photo.tags ?? []).map(
    (tagId) => state.master.tags.find((tag) => tag.id === tagId)?.name ?? tagId,
  );
  document.dispatchEvent(
    new CustomEvent("favorite-memory:open", {
      detail: {
        photoId: photo.id,
        title: photo.title,
        image: photo.image,
        date: photo.date ?? "",
        locationName: location?.name ?? photo.locationId,
        tagNames,
        sessionMemoryText: sessionMemory?.text ?? "",
        existingMemory: photo.photoMemory ?? "",
      },
    }),
  );
}

async function openBrowse() {
  $("mapBrowse").hidden = false;
  $("bulkPanel").hidden = true;
  $("photoListPanel").hidden = true;
  $("manageLayout").classList.add("browse-mode");
  $("openMapBrowse").hidden = true;
  $("mapBrowseMapStatus").textContent = "地図と写真を読み込んでいます…";
  try {
    [state.photos, state.master] = await Promise.all([
      request("/api/photos"),
      request("/api/master"),
    ]);
    buildIndexes();
    await loadMap();
    $("mapBrowseMapStatus").textContent = "地図から都道府県を選択してください。";
    renderLocations();
    renderLocationPhotos();
    renderPhotoDetail();
  } catch (error) {
    $("mapBrowseMapStatus").textContent = `地図編集モードを開けませんでした: ${error.message}`;
  }
}

async function closeBrowse() {
  await flushDrafts();
  const hasUnsavedStory = [...state.storyDrafts].some(([key, text]) => {
    const [locationId, sessionDate] = key.split("|");
    return text.trim() !==
      (locationStoryForSession(locationId, sessionDate)?.text ?? "");
  });
  if (
    hasUnsavedStory &&
    !window.confirm("Storyに未保存の編集があります。保存せずに一覧へ戻りますか？")
  ) {
    return;
  }
  $("mapBrowse").hidden = true;
  $("bulkPanel").hidden = false;
  $("photoListPanel").hidden = false;
  $("manageLayout").classList.remove("browse-mode");
  $("openMapBrowse").hidden = false;
  document.dispatchEvent(new CustomEvent("photo-atlas:photos-updated"));
}

$("openMapBrowse").addEventListener("click", openBrowse);
$("closeMapBrowse").addEventListener("click", closeBrowse);
$("mapBrowseClearPrefecture").addEventListener("click", () => {
  state.selectedPrefectureId = null;
  state.selectedLocationId = null;
  state.selectedPhotoId = null;
  $("mapBrowseMapStatus").textContent = "地図から都道府県を選択してください。";
  updateMapStyles();
  renderLocations();
  renderLocationPhotos();
  renderPhotoDetail();
});
$("mapBrowseComment").addEventListener("input", () => {
  const update = updateDraftFromForm();
  if (update) scheduleSave(update.id);
});
$("mapBrowseMemory").addEventListener("input", () => {
  const update = updateDraftFromForm();
  if (update) scheduleSave(update.id);
});
$("mapBrowseStory").addEventListener("input", () => {
  const photo = state.photoById.get(state.selectedPhotoId);
  if (!photo?.date) return;
  const key = storySessionKey(photo.locationId, photo.date);
  state.storyDrafts.set(key, $("mapBrowseStory").value);
  const story = locationStoryForSession(photo.locationId, photo.date);
  const hasChanges = $("mapBrowseStory").value.trim() !== (story?.text ?? "");
  $("mapBrowseStorySave").disabled =
    !hasChanges || state.storySavingKey === key;
  $("mapBrowseStoryStatus").textContent = hasChanges
    ? "未保存の編集があります"
    : "";
});
$("mapBrowseStorySave").addEventListener("click", async () => {
  const photo = state.photoById.get(state.selectedPhotoId);
  if (!photo?.date) return;
  const locationId = photo.locationId;
  const sessionDate = photo.date;
  const key = storySessionKey(locationId, sessionDate);
  const text = $("mapBrowseStory").value.trim();
  if (!text) {
    $("mapBrowseStoryStatus").textContent = "Story本文を入力してください。";
    return;
  }

  state.storySavingKey = key;
  renderStoryEditor(photo, state.locationById.get(locationId));
  $("mapBrowseStoryStatus").textContent = "保存中…";
  let statusMessage = "";
  try {
    const result = await request("/api/location-stories/save", {
      locationId,
      sessionDate,
      text,
    });
    const stories = state.master.locationStories ?? [];
    if (
      !stories.some((story) => story.id === result.locationStory.id)
    ) {
      stories.push(result.locationStory);
      state.master.locationStories = stories;
    } else {
      state.master.locationStories = stories.map((story) =>
        story.id === result.locationStory.id ? result.locationStory : story,
      );
    }
    state.storyDrafts.delete(key);
    if (
      state.selectedPhotoId &&
      storySessionKey(
        state.photoById.get(state.selectedPhotoId)?.locationId,
        state.photoById.get(state.selectedPhotoId)?.date,
      ) === key
    ) {
      renderPhotoDetail();
      statusMessage = result.unchanged
        ? "変更はありません"
        : `保存しました（v${result.locationStory.version}）`;
    }
  } catch (error) {
    statusMessage = `保存に失敗しました: ${error.message}`;
  } finally {
    state.storySavingKey = null;
    const currentPhoto = state.photoById.get(state.selectedPhotoId);
    if (currentPhoto) {
      const currentKey = currentPhoto.date
        ? storySessionKey(currentPhoto.locationId, currentPhoto.date)
        : null;
      renderStoryEditor(
        currentPhoto,
        state.locationById.get(currentPhoto.locationId),
      );
      if (currentKey === key && statusMessage) {
        $("mapBrowseStoryStatus").textContent = statusMessage;
      }
    }
  }
});
$("mapBrowseStoryDelete").addEventListener("click", async () => {
  const photo = state.photoById.get(state.selectedPhotoId);
  if (!photo?.date) return;
  const locationId = photo.locationId;
  const sessionDate = photo.date;
  const key = storySessionKey(locationId, sessionDate);
  const story = locationStoryForSession(locationId, sessionDate);
  if (
    !story ||
    !window.confirm(
      `${state.locationById.get(locationId)?.name ?? locationId} / ${sessionDate} のStoryと全バージョンを削除しますか？未保存の編集も破棄されます。`,
    )
  ) {
    return;
  }

  state.storySavingKey = key;
  renderStoryEditor(photo, state.locationById.get(locationId));
  $("mapBrowseStoryStatus").textContent = "削除中…";
  let statusMessage = "";
  try {
    await request("/api/location-stories/delete", {
      locationId,
      sessionDate,
    });
    state.master.locationStories = (state.master.locationStories ?? []).filter(
      (item) =>
        item.locationId !== locationId || item.sessionDate !== sessionDate,
    );
    state.storyDrafts.delete(key);
    if (
      state.selectedPhotoId &&
      storySessionKey(
        state.photoById.get(state.selectedPhotoId)?.locationId,
        state.photoById.get(state.selectedPhotoId)?.date,
      ) === key
    ) {
      renderPhotoDetail();
      statusMessage = "Storyを削除しました";
    }
  } catch (error) {
    statusMessage = `削除に失敗しました: ${error.message}`;
  } finally {
    state.storySavingKey = null;
    const currentPhoto = state.photoById.get(state.selectedPhotoId);
    if (currentPhoto) {
      const currentKey = currentPhoto.date
        ? storySessionKey(currentPhoto.locationId, currentPhoto.date)
        : null;
      renderStoryEditor(
        currentPhoto,
        state.locationById.get(currentPhoto.locationId),
      );
      if (currentKey === key && statusMessage) {
        $("mapBrowseStoryStatus").textContent = statusMessage;
      }
    }
  }
});
$("mapBrowseFavorite").addEventListener("change", () => {
  const update = updateDraftFromForm();
  if (update) {
    clearTimeout(state.timers.get(update.id));
    state.timers.delete(update.id);
    persistDraft(update.id);
  }
});
$("mapBrowseGenerateMemory").addEventListener("click", showFavoriteMemoryPrompt);
$("mapBrowsePrevious").addEventListener("click", () => {
  const photos = photosForLocation(state.selectedLocationId);
  const index = photos.findIndex((photo) => photo.id === state.selectedPhotoId);
  if (index > 0) selectPhoto(photos[index - 1].id);
});
$("mapBrowseNext").addEventListener("click", () => {
  const photos = photosForLocation(state.selectedLocationId);
  const index = photos.findIndex((photo) => photo.id === state.selectedPhotoId);
  if (index >= 0 && index < photos.length - 1) selectPhoto(photos[index + 1].id);
});
document.addEventListener("favorite-memory:saved", async (event) => {
  if (!state.master || !state.photoById.has(event.detail.photoId)) return;
  const photos = await request("/api/photos");
  state.photos = photos;
  buildIndexes();
  const current = state.photoById.get(event.detail.photoId);
  if (current) {
    state.drafts.delete(current.id);
    renderPhotoDetail();
  }
});
