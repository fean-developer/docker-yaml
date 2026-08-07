import { parse } from "yaml";

export function parseDockerYaml(content: string): unknown {
  try {
    return parse(content);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao fazer parse do YAML";
    throw new Error(`YAML invalido: ${message}`);
  }
}

// Returns comments/blank lines that precede each top-level YAML key.
// Only captures lines at column 0 (not indented), so nested content is ignored.
export function extractCommentMap(content: string): Map<string, string> {
  const result = new Map<string, string>();
  const lines = content.split("\n");
  let buffer: string[] = [];

  for (const line of lines) {
    const isBlank = line.trim() === "";
    const isTopLevelComment =
      !line.startsWith(" ") && !line.startsWith("\t") && line.trimStart().startsWith("#");
    const isTopLevelKey =
      !line.startsWith(" ") && !line.startsWith("\t") && !line.trimStart().startsWith("#") && line.includes(":");

    if (isBlank) {
      buffer.push("");
    } else if (isTopLevelComment) {
      buffer.push(line);
    } else if (isTopLevelKey) {
      const key = line.slice(0, line.indexOf(":")).trim();
      if (buffer.length > 0) {
        result.set(key, buffer.join("\n"));
        buffer = [];
      }
    }
    // indented content — buffer is intentionally left unchanged
  }

  return result;
}