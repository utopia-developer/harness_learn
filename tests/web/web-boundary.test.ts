import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

import { WEB_NAVIGATION } from "../../apps/web/src/app/navigation.js";

test("web navigation uses product routes from contracts", () => {
  assert.deepEqual(WEB_NAVIGATION.map((item: { href: string }) => item.href), [
    "/tasks",
    "/approvals",
    "/settings/policy",
    "/settings/plugins"
  ]);
});

test("web source does not import backend src modules directly", async () => {
  const files = await listTypeScriptFiles("apps/web/src");
  assert.ok(files.length > 0);

  for (const file of files) {
    const content = await readFile(file, "utf8");
    assert.doesNotMatch(
      content,
      /from\s+["'](?:\.\.\/){2,}src\//,
      `${file} must depend on packages/contracts or apps/api only through HTTP`
    );
  }
});

async function listTypeScriptFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      return listTypeScriptFiles(path);
    }
    if (entry.isFile() && (path.endsWith(".ts") || path.endsWith(".tsx"))) {
      return [path];
    }
    return [];
  }));
  return nested.flat();
}
