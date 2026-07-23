import type { DockerStage, DockerYamlV1, ValidationError, ValidationResult } from "./types.js";

const ALLOWED_FIELDS = new Set(["version", "from", "arg", "workdir", "copy", "run", "env", "expose", "entrypoint", "cmd", "stages"]);
const STAGE_ALLOWED_FIELDS = new Set(["from", "arg", "workdir", "copy", "run", "env", "expose", "entrypoint", "cmd"]);
const ROOT_STAGE_FIELDS = ["from", "arg", "workdir", "copy", "run", "env", "expose", "entrypoint", "cmd"] as const;

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

  const hasStages = input.stages !== undefined;

  if (!hasStages) {
    if (typeof input.from !== "string" || input.from.trim().length === 0) {
      pushError(errors, "from", "deve ser uma string nao vazia");
    }
  }

  if (!hasStages && input.workdir !== undefined) {
    if (typeof input.workdir !== "string" || input.workdir.trim().length === 0) {
      pushError(errors, "workdir", "deve ser uma string nao vazia");
    }
  }

  if (!hasStages) {
    validateStageFields(input, "", errors);
  } else {
    for (const field of ROOT_STAGE_FIELDS) {
      if (input[field] !== undefined) {
        pushError(errors, field, "nao pode ser usado junto com stages");
      }
    }

    if (!Array.isArray(input.stages)) {
      pushError(errors, "stages", "deve ser uma lista");
    } else {
      if (input.stages.length === 0) {
        pushError(errors, "stages", "deve conter ao menos um stage");
      }

      input.stages.forEach((stage, index) => {
        if (!isObject(stage)) {
          pushError(errors, `stages[${index}]`, "deve ser um objeto");
          return;
        }

        for (const key of Object.keys(stage)) {
          if (!STAGE_ALLOWED_FIELDS.has(key)) {
            pushError(errors, `stages[${index}].${key}`, "campo nao suportado no stage");
          }
        }

        if (typeof stage.from !== "string" || stage.from.trim().length === 0) {
          pushError(errors, `stages[${index}].from`, "deve ser uma string nao vazia");
        }

        validateStageFields(stage as DockerStage, `stages[${index}]`, errors);
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

function validateStageFields(stage: Partial<DockerStage>, prefix: string, errors: ValidationError[]): void {
  const path = (key: string) => (prefix ? `${prefix}.${key}` : key);

  if (stage.arg !== undefined) {
    if (!isObject(stage.arg)) {
      pushError(errors, path("arg"), "deve ser um objeto chave-valor");
    } else {
      for (const [key, value] of Object.entries(stage.arg)) {
        if (key.trim().length === 0) {
          pushError(errors, path("arg"), "nao pode conter chave vazia");
          continue;
        }

        if (value !== null && typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") {
          pushError(errors, `${path("arg")}.${key}`, "deve ser string, numero, boolean ou null");
        }
      }
    }
  }

  if (stage.workdir !== undefined) {
    if (typeof stage.workdir !== "string" || stage.workdir.trim().length === 0) {
      pushError(errors, path("workdir"), "deve ser uma string nao vazia");
    }
  }

  if (stage.copy !== undefined) {
    if (!Array.isArray(stage.copy)) {
      pushError(errors, path("copy"), "deve ser uma lista");
    } else {
      stage.copy.forEach((item, index) => {
        if (!isObject(item)) {
          pushError(errors, `${path("copy")}[${index}]`, "deve ser um objeto com src e dest");
          return;
        }

        if (typeof item.src !== "string" || item.src.trim().length === 0) {
          pushError(errors, `${path("copy")}[${index}].src`, "deve ser string nao vazia");
        }

        if (typeof item.dest !== "string" || item.dest.trim().length === 0) {
          pushError(errors, `${path("copy")}[${index}].dest`, "deve ser string nao vazia");
        }
      });
    }
  }

  if (stage.run !== undefined) {
    if (!Array.isArray(stage.run)) {
      pushError(errors, path("run"), "deve ser uma lista");
    } else {
      stage.run.forEach((item, index) => {
        if (typeof item !== "string" || item.trim().length === 0) {
          pushError(errors, `${path("run")}[${index}]`, "deve ser string nao vazia");
        }
      });
    }
  }

  if (stage.env !== undefined) {
    if (!isObject(stage.env)) {
      pushError(errors, path("env"), "deve ser um objeto chave-valor");
    } else {
      for (const [key, value] of Object.entries(stage.env)) {
        if (key.trim().length === 0) {
          pushError(errors, path("env"), "nao pode conter chave vazia");
        }
        if (typeof value !== "string") {
          pushError(errors, `${path("env")}.${key}`, "deve ser string");
        }
      }
    }
  }

  if (stage.expose !== undefined) {
    if (!Array.isArray(stage.expose)) {
      pushError(errors, path("expose"), "deve ser uma lista");
    } else {
      stage.expose.forEach((item, index) => {
        if (!Number.isInteger(item)) {
          pushError(errors, `${path("expose")}[${index}]`, "deve ser inteiro");
          return;
        }

        const port = item as number;
        if (port < 1 || port > 65535) {
          pushError(errors, `${path("expose")}[${index}]`, "deve estar entre 1 e 65535");
        }
      });
    }
  }

  if (stage.entrypoint !== undefined) {
    if (!Array.isArray(stage.entrypoint)) {
      pushError(errors, path("entrypoint"), "deve ser uma lista");
    } else {
      if (stage.entrypoint.length === 0) {
        pushError(errors, path("entrypoint"), "deve conter ao menos um item");
      }

      stage.entrypoint.forEach((item, index) => {
        if (typeof item !== "string" || item.trim().length === 0) {
          pushError(errors, `${path("entrypoint")}[${index}]`, "deve ser string nao vazia");
        }
      });
    }
  }

  if (stage.cmd !== undefined) {
    if (!Array.isArray(stage.cmd)) {
      pushError(errors, path("cmd"), "deve ser uma lista");
    } else {
      if (stage.cmd.length === 0) {
        pushError(errors, path("cmd"), "deve conter ao menos um item");
      }

      stage.cmd.forEach((item, index) => {
        if (typeof item !== "string" || item.trim().length === 0) {
          pushError(errors, `${path("cmd")}[${index}]`, "deve ser string nao vazia");
        }
      });
    }
  }
}

export function assertDockerYamlV1(input: unknown): DockerYamlV1 {
  const result = validateDockerYaml(input);
  if (!result.valid) {
    const details = result.errors.map((error) => `${error.path}: ${error.message}`).join("; ");
    throw new Error(`Spec invalida: ${details}`);
  }

  return input as DockerYamlV1;
}