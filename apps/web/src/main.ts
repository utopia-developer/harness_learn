import { renderApp } from "./app/render.js";
import { createApiClient } from "./shared/api/client.js";

const root = document.querySelector<HTMLElement>("#root");

if (!root) {
  throw new Error("Missing #root element");
}

void renderApp(root, createApiClient());
