import { parse } from "yaml";

export function parseDockerYaml(content: string): unknown {
  try {
    return parse(content);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao fazer parse do YAML";
    throw new Error(`YAML invalido: ${message}`);
  }
}

// Captures comments/blank lines that precede each top-level key or array item.
// Returns a map with keys in format: "keyName" or "keyName[index]" for array items.
// Indented comments are trimmed before being added to the buffer.
// Trailing blank lines are removed from the buffer.
export function extractCommentMap(content: string): Map<string, string> {
  const result = new Map<string, string>();
  const lines = content.split("\n");
  let buffer: string[] = [];
  let currentArrayKey: string | null = null;
  let nextArrayIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isBlank = line.trim() === "";
    const trimmed = line.trim();
    const isComment = trimmed.startsWith("#");
    const isArrayItem = trimmed.startsWith("- ");
    const isTopLevelKey =
      !line.startsWith(" ") && !line.startsWith("\t") && !isComment && line.includes(":");

    if (isBlank) {
      buffer.push("");
    } else if (isComment) {
      buffer.push(trimmed);
    } else if (isTopLevelKey) {
      const key = line.slice(0, line.indexOf(":")).trim();
      if (buffer.length > 0) {
        // Trim trailing blank lines from buffer
        while (buffer.length > 0 && buffer[buffer.length - 1] === "") {
          buffer.pop();
        }
        result.set(key, buffer.join("\n"));
      }
      buffer = [];
      currentArrayKey = null;
      nextArrayIndex = 0;
    } else if (isArrayItem) {
      // Find parent key if not already set
      if (!currentArrayKey) {
        for (let j = i - 1; j >= 0; j--) {
          const prevLine = lines[j];
          if (!prevLine.startsWith(" ") && !prevLine.startsWith("\t")) {
            const colonIdx = prevLine.indexOf(":");
            if (colonIdx > 0 && !prevLine.trim().startsWith("#")) {
              currentArrayKey = prevLine.slice(0, colonIdx).trim();
              break;
            }
          }
        }
      }

      // Associate buffer with current array item (by index)
      if (currentArrayKey && buffer.length > 0) {
        // Trim trailing blank lines from buffer
        while (buffer.length > 0 && buffer[buffer.length - 1] === "") {
          buffer.pop();
        }
        const key = `${currentArrayKey}[${nextArrayIndex}]`;
        result.set(key, buffer.join("\n"));
        buffer = [];
      } else if (!buffer.length && currentArrayKey) {
        // Mark that this index was seen, even if no comment
        buffer = [];
      }
      nextArrayIndex++;
    }
  }

  return result;
}