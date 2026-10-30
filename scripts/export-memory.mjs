import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildMemoryReviewMarkdown } from "../tools/photo-import/lib/memory-review.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = async (name) =>
  JSON.parse(await readFile(join(root, "src", "data", `${name}.json`), "utf8"));
const [library, locations] = await Promise.all([
  read("memory-library"),
  read("locations"),
]);
const output = join(root, "memory-review.md");
await writeFile(output, buildMemoryReviewMarkdown(library, locations), "utf8");
console.log(`Memory Reviewを出力しました: ${output}`);
