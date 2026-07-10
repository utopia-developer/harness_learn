import { createReadStream } from "node:fs";
import { readFile } from "node:fs/promises";
import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse
} from "node:http";
import { extname, join } from "node:path";
import { pathToFileURL } from "node:url";

import { handleApiRequest, type ApiRequest } from "../api/src/server.js";

const port = Number.parseInt(process.env.HARNESS_WEB_PORT ?? "5173", 10);
const host = process.env.HARNESS_WEB_HOST ?? "127.0.0.1";
const rootDir = process.cwd();

export type WebAsset = {
  path: string;
  contentType: string;
};

export function createWebServer(options: {
  rootDir?: string;
  host?: string;
  port?: number;
} = {}): Server {
  const webRootDir = options.rootDir ?? rootDir;
  const webHost = options.host ?? host;
  const webPort = options.port ?? port;

  return createServer(async (request, response) => {
    const url = new URL(request.url ?? "/", `http://${webHost}:${webPort}`);

    if (url.pathname.startsWith("/api/")) {
      const apiResponse = await handleApiRequest(
        await createApiGatewayRequest(request, url)
      );
      response.writeHead(apiResponse.statusCode, apiResponse.headers);
      response.end(
        typeof apiResponse.body === "string"
          ? apiResponse.body
          : JSON.stringify(apiResponse.body)
      );
      return;
    }

    const asset = resolveWebAsset(url.pathname, webRootDir);
    if (asset) {
      await sendFile(response, asset.path, asset.contentType);
      return;
    }

    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
  });
}

export async function createApiGatewayRequest(
  request: IncomingMessage,
  url: URL
): Promise<ApiRequest> {
  return {
    method: request.method,
    url: `${url.pathname}${url.search}`,
    headers: request.headers,
    body: await readJsonBody(request)
  };
}

export function resolveWebAsset(pathname: string, rootDirectory: string): WebAsset | undefined {
  if (pathname === "/" || pathname === "/index.html" || extname(pathname) === "") {
    return {
      path: join(rootDirectory, "apps/web/index.html"),
      contentType: "text/html; charset=utf-8"
    };
  }

  if (pathname === "/assets/main.js") {
    return {
      path: join(rootDirectory, "dist/apps/web/src/main.js"),
      contentType: "text/javascript; charset=utf-8"
    };
  }

  if (pathname === "/assets/styles.css") {
    return {
      path: join(rootDirectory, "apps/web/src/styles.css"),
      contentType: "text/css; charset=utf-8"
    };
  }

  return undefined;
}

if (isMainModule()) {
  const server = createWebServer();
  server.listen(port, host, () => {
    console.log(`Harness Web listening on http://${host}:${port}`);
  });
}

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

async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  if (request.method !== "POST" && request.method !== "PUT" && request.method !== "PATCH") {
    return undefined;
  }
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  return raw ? JSON.parse(raw) : undefined;
}

function isMainModule(): boolean {
  return process.argv[1] !== undefined &&
    import.meta.url === pathToFileURL(process.argv[1]).href;
}
