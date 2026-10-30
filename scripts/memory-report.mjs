import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildMemoryReportMarkdown } from "../tools/photo-import/lib/memory-review.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const monthArg = args.find((argument) => argument.startsWith("--month="))?.slice("--month=".length);
const now = new Date();
const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
const month = monthArg ?? currentMonth;
if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
  throw new Error("月は --month=YYYY-MM の形式で指定してください");
}
const read = async (name) =>
  JSON.parse(await readFile(join(root, "src", "data", `${name}.json`), "utf8"));
const [sessionMemories, library] = await Promise.all([
  read("session-memories"),
  read("memory-library"),
]);
const output = join(root, "memory-report.md");
await writeFile(
  output,
  buildMemoryReportMarkdown({ month, sessionMemories, library }),
  "utf8",
);
console.log(`Memoryレポートを出力しました: ${output}`);
