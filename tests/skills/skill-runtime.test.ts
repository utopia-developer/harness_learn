import test from "node:test";
import assert from "node:assert/strict";

import {
  createSkillRepository,
  loadSkillFromMarkdown,
  selectSkillsForTask
} from "../../src/skills/skill-runtime.js";

const reviewSkill = `---
id: code-review
name: Code Review
version: 1.0.0
description: Review code changes
activation: explicit
allowedTools:
  - read_file
  - search_text
---

Read the diff and report risks.
`;

const docsSkill = `---
id: docs-writer
name: Docs Writer
version: 1.0.0
description: Write implementation docs
activation: semantic
triggers:
  - documentation
  - docs
allowedTools:
  - read_file
---

Write concise documentation.
`;

test("loadSkillFromMarkdown parses frontmatter and body", () => {
  const skill = loadSkillFromMarkdown(reviewSkill);

  assert.equal(skill.id, "code-review");
  assert.equal(skill.activation, "explicit");
  assert.deepEqual(skill.allowedTools, ["read_file", "search_text"]);
  assert.match(skill.body, /Read the diff/);
});

test("selectSkillsForTask honors explicit invocation and semantic triggers", () => {
  const skills = [
    loadSkillFromMarkdown(reviewSkill),
    loadSkillFromMarkdown(docsSkill)
  ];

  assert.deepEqual(
    selectSkillsForTask({
      skills,
      userMessage: "Please write implementation documentation",
      explicitSkillIds: []
    }).map((skill) => skill.id),
    ["docs-writer"]
  );
  assert.deepEqual(
    selectSkillsForTask({
      skills,
      userMessage: "Please review this",
      explicitSkillIds: ["code-review"]
    }).map((skill) => skill.id),
    ["code-review"]
  );
});

test("createSkillRepository versions and rolls back skills", () => {
  const repository = createSkillRepository();

  repository.save(loadSkillFromMarkdown(reviewSkill));
  repository.save(loadSkillFromMarkdown(reviewSkill.replace("1.0.0", "1.1.0")));
  assert.equal(repository.get("code-review")?.version, "1.1.0");
  assert.equal(repository.history("code-review").length, 2);

  const rolledBack = repository.rollback("code-review", "1.0.0");

  assert.equal(rolledBack.version, "1.0.0");
  assert.equal(repository.get("code-review")?.version, "1.0.0");
});

test("skill tool whitelist filters tools exposed to the skill", () => {
  const skill = loadSkillFromMarkdown(reviewSkill);

  assert.deepEqual(
    skill.filterAllowedTools(["read_file", "write_file", "search_text"]),
    ["read_file", "search_text"]
  );
});
