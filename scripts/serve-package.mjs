// A portable, dependency-free preview. It serves only dist/ on loopback.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../dist");
const base = "/concord-landing-concept/";
const portArgument = process.argv.indexOf("--port");
const port = portArgument < 0 ? 4174 : Number(process.argv[portArgument + 1]);
if (!Number.isInteger(port) || port < 1024 || port > 65535) {
  console.error("Use --port with a number from 1024 to 65535.");
  process.exit(1);
}
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};
const cache = new Map();
const server = createServer(async (request, response) => {
  if (!["GET", "HEAD"].includes(request.method)) {
    response.writeHead(405, { Allow: "GET, HEAD" }).end();
    return;
  }
  try {
    const url = new URL(request.url, "http://127.0.0.1");
    if (url.pathname === "/" || url.pathname === base.slice(0, -1)) {
      response.writeHead(302, { Location: base }).end();
      return;
    }
    if (!url.pathname.startsWith(base)) {
      response.writeHead(404).end();
      return;
    }
    const relative =
      decodeURIComponent(url.pathname.slice(base.length)) || "index.html";
    const target = resolve(root, relative);
    if (!target.startsWith(root + sep)) {
      response.writeHead(403).end();
      return;
    }
    let asset = cache.get(target);
    if (!asset) {
      const data = await readFile(target);
      const compressible = /\.(html|js|css|json|txt|svg)$/.test(target);
      asset = { data, compressed: compressible ? gzipSync(data) : null };
      cache.set(target, asset);
    }
    const compressed =
      asset.compressed &&
      /\bgzip\b/.test(request.headers["accept-encoding"] ?? "");
    const body = compressed ? asset.compressed : asset.data;
    response.writeHead(200, {
      "Content-Type": mime[extname(target)] ?? "application/octet-stream",
      "Content-Length": body.length,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      Vary: "Accept-Encoding",
      ...(compressed ? { "Content-Encoding": "gzip" } : {}),
    });
    response.end(request.method === "HEAD" ? undefined : body);
  } catch {
    response.writeHead(404).end();
  }
});
server.on("error", (error) => {
  console.error(
    error.code === "EADDRINUSE"
      ? `Port ${port} is already in use. Choose another with --port; no existing process was changed.`
      : error.message,
  );
  process.exit(1);
});
server.listen(port, "127.0.0.1", () => {
  console.log(`Concord Landing preview: http://127.0.0.1:${port}${base}`);
  console.log("Keep this window open. Press Ctrl+C to stop the preview.");
});
process.on("SIGINT", () => server.close(() => process.exit(0)));
