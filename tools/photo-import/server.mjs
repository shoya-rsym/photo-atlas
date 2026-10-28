// 写真登録ツール（管理者がローカルで使う。GitHub Pagesには含まれない）
// 起動: npm run import
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  commitImport,
  discardStaged,
  initStaging,
  loadMaster,
  readPreview,
  stageImage,
} from "./lib/importer.mjs";
import { loadRecent } from "./lib/store.mjs";
import {
  bulkUpdate,
  deletePhotos,
  loadPhotos,
  pruneLocations,
  readImageFile,
  updatePhoto,
} from "./lib/manager.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT ?? 4321);
const HOST = "127.0.0.1";
const MAX_UPLOAD_BYTES = 80 * 1024 * 1024;

/** ブラウザへ配信してよいファイルのみ（ホワイトリスト） */
const STATIC = {
  "/": ["public/index.html", "text/html; charset=utf-8"],
  "/app.js": ["public/app.js", "text/javascript; charset=utf-8"],
  "/style.css": ["public/style.css", "text/css; charset=utf-8"],
  "/lib/date.mjs": ["lib/date.mjs", "text/javascript; charset=utf-8"],
  "/lib/search.mjs": ["lib/search.mjs", "text/javascript; charset=utf-8"],
  "/lib/folder-name.mjs": ["lib/folder-name.mjs", "text/javascript; charset=utf-8"],
  "/manage": ["public/manage.html", "text/html; charset=utf-8"],
  "/manage.js": ["public/manage.js", "text/javascript; charset=utf-8"],
};

const IMAGE_TYPES = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };

function send(res, status, body, type = "application/json; charset=utf-8") {
  res.writeHead(status, { "content-type": type, "cache-control": "no-store" });
  res.end(typeof body === "string" || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}

async function readBody(req, limit) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw new Error("ファイルが大きすぎます");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

/** 他サイトのページからの書き込みを防ぐ（DNSリバインディング・CSRF対策） */
function isAllowedHost(req) {
  const host = req.headers.host ?? "";
  return host === `127.0.0.1:${PORT}` || host === `localhost:${PORT}`;
}

const server = createServer(async (req, res) => {
  try {
    if (!isAllowedHost(req)) return send(res, 403, { error: "forbidden" });
    const url = new URL(req.url ?? "/", `http://${HOST}:${PORT}`);
    const path = url.pathname;

    if (req.method === "GET") {
      if (STATIC[path]) {
        const [file, type] = STATIC[path];
        return send(res, 200, await readFile(join(HERE, file)), type);
      }
      if (path === "/api/master") {
        return send(res, 200, { ...(await loadMaster()), recent: await loadRecent() });
      }
      if (path === "/api/photos") return send(res, 200, await loadPhotos());
      const image = /^\/(photos|thumbnails)\/([A-Za-z0-9_.-]+)$/.exec(path);
      if (image) {
        const data = await readImageFile(image[1], image[2]);
        const type = IMAGE_TYPES[image[2].split(".").pop()?.toLowerCase() ?? ""];
        if (!data || !type) return send(res, 404, { error: "not found" });
        res.writeHead(200, { "content-type": type, "cache-control": "max-age=30" });
        return res.end(data);
      }
      const preview = /^\/api\/preview\/([0-9a-f]+)$/.exec(path);
      if (preview) {
        const data = await readPreview(preview[1]);
        return data ? send(res, 200, data, "image/webp") : send(res, 404, { error: "not found" });
      }
      return send(res, 404, { error: "not found" });
    }

    if (req.method === "POST") {
      // カスタムヘッダー必須（CORSプリフライトを要求し、他オリジンからの送信を拒否する）
      if (req.headers["x-photo-import"] !== "1") return send(res, 403, { error: "forbidden" });

      if (path === "/api/stage") {
        const name = url.searchParams.get("name") ?? "image";
        return send(res, 200, await stageImage(name, await readBody(req, MAX_UPLOAD_BYTES)));
      }
      if (path === "/api/discard") {
        const body = JSON.parse((await readBody(req, 1024 * 1024)).toString("utf8"));
        await discardStaged(body.tokens ?? []);
        return send(res, 200, { ok: true });
      }
      if (path === "/api/commit") {
        const body = JSON.parse((await readBody(req, 5 * 1024 * 1024)).toString("utf8"));
        return send(res, 200, await commitImport(body));
      }
      const json = async () => JSON.parse((await readBody(req, 5 * 1024 * 1024)).toString("utf8"));
      if (path === "/api/photos/update") {
        const body = await json();
        return send(res, 200, await updatePhoto(String(body.id), body.patch ?? {}));
      }
      if (path === "/api/photos/bulk") return send(res, 200, await bulkUpdate(await json()));
      if (path === "/api/photos/delete") return send(res, 200, await deletePhotos((await json()).ids));
      if (path === "/api/locations/prune") return send(res, 200, await pruneLocations());
    }
    return send(res, 404, { error: "not found" });
  } catch (error) {
    return send(res, 400, { error: error instanceof Error ? error.message : String(error) });
  }
});

await initStaging();
server.listen(PORT, HOST, () => {
  console.log(`Photo Import Tool: http://localhost:${PORT}/`);
});
