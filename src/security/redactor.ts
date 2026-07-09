export type RedactionRule = {
  name: string;
  pattern: RegExp;
};

export type SecretRedactor = {
  redactText(text: string): string;
  redactValue<T>(value: T): T;
};

const DEFAULT_RULES: RedactionRule[] = [
  {
    name: "openai-api-key",
    pattern: /sk-[A-Za-z0-9_-]{32,}/g
  },
  {
    name: "aws-access-key",
    pattern: /AKIA[0-9A-Z]{16}/g
  },
  {
    name: "bearer-token",
    pattern: /Bearer\s+[A-Za-z0-9._~+/=-]{24,}/g
  }
];

export function createSecretRedactor(rules: RedactionRule[] = DEFAULT_RULES): SecretRedactor {
  const redactText = (text: string): string => {
    let output = text;
    for (const rule of rules) {
      output = output.replace(rule.pattern, `[REDACTED:${rule.name}]`);
    }
    return output;
  };

  return {
    redactText,
    redactValue(value) {
      return redactUnknown(value, redactText) as typeof value;
    }
  };
}

function redactUnknown(value: unknown, redactText: (text: string) => string): unknown {
  if (typeof value === "string") {
    return redactText(value);
  }
  if (Array.isArray(value)) {
    return value.map((item) => redactUnknown(item, redactText));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [
        key,
        redactUnknown(nestedValue, redactText)
      ])
    );
  }
  return value;
}
