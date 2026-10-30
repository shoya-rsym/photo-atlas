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
export const sessionMemories: SessionMemory[] = sessionMemoriesJson;

export const areas: Area[] = areasJson;
export const prefectures: Prefecture[] = prefecturesJson;
export const locations: Location[] = locationsJson;
export const tags: Tag[] = tagsJson;
export const characters: Character[] = charactersJson;
export const photos: Photo[] = photosJson;
export const japanMapRegions: JapanMapRegion[] = japanMapRegionsJson;
