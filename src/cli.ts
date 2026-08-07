#!/usr/bin/env node
import { access, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { extractCommentMap, parseDockerYaml } from "./parser.js";
import { mergeVariables, parseEnvLikeContent, resolveTemplates, type TemplateVariables } from "./template.js";
import { assertDockerYamlV1, validateDockerYaml } from "./validator.js";
import { generateDockerfile } from "./generator.js";
import type { DockerYamlV1, DockerYamlV1Services } from "./types.js";

function printUsage(): void {
  console.log("Uso:");
  console.log("  docker-yaml --help");
  console.log("  docker-yaml --version");
  console.log("  docker-yaml validate <arquivo.yaml> [--name <service>] [--out <Dockerfile>] [--vars-file <arquivo>] [--var CHAVE=valor]");
  console.log("  docker-yaml generate <arquivo.yaml> [--name <service>] [--out <Dockerfile>] [--vars-file <arquivo>] [--var CHAVE=valor]");
}

async function printVersion(): Promise<void> {
  const packageJsonPath = new URL("../package.json", import.meta.url);
  const raw = await readFile(packageJsonPath, "utf8");
  const pkg = JSON.parse(raw) as { version?: string };
  process.stdout.write(`${pkg.version ?? "0.0.0"}\n`);
}

function printValidationErrors(): (errors: Array<{ path: string; message: string }>) => void {
  return (errors) => {
    console.error("Spec invalida:");
    for (const error of errors) {
      console.error(`- ${error.path}: ${error.message}`);
    }
  };
}

async function loadYamlFile(path: string): Promise<string> {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    const message = error instanceof Error ? error.message : "falha ao ler arquivo";
    throw new Error(`Nao foi possivel ler '${path}': ${message}`);
  }
}

async function run(): Promise<number> {
  const [, , command, filePath, ...restArgs] = process.argv;

  if (!command || command === "--help" || command === "-h") {
    printUsage();
    return 0;
  }

  if (command === "--version" || command === "-v") {
    try {
      await printVersion();
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : "falha ao carregar versao";
      console.error(`Nao foi possivel obter versao: ${message}`);
      return 1;
    }
  }

  if (!filePath) {
    printUsage();
    return 1;
  }

  if (command !== "validate" && command !== "generate") {
    console.error(`Comando desconhecido: ${command}`);
    printUsage();
    return 1;
  }

  let content: string;
  try {
    content = await loadYamlFile(filePath);
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Erro desconhecido");
    return 1;
  }

  let parsed: unknown;
  try {
    parsed = parseDockerYaml(content);
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Erro ao fazer parse do YAML");
    return 1;
  }

  let outPath: string | null = null;
  let serviceName: string | null = null;
  const varsFiles: string[] = [];
  const cliVars: TemplateVariables = {};

  for (let index = 0; index < restArgs.length; index += 1) {
    const arg = restArgs[index];

    if (arg === "--out") {
      const next = restArgs[index + 1];
      if (!next) {
        console.error("Parametro ausente para --out");
        return 1;
      }
      outPath = next;
      index += 1;
      continue;
    }

    if (arg === "--name") {
      const next = restArgs[index + 1];
      if (!next) {
        console.error("Parametro ausente para --name");
        return 1;
      }
      serviceName = next;
      index += 1;
      continue;
    }

    if (arg === "--vars-file") {
      const next = restArgs[index + 1];
      if (!next) {
        console.error("Parametro ausente para --vars-file");
        return 1;
      }
      varsFiles.push(next);
      index += 1;
      continue;
    }

    if (arg === "--var") {
      const next = restArgs[index + 1];
      if (!next) {
        console.error("Parametro ausente para --var");
        return 1;
      }

      const separatorIndex = next.indexOf("=");
      if (separatorIndex < 1) {
        console.error(`Formato invalido para --var: ${next}. Use CHAVE=valor`);
        return 1;
      }

      const key = next.slice(0, separatorIndex).trim();
      const value = next.slice(separatorIndex + 1);
      cliVars[key] = value;
      index += 1;
      continue;
    }

    console.error(`Parametro desconhecido: ${arg}`);
    return 1;
  }

  const fileBasedVars = await loadTemplateVariables(filePath, varsFiles);
  const variables = mergeVariables([process.env as TemplateVariables, fileBasedVars, cliVars]);
  const templated = resolveTemplates(parsed, {
    variables,
    strict: false
  });

  if (templated.errors.length > 0) {
    console.error("Templates invalidos:");
    for (const error of templated.errors) {
      console.error(`- ${error.path}: ${error.message}`);
    }
    return 1;
  }

  const validation = validateDockerYaml(templated.value);
  if (!validation.valid) {
    printValidationErrors()(validation.errors);
    return 1;
  }

  const spec = assertDockerYamlV1(templated.value);
  const hasServices = isServicesSpec(spec);

  if (serviceName && !hasServices) {
    console.error("--name so pode ser usado quando o YAML possui services");
    return 1;
  }

  if (serviceName && hasServices && !spec.services.some((service) => service.name === serviceName)) {
    console.error(`Servico '${serviceName}' nao encontrado`);
    return 1;
  }

  if (outPath && hasServices && !serviceName && spec.services.length > 1) {
    console.error("Quando usar --out com services, informe --name para selecionar um unico service");
    return 1;
  }

  const commentMap = extractCommentMap(content);

  if (command === "validate") {
    if (outPath) {
      const dockerfile = generateDockerfile(spec, { name: serviceName ?? undefined, commentMap });
      try {
        await writeFile(outPath, dockerfile, "utf8");
      } catch (error) {
        const message = error instanceof Error ? error.message : "falha ao escrever arquivo";
        console.error(`Nao foi possivel escrever '${outPath}': ${message}`);
        return 1;
      }
    }

    console.log("Spec valida");
    return 0;
  }

  const dockerfile = generateDockerfile(spec, { name: serviceName ?? undefined, commentMap });

  if (outPath) {
    try {
      await writeFile(outPath, dockerfile, "utf8");
    } catch (error) {
      const message = error instanceof Error ? error.message : "falha ao escrever arquivo";
      console.error(`Nao foi possivel escrever '${outPath}': ${message}`);
      return 1;
    }
    return 0;
  }

  process.stdout.write(dockerfile);
  return 0;
}

async function loadTemplateVariables(specPath: string, explicitVarsFiles: string[]): Promise<TemplateVariables> {
  const specDir = dirname(resolve(specPath));
  const autoFiles = [resolve(specDir, ".env"), resolve(specDir, ".vars")];
  const explicitFiles = explicitVarsFiles.map((file) => resolve(file));
  const allFiles = [...autoFiles, ...explicitFiles];

  const merged: TemplateVariables = {};
  for (const filePath of allFiles) {
    if (!(await exists(filePath))) {
      continue;
    }

    const content = await readFile(filePath, "utf8");
    Object.assign(merged, parseEnvLikeContent(content));
  }

  return merged;
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function isServicesSpec(spec: DockerYamlV1): spec is DockerYamlV1Services {
  return "services" in spec;
}

run()
  .then((exitCode) => {
    process.exitCode = exitCode;
  })
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "Erro inesperado");
    process.exitCode = 1;
  });