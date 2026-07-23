import { parse } from "yaml";

export function parseDockerYaml(content: string): unknown {
  try {
    return parse(content);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao fazer parse do YAML";
    throw new Error(`YAML invalido: ${message}`);
  }
}