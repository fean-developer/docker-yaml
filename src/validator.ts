import type { DockerStage, DockerYamlV1, ValidationError, ValidationResult } from "./types.js";

const ORDER_ANCHORS = new Set(["from", "shell", "arg", "workdir", "copy", "add", "run", "env", "expose", "label", "volume", "user", "healthcheck", "entrypoint", "cmd", "stopsignal"]);
const ORDER_KEYS = new Set(["shell", "arg", "workdir", "copy", "add", "run", "env", "expose", "label", "volume", "user", "healthcheck", "entrypoint", "cmd", "stopsignal"]);
const ALLOWED_FIELDS = new Set(["version", "from", "shell", "arg", "workdir", "copy", "add", "run", "env", "expose", "label", "volume", "user", "healthcheck", "entrypoint", "cmd", "stopsignal", "order", "stages"]);
const STAGE_ALLOWED_FIELDS = new Set(["from", "shell", "arg", "workdir", "copy", "add", "run", "env", "expose", "label", "volume", "user", "healthcheck", "entrypoint", "cmd", "stopsignal", "order"]);
const ROOT_STAGE_FIELDS = ["from", "shell", "arg", "workdir", "copy", "add", "run", "env", "expose", "label", "volume", "user", "healthcheck", "entrypoint", "cmd", "stopsignal", "order"] as const;

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

        if (item.chown !== undefined && (typeof item.chown !== "string" || item.chown.trim().length === 0)) {
          pushError(errors, `${path("copy")}[${index}].chown`, "deve ser string nao vazia");
        }

        if (item.afterRun !== undefined && typeof item.afterRun !== "boolean") {
          pushError(errors, `${path("copy")}[${index}].afterRun`, "deve ser boolean");
        }
      });
    }
  }

  if (stage.run !== undefined) {
    if (Array.isArray(stage.run)) {
      stage.run.forEach((item, index) => {
        if (typeof item !== "string" || item.trim().length === 0) {
          pushError(errors, `${path("run")}[${index}]`, "deve ser string nao vazia");
        }
      });
    } else if (typeof stage.run === "string") {
      if (stage.run.trim().length === 0) {
        pushError(errors, path("run"), "deve ser string nao vazia");
      }
    } else {
      pushError(errors, path("run"), "deve ser uma lista ou string");
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
        if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") {
          pushError(errors, `${path("env")}.${key}`, "deve ser string, numero ou boolean");
        }
      }
    }
  }

  if (stage.expose !== undefined) {
    const exposePorts = normalizeExposePorts(stage.expose);
    if (exposePorts === null) {
      pushError(errors, path("expose"), "deve ser uma lista ou objeto { ports, before?, after? }");
    } else {
      exposePorts.forEach((item, index) => {
        if (!Number.isInteger(item)) {
          pushError(errors, `${path("expose")}[${index}]`, "deve ser inteiro");
          return;
        }

        const port = item as number;
        if (port < 1 || port > 65535) {
          pushError(errors, `${path("expose")}[${index}]`, "deve estar entre 1 e 65535");
        }
      });

      if (isObject(stage.expose)) {
        if (!Array.isArray(stage.expose.ports)) {
          pushError(errors, `${path("expose")}.ports`, "deve ser uma lista");
        }

        validateBeforeAfter(stage.expose.before, stage.expose.after, path("expose"), errors);
      }
    }
  }

  if (stage.user !== undefined) {
    if (typeof stage.user !== "string" || stage.user.trim().length === 0) {
      pushError(errors, path("user"), "deve ser uma string nao vazia");
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

  if (stage.shell !== undefined) {
    if (!Array.isArray(stage.shell)) {
      pushError(errors, path("shell"), "deve ser uma lista");
    } else {
      if (stage.shell.length === 0) {
        pushError(errors, path("shell"), "deve conter ao menos um item");
      }

      stage.shell.forEach((item, index) => {
        if (typeof item !== "string" || item.trim().length === 0) {
          pushError(errors, `${path("shell")}[${index}]`, "deve ser string nao vazia");
        }
      });
    }
  }

  if (stage.add !== undefined) {
    if (!Array.isArray(stage.add)) {
      pushError(errors, path("add"), "deve ser uma lista");
    } else {
      stage.add.forEach((item, index) => {
        if (!isObject(item)) {
          pushError(errors, `${path("add")}[${index}]`, "deve ser um objeto com src e dest");
          return;
        }

        if (typeof item.src !== "string" || item.src.trim().length === 0) {
          pushError(errors, `${path("add")}[${index}].src`, "deve ser string nao vazia");
        }

        if (typeof item.dest !== "string" || item.dest.trim().length === 0) {
          pushError(errors, `${path("add")}[${index}].dest`, "deve ser string nao vazia");
        }

        if (item.chown !== undefined && (typeof item.chown !== "string" || item.chown.trim().length === 0)) {
          pushError(errors, `${path("add")}[${index}].chown`, "deve ser string nao vazia");
        }
      });
    }
  }

  if (stage.label !== undefined) {
    if (!isObject(stage.label)) {
      pushError(errors, path("label"), "deve ser um objeto chave-valor");
    } else {
      for (const [key, value] of Object.entries(stage.label)) {
        if (key.trim().length === 0) {
          pushError(errors, path("label"), "nao pode conter chave vazia");
        }
        if (typeof value !== "string") {
          pushError(errors, `${path("label")}.${key}`, "deve ser string");
        }
      }
    }
  }

  if (stage.volume !== undefined) {
    if (Array.isArray(stage.volume)) {
      stage.volume.forEach((item, index) => {
        if (typeof item !== "string" || item.trim().length === 0) {
          pushError(errors, `${path("volume")}[${index}]`, "deve ser string nao vazia");
        }
      });
    } else if (isObject(stage.volume)) {
      if (!Array.isArray(stage.volume.paths)) {
        pushError(errors, `${path("volume")}.paths`, "deve ser uma lista");
      } else {
        stage.volume.paths.forEach((item, index) => {
          if (typeof item !== "string" || item.trim().length === 0) {
            pushError(errors, `${path("volume")}.paths[${index}]`, "deve ser string nao vazia");
          }
        });
      }
    } else {
      pushError(errors, path("volume"), "deve ser lista ou objeto { paths: [...] }");
    }
  }

  if (stage.healthcheck !== undefined) {
    if (!isObject(stage.healthcheck)) {
      pushError(errors, path("healthcheck"), "deve ser um objeto");
    } else {
      if (typeof stage.healthcheck.cmd !== "string" || stage.healthcheck.cmd.trim().length === 0) {
        pushError(errors, `${path("healthcheck")}.cmd`, "deve ser string nao vazia");
      }

      if (stage.healthcheck.interval !== undefined && (typeof stage.healthcheck.interval !== "string" || stage.healthcheck.interval.trim().length === 0)) {
        pushError(errors, `${path("healthcheck")}.interval`, "deve ser string nao vazia");
      }

      if (stage.healthcheck.timeout !== undefined && (typeof stage.healthcheck.timeout !== "string" || stage.healthcheck.timeout.trim().length === 0)) {
        pushError(errors, `${path("healthcheck")}.timeout`, "deve ser string nao vazia");
      }

      if (stage.healthcheck.retries !== undefined && (!Number.isInteger(stage.healthcheck.retries) || stage.healthcheck.retries < 1)) {
        pushError(errors, `${path("healthcheck")}.retries`, "deve ser numero inteiro >= 1");
      }

      if (stage.healthcheck.startPeriod !== undefined && (typeof stage.healthcheck.startPeriod !== "string" || stage.healthcheck.startPeriod.trim().length === 0)) {
        pushError(errors, `${path("healthcheck")}.startPeriod`, "deve ser string nao vazia");
      }
    }
  }

  if (stage.stopsignal !== undefined) {
    if (typeof stage.stopsignal !== "string" || stage.stopsignal.trim().length === 0) {
      pushError(errors, path("stopsignal"), "deve ser string nao vazia");
    }
  }

  if (stage.order !== undefined) {
    if (!isObject(stage.order)) {
      pushError(errors, path("order"), "deve ser um objeto");
    } else {
      for (const [key, rule] of Object.entries(stage.order)) {
        if (!ORDER_KEYS.has(key)) {
          pushError(errors, `${path("order")}.${key}`, "chave nao suportada em order");
          continue;
        }

        if (!isObject(rule)) {
          pushError(errors, `${path("order")}.${key}`, "deve ser objeto com before/after");
          continue;
        }

        validateBeforeAfter(rule.before, rule.after, `${path("order")}.${key}`, errors);
      }
    }
  }
}

function normalizeExposePorts(expose: DockerStage["expose"]): number[] | null {
  if (Array.isArray(expose)) {
    return expose;
  }

  if (isObject(expose) && Array.isArray(expose.ports)) {
    return expose.ports as number[];
  }

  return null;
}

function validateBeforeAfter(before: unknown, after: unknown, basePath: string, errors: ValidationError[]): void {
  if (before !== undefined && (typeof before !== "string" || !ORDER_ANCHORS.has(before))) {
    pushError(errors, `${basePath}.before`, "deve ser uma chave valida (from,shell,arg,workdir,copy,add,run,env,expose,label,volume,user,healthcheck,entrypoint,cmd,stopsignal)");
  }

  if (after !== undefined && (typeof after !== "string" || !ORDER_ANCHORS.has(after))) {
    pushError(errors, `${basePath}.after`, "deve ser uma chave valida (from,shell,arg,workdir,copy,add,run,env,expose,label,volume,user,healthcheck,entrypoint,cmd,stopsignal)");
  }

  if (before !== undefined && after !== undefined) {
    pushError(errors, basePath, "nao pode definir before e after ao mesmo tempo");
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