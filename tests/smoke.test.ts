import test from "node:test";
import assert from "node:assert/strict";

import { version } from "../src/index.js";

test("exports the package version", () => {
  assert.equal(version, "0.1.0");
});
