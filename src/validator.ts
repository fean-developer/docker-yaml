import type { DockerYamlV1, ValidationError, ValidationResult } from "./types.js";

const ALLOWED_FIELDS = new Set(["version", "from", "workdir", "copy", "run", "env", "expose", "entrypoint", "cmd"]);

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function pushError(errors: ValidationError[], path: string, message: string): void {
  errors.push({ path, message });
}

export function validateDockerYaml(input: unknown): ValidationResult {
  const errors: ValidationError[] = [];

  if (!isObject(input)) {
    return {
      valid: false,
      errors: [{ path: "$", message: "documento raiz deve ser um objeto" }]
    };
  }

  for (const key of Object.keys(input)) {
    if (!ALLOWED_FIELDS.has(key)) {
      pushError(errors, key, "campo nao suportado na versao 1");
    }
  }

  if (input.version !== 1) {
    pushError(errors, "version", "deve ser igual a 1");
  }

  if (typeof input.from !== "string" || input.from.trim().length === 0) {
    pushError(errors, "from", "deve ser uma string nao vazia");
  }

  if (input.workdir !== undefined) {
    if (typeof input.workdir !== "string" || input.workdir.trim().length === 0) {
      pushError(errors, "workdir", "deve ser uma string nao vazia");
    }
  }

  if (input.copy !== undefined) {
    if (!Array.isArray(input.copy)) {
      pushError(errors, "copy", "deve ser uma lista");
    } else {
      input.copy.forEach((item, index) => {
        if (!isObject(item)) {
          pushError(errors, `copy[${index}]`, "deve ser um objeto com src e dest");
          return;
        }

        if (typeof item.src !== "string" || item.src.trim().length === 0) {
          pushError(errors, `copy[${index}].src`, "deve ser string nao vazia");
        }

        if (typeof item.dest !== "string" || item.dest.trim().length === 0) {
          pushError(errors, `copy[${index}].dest`, "deve ser string nao vazia");
        }
      });
    }
  }

  if (input.run !== undefined) {
    if (!Array.isArray(input.run)) {
      pushError(errors, "run", "deve ser uma lista");
    } else {
      input.run.forEach((item, index) => {
        if (typeof item !== "string" || item.trim().length === 0) {
          pushError(errors, `run[${index}]`, "deve ser string nao vazia");
        }
      });
    }
  }

  if (input.env !== undefined) {
    if (!isObject(input.env)) {
      pushError(errors, "env", "deve ser um objeto chave-valor");
    } else {
      for (const [key, value] of Object.entries(input.env)) {
        if (key.trim().length === 0) {
          pushError(errors, "env", "nao pode conter chave vazia");
        }
        if (typeof value !== "string") {
          pushError(errors, `env.${key}`, "deve ser string");
        }
      }
    }
  }

  if (input.expose !== undefined) {
    if (!Array.isArray(input.expose)) {
      pushError(errors, "expose", "deve ser uma lista");
    } else {
      input.expose.forEach((item, index) => {
        if (!Number.isInteger(item)) {
          pushError(errors, `expose[${index}]`, "deve ser inteiro");
          return;
        }

        const port = item as number;
        if (port < 1 || port > 65535) {
          pushError(errors, `expose[${index}]`, "deve estar entre 1 e 65535");
        }
      });
    }
  }

  if (input.cmd !== undefined) {
    if (!Array.isArray(input.cmd)) {
      pushError(errors, "cmd", "deve ser uma lista");
    } else {
      if (input.cmd.length === 0) {
        pushError(errors, "cmd", "deve conter ao menos um item");
      }

      input.cmd.forEach((item, index) => {
        if (typeof item !== "string" || item.trim().length === 0) {
          pushError(errors, `cmd[${index}]`, "deve ser string nao vazia");
        }
      });
    }
  }

  if (input.entrypoint !== undefined) {
    if (!Array.isArray(input.entrypoint)) {
      pushError(errors, "entrypoint", "deve ser uma lista");
    } else {
      if (input.entrypoint.length === 0) {
        pushError(errors, "entrypoint", "deve conter ao menos um item");
      }

      input.entrypoint.forEach((item, index) => {
        if (typeof item !== "string" || item.trim().length === 0) {
          pushError(errors, `entrypoint[${index}]`, "deve ser string nao vazia");
        }
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export function assertDockerYamlV1(input: unknown): DockerYamlV1 {
  const result = validateDockerYaml(input);
  if (!result.valid) {
    const details = result.errors.map((error) => `${error.path}: ${error.message}`).join("; ");
    throw new Error(`Spec invalida: ${details}`);
  }

  return input as DockerYamlV1;
}