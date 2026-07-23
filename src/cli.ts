#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { parseDockerYaml } from "./parser.js";
import { assertDockerYamlV1, validateDockerYaml } from "./validator.js";
import { generateDockerfile } from "./generator.js";

function printUsage(): void {
  console.log("Uso:");
  console.log("  docker-yaml validate <arquivo.yaml>");
  console.log("  docker-yaml generate <arquivo.yaml> [--out <Dockerfile>]");
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

  if (!command || !filePath) {
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

  const validation = validateDockerYaml(parsed);
  if (!validation.valid) {
    printValidationErrors()(validation.errors);
    return 1;
  }

  if (command === "validate") {
    console.log("Spec valida");
    return 0;
  }

  let outPath: string | null = null;
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

    console.error(`Parametro desconhecido: ${arg}`);
    return 1;
  }

  const spec = assertDockerYamlV1(parsed);
  const dockerfile = generateDockerfile(spec);

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

run()
  .then((exitCode) => {
    process.exitCode = exitCode;
  })
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "Erro inesperado");
    process.exitCode = 1;
  });