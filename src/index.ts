import { parseDockerYaml } from "./parser.js";
import { generateDockerfile } from "./generator.js";
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

export function generate(content: string): string {
  const parsed = parseDockerYaml(content);
  const spec = assertDockerYamlV1(parsed);
  return generateDockerfile(spec);
}