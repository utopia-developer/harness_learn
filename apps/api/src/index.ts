import { createApiServer } from "./server.js";

const port = Number.parseInt(process.env.HARNESS_API_PORT ?? "4318", 10);
const host = process.env.HARNESS_API_HOST ?? "127.0.0.1";

const server = createApiServer();

server.listen(port, host, () => {
  console.log(`Harness API listening on http://${host}:${port}`);
});
