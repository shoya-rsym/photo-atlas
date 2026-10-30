import areasJson from "@/data/areas.json";
import prefecturesJson from "@/data/prefectures.json";
import locationsJson from "@/data/locations.json";
import tagsJson from "@/data/tags.json";
import charactersJson from "@/data/characters.json";
import photosJson from "@/data/photos.json";
import japanMapRegionsJson from "@/data/japan-map-regions.json";
import subregionsJson from "@/data/subregions.json";
import sessionMemoriesJson from "@/data/session-memories.json";
import type {
  Area,
  Character,
  JapanMapRegion,
  Location,
  Photo,
  Prefecture,
  Subregion,
  SessionMemory,
  Tag,
} from "@/types";

export const subregions: Subregion[] = subregionsJson as Subregion[];
function isSessionMemoryGenerator(
  value: string,
): value is SessionMemory["generatedBy"] {
  return value === "template" || value === "ai" || value === "manual";
}

export const sessionMemories: SessionMemory[] = sessionMemoriesJson.map((memory) => {
  if (!isSessionMemoryGenerator(memory.generatedBy)) {
    throw new Error(`session-memories.json: 不正な生成元 ${memory.id}`);
  }
  return { ...memory, generatedBy: memory.generatedBy };
});

function isPhotoMemorySource(
  value: string | undefined,
): value is Photo["photoMemorySource"] {
  return value === undefined || value === "copilot" || value === "manual";
}

function parsePhoto(photo: (typeof photosJson)[number]): Photo {
  if (!isPhotoMemorySource(photo.photoMemorySource)) {
    throw new Error(`photos.json: 不正なFavorite Memoryの設定元 ${photo.id}`);
  }
  return { ...photo, photoMemorySource: photo.photoMemorySource };
}

export const areas: Area[] = areasJson;
export const prefectures: Prefecture[] = prefecturesJson;
export const locations: Location[] = locationsJson;
export const tags: Tag[] = tagsJson;
export const characters: Character[] = charactersJson;
export const photos: Photo[] = photosJson.map(parsePhoto);
export const japanMapRegions: JapanMapRegion[] = japanMapRegionsJson;
