import { parse as parseDotenv } from "dotenv";

export type TemplateVariables = Record<string, string | undefined>;

export type TemplateResolveError = {
  path: string;
  message: string;
};

export type TemplateResolveResult<T> = {
  value: T;
  errors: TemplateResolveError[];
};

export type TemplateResolveOptions = {
  variables: TemplateVariables;
  strict?: boolean;
};

const PLACEHOLDER_REGEX = /\$\{([^}]+)\}/g;
const ESCAPE_SENTINEL = "__DOCKER_YAML_TEMPLATE_ESCAPED_OPEN__";

export function resolveTemplates<T>(input: T, options: TemplateResolveOptions): TemplateResolveResult<T> {
  const strict = options.strict === true;
  const errors: TemplateResolveError[] = [];

  const resolved = resolveAny(input, "$", options.variables, strict, errors) as T;
  return { value: resolved, errors };
}

function resolveAny(
  value: unknown,
  path: string,
  variables: TemplateVariables,
  strict: boolean,
  errors: TemplateResolveError[]
): unknown {
  if (typeof value === "string") {
    return resolveString(value, path, variables, strict, errors);
  }

  if (Array.isArray(value)) {
    return value.map((item, index) => resolveAny(item, `${path}[${index}]`, variables, strict, errors));
  }

  if (isObject(value)) {
    const output: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value)) {
      output[key] = resolveAny(nested, path === "$" ? key : `${path}.${key}`, variables, strict, errors);
    }
    return output;
  }

  return value;
}

function resolveString(
  value: string,
  path: string,
  variables: TemplateVariables,
  strict: boolean,
  errors: TemplateResolveError[]
): string {
  const escaped = value.replace(/\$\$\{/g, ESCAPE_SENTINEL);

  const replaced = escaped.replace(PLACEHOLDER_REGEX, (full, expression: string) => {
    const parsed = parseExpression(expression.trim());
    const variableValue = variables[parsed.name];
    const hasValue = variableValue !== undefined && variableValue !== "";

    if (parsed.kind === "plain") {
      if (hasValue) {
        return String(variableValue);
      }

      if (strict) {
        errors.push({ path, message: `variavel '${parsed.name}' nao definida` });
      }

      return full;
    }

    if (parsed.kind === "default") {
      if (hasValue) {
        return String(variableValue);
      }

      return parsed.fallback;
    }

    if (hasValue) {
      return String(variableValue);
    }

    errors.push({ path, message: parsed.message || `variavel obrigatoria '${parsed.name}' nao definida` });
    return full;
  });

  return replaced.replaceAll(ESCAPE_SENTINEL, "${");
}

type ParsedExpression =
  | { kind: "plain"; name: string }
  | { kind: "default"; name: string; fallback: string }
  | { kind: "required"; name: string; message: string };

function parseExpression(expression: string): ParsedExpression {
  const defaultSeparator = expression.indexOf(":-");
  if (defaultSeparator > -1) {
    const name = expression.slice(0, defaultSeparator).trim();
    const fallback = expression.slice(defaultSeparator + 2);
    return { kind: "default", name, fallback };
  }

  const requiredSeparator = expression.indexOf("?");
  if (requiredSeparator > -1) {
    const name = expression.slice(0, requiredSeparator).trim();
    const message = expression.slice(requiredSeparator + 1);
    return { kind: "required", name, message };
  }

  return { kind: "plain", name: expression.trim() };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function mergeVariables(sources: TemplateVariables[]): TemplateVariables {
  const merged: TemplateVariables = {};

  for (const source of sources) {
    for (const [key, value] of Object.entries(source)) {
      if (value !== undefined) {
        merged[key] = value;
      }
    }
  }

  return merged;
}

export function parseEnvLikeContent(content: string): TemplateVariables {
  return parseDotenv(content);
}
