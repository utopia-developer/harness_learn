export type SkillActivation = "explicit" | "semantic";

export type Skill = {
  id: string;
  name: string;
  version: string;
  description: string;
  activation: SkillActivation;
  triggers: string[];
  allowedTools: string[];
  body: string;
  filterAllowedTools(toolNames: string[]): string[];
};

export type SelectSkillsInput = {
  skills: Skill[];
  userMessage: string;
  explicitSkillIds: string[];
};

export type SkillRepository = {
  save(skill: Skill): void;
  get(id: string): Skill | undefined;
  history(id: string): Skill[];
  rollback(id: string, version: string): Skill;
};

export function loadSkillFromMarkdown(markdown: string): Skill {
  const match = markdown.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) {
    throw new Error("Skill markdown must start with YAML frontmatter");
  }

  const metadata = parseFrontmatter(match[1]);
  const body = match[2].trim();
  const allowedTools = readStringArray(metadata.allowedTools);
  return {
    id: readString(metadata.id, "id"),
    name: readString(metadata.name, "name"),
    version: readString(metadata.version, "version"),
    description: readString(metadata.description, "description"),
    activation: readActivation(metadata.activation),
    triggers: readStringArray(metadata.triggers),
    allowedTools,
    body,
    filterAllowedTools(toolNames) {
      const allowed = new Set(allowedTools);
      return toolNames.filter((toolName) => allowed.has(toolName));
    }
  };
}

export function selectSkillsForTask(input: SelectSkillsInput): Skill[] {
  const explicit = new Set(input.explicitSkillIds);
  const message = input.userMessage.toLowerCase();

  return input.skills.filter((skill) => {
    if (explicit.has(skill.id)) {
      return true;
    }
    if (skill.activation !== "semantic") {
      return false;
    }
    return skill.triggers.some((trigger) => message.includes(trigger.toLowerCase()));
  });
}

export function createSkillRepository(): SkillRepository {
  const versions = new Map<string, Skill[]>();

  return {
    save(skill) {
      const history = versions.get(skill.id) ?? [];
      history.push(cloneSkill(skill));
      versions.set(skill.id, history);
    },
    get(id) {
      const history = versions.get(id) ?? [];
      const skill = history.at(-1);
      return skill ? cloneSkill(skill) : undefined;
    },
    history(id) {
      return (versions.get(id) ?? []).map(cloneSkill);
    },
    rollback(id, version) {
      const history = versions.get(id) ?? [];
      const target = history.find((skill) => skill.version === version);
      if (!target) {
        throw new Error(`Skill version not found: ${id}@${version}`);
      }
      history.push(cloneSkill(target));
      versions.set(id, history);
      return cloneSkill(target);
    }
  };
}

function parseFrontmatter(source: string): Record<string, string | string[]> {
  const metadata: Record<string, string | string[]> = {};
  const lines = source.split(/\r?\n/);
  let currentListKey: string | undefined;

  for (const line of lines) {
    const listItem = line.match(/^\s*-\s+(.+)$/);
    if (listItem && currentListKey) {
      const values = metadata[currentListKey];
      if (Array.isArray(values)) {
        values.push(listItem[1].trim());
      }
      continue;
    }

    const pair = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!pair) {
      continue;
    }

    const key = pair[1];
    const value = pair[2].trim();
    if (value.length === 0) {
      metadata[key] = [];
      currentListKey = key;
      continue;
    }

    metadata[key] = value;
    currentListKey = undefined;
  }

  return metadata;
}

function readString(value: string | string[] | undefined, field: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Skill field is required: ${field}`);
  }
  return value;
}

function readStringArray(value: string | string[] | undefined): string[] {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return [...value];
  }
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function readActivation(value: string | string[] | undefined): SkillActivation {
  if (value === "explicit" || value === "semantic") {
    return value;
  }
  throw new Error(`Invalid skill activation: ${String(value)}`);
}

function cloneSkill(skill: Skill): Skill {
  return {
    ...skill,
    triggers: [...skill.triggers],
    allowedTools: [...skill.allowedTools],
    filterAllowedTools(toolNames) {
      const allowed = new Set(skill.allowedTools);
      return toolNames.filter((toolName) => allowed.has(toolName));
    }
  };
}
