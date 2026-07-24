import { parseDockerYaml } from "./parser.js";
import { generateDockerfile } from "./generator.js";
import { mergeVariables, resolveTemplates, type TemplateVariables } from "./template.js";
import { assertDockerYamlV1, validateDockerYaml } from "./validator.js";
import type { DockerYamlV1, ValidationResult } from "./types.js";

export type { DockerYamlV1, ValidationError, ValidationResult } from "./types.js";

export function parse(content: string): unknown {
  return parseDockerYaml(content);
}

export function validate(input: unknown): ValidationResult {
  return validateDockerYaml(input);
}

export function parseAndValidate(content: string): { spec: DockerYamlV1; validation: ValidationResult } {
  const parsed = parseDockerYaml(content);
  const validation = validateDockerYaml(parsed);

  if (!validation.valid) {
    return { spec: parsed as DockerYamlV1, validation };
  }

  return { spec: assertDockerYamlV1(parsed), validation };
}

export type GenerateOptions = {
  name?: string;
  vars?: TemplateVariables;
  useProcessEnv?: boolean;
  strictTemplates?: boolean;
};

export function generate(content: string, options: GenerateOptions = {}): string {
  const parsed = parseDockerYaml(content);

  const mergedVars = mergeVariables([
    options.useProcessEnv === false ? {} : (process.env as TemplateVariables),
    options.vars ?? {}
  ]);

  const resolved = resolveTemplates(parsed, {
    variables: mergedVars,
    strict: options.strictTemplates === true
  });

  if (resolved.errors.length > 0) {
    const details = resolved.errors.map((error) => `${error.path}: ${error.message}`).join("; ");
    throw new Error(`Templates invalidos: ${details}`);
  }

  const spec = assertDockerYamlV1(resolved.value);
  return generateDockerfile(spec, { name: options.name });
}