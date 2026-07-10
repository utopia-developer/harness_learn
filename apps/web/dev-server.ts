import { createReadStream } from "node:fs";
import { readFile } from "node:fs/promises";
import { createServer, type ServerResponse } from "node:http";
import { extname, join } from "node:path";

import { handleApiRequest } from "../api/src/server.js";

const port = Number.parseInt(process.env.HARNESS_WEB_PORT ?? "5173", 10);
const host = process.env.HARNESS_WEB_HOST ?? "127.0.0.1";
const rootDir = process.cwd();

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", `http://${host}:${port}`);

  if (url.pathname.startsWith("/api/")) {
    const apiResponse = await handleApiRequest({
      method: request.method,
      url: `${url.pathname}${url.search}`
    });
    response.writeHead(apiResponse.statusCode, apiResponse.headers);
    response.end(JSON.stringify(apiResponse.body));
    return;
  }

  if (url.pathname === "/" || url.pathname === "/index.html") {
    await sendFile(response, join(rootDir, "apps/web/index.html"), "text/html; charset=utf-8");
    return;
  }

  if (url.pathname === "/assets/main.js") {
    await sendFile(response, join(rootDir, "dist/apps/web/src/main.js"), "text/javascript; charset=utf-8");
    return;
  }

  if (url.pathname === "/assets/styles.css") {
    await sendFile(response, join(rootDir, "apps/web/src/styles.css"), "text/css; charset=utf-8");
    return;
  }

  response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
  response.end("Not found");
});

server.listen(port, host, () => {
  console.log(`Harness Web listening on http://${host}:${port}`);
});

async function sendFile(
  response: ServerResponse,
  path: string,
  contentType: string
): Promise<void> {
  try {
    await readFile(path);
    response.writeHead(200, { "content-type": contentTypeFor(path, contentType) });
    createReadStream(path).pipe(response);
  } catch {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
}

function contentTypeFor(path: string, fallback: string): string {
  if (extname(path) === ".js") {
    return "text/javascript; charset=utf-8";
  }
  if (extname(path) === ".css") {
    return "text/css; charset=utf-8";
  }
  return fallback;
}
