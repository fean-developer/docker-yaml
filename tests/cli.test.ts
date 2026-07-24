import { execFile } from "node:child_process";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);

const cliPath = new URL("../src/cli.ts", import.meta.url);
const validFixturePath = new URL("./fixtures/valid.yaml", import.meta.url);
const invalidFixturePath = new URL("./fixtures/invalid.yaml", import.meta.url);
const entrypointWorkdirFixturePath = new URL("./fixtures/entrypoint-workdir.yaml", import.meta.url);
const multiStageFixturePath = new URL("./fixtures/multi-stage.yaml", import.meta.url);
const argSingleStageFixturePath = new URL("./fixtures/arg-single-stage.yaml", import.meta.url);
const argInvalidFixturePath = new URL("./fixtures/arg-invalid.yaml", import.meta.url);
const complexFixturePath = new URL("./fixtures/complex.yaml", import.meta.url);
const runMultilineFixturePath = new URL("./fixtures/run-multiline.yaml", import.meta.url);
const orderPlacementFixturePath = new URL("./fixtures/order-placement.yaml", import.meta.url);
const servicesFixturePath = new URL("./fixtures/services.yaml", import.meta.url);
const orderUserAfterMultipleFixturePath = new URL("./fixtures/order-user-after-multiple.yaml", import.meta.url);
const servicesMultiStageFixturePath = new URL("./fixtures/services-multi-stage.yaml", import.meta.url);

describe("docker-yaml CLI", () => {
  it("validate retorna sucesso para fixture valida", async () => {
    const { stdout } = await execFileAsync("node", ["--import", "tsx", cliPath.pathname, "validate", validFixturePath.pathname]);
    expect(stdout).toContain("Spec valida");
  });

  it("validate falha para fixture invalida", async () => {
    await expect(
      execFileAsync("node", ["--import", "tsx", cliPath.pathname, "validate", invalidFixturePath.pathname])
    ).rejects.toMatchObject({
      stdout: "",
      code: 1
    });
  });

  it("generate imprime Dockerfile esperado", async () => {
    const { stdout } = await execFileAsync("node", ["--import", "tsx", cliPath.pathname, "generate", validFixturePath.pathname]);

    expect(stdout).toContain("FROM node:22-alpine");
    expect(stdout).toContain("WORKDIR /app");
    expect(stdout).toContain("CMD [\"npm\", \"start\"]");
  });

  it("generate com --out grava Dockerfile no caminho informado", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "docker-yaml-"));
    const outputPath = join(tempDir, "Dockerfile");

    await execFileAsync("node", [
      "--import",
      "tsx",
      cliPath.pathname,
      "generate",
      entrypointWorkdirFixturePath.pathname,
      "--out",
      outputPath
    ]);

    const content = await readFile(outputPath, "utf8");
    expect(content).toContain("WORKDIR /workspace");
    expect(content).toContain('ENTRYPOINT ["node", "server.js"]');
    expect(content).toContain('CMD ["npm", "start"]');
  });

  it("validate retorna sucesso para fixture multi-stage valida", async () => {
    const { stdout } = await execFileAsync("node", ["--import", "tsx", cliPath.pathname, "validate", multiStageFixturePath.pathname]);
    expect(stdout).toContain("Spec valida");
  });

  it("generate imprime dois blocos FROM para multi-stage", async () => {
    const { stdout } = await execFileAsync("node", ["--import", "tsx", cliPath.pathname, "generate", multiStageFixturePath.pathname]);

    expect(stdout).toContain("FROM node:22-alpine");
    expect(stdout).toContain("FROM nginx:alpine");
  });

  it("generate imprime ARG no modo single-stage", async () => {
    const { stdout } = await execFileAsync("node", ["--import", "tsx", cliPath.pathname, "generate", argSingleStageFixturePath.pathname]);

    expect(stdout).toContain("ARG NODE_VERSION=22");
    expect(stdout).toContain("ARG OPTIONAL_VALUE");
  });

  it("validate falha para ARG invalido", async () => {
    await expect(
      execFileAsync("node", ["--import", "tsx", cliPath.pathname, "validate", argInvalidFixturePath.pathname])
    ).rejects.toMatchObject({
      stdout: "",
      code: 1
    });
  });

  it("validate retorna sucesso para complex fixture", async () => {
    const { stdout } = await execFileAsync("node", ["--import", "tsx", cliPath.pathname, "validate", complexFixturePath.pathname]);
    expect(stdout).toContain("Spec valida");
  });

  it("generate preserva formato multiline no RUN", async () => {
    const { stdout } = await execFileAsync("node", ["--import", "tsx", cliPath.pathname, "generate", runMultilineFixturePath.pathname]);
    expect(stdout).toContain("RUN addgroup -S appgroup && \\");
    expect(stdout).toContain("    adduser -S appuser -G appgroup");
  });

  it("generate respeita order e expose.before/after", async () => {
    const { stdout } = await execFileAsync("node", ["--import", "tsx", cliPath.pathname, "generate", orderPlacementFixturePath.pathname]);

    const exposeIndex = stdout.indexOf("EXPOSE 3000");
    const argIndex = stdout.indexOf("ARG APP_ENV=production");
    const runIndex = stdout.indexOf("RUN npm ci");
    const envIndex = stdout.indexOf("ENV NODE_ENV=production");

    expect(exposeIndex).toBeGreaterThan(-1);
    expect(argIndex).toBeGreaterThan(-1);
    expect(runIndex).toBeGreaterThan(-1);
    expect(envIndex).toBeGreaterThan(-1);

    expect(exposeIndex).toBeLessThan(argIndex);
    expect(envIndex).toBeGreaterThan(runIndex);
  });

  it("validate com --name valida service selecionado", async () => {
    const { stdout } = await execFileAsync("node", [
      "--import",
      "tsx",
      cliPath.pathname,
      "validate",
      servicesFixturePath.pathname,
      "--name",
      "dotnet8"
    ]);

    expect(stdout).toContain("Spec valida");
  });

  it("generate com --name gera apenas service selecionado", async () => {
    const { stdout } = await execFileAsync("node", [
      "--import",
      "tsx",
      cliPath.pathname,
      "generate",
      servicesFixturePath.pathname,
      "--name",
      "node20"
    ]);

    expect(stdout).toContain("FROM node:20-alpine");
    expect(stdout).not.toContain("FROM mcr.microsoft.com/dotnet/aspnet:8.0-alpine");
  });

  it("validate com --name e --out grava Dockerfile do service selecionado", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "docker-yaml-"));
    const outputPath = join(tempDir, "Dockerfile.node20");

    const { stdout } = await execFileAsync("node", [
      "--import",
      "tsx",
      cliPath.pathname,
      "validate",
      servicesFixturePath.pathname,
      "--name",
      "node20",
      "--out",
      outputPath
    ]);

    const content = await readFile(outputPath, "utf8");
    expect(stdout).toContain("Spec valida");
    expect(content).toContain("FROM node:20-alpine");
    expect(content).not.toContain("FROM mcr.microsoft.com/dotnet/aspnet:8.0-alpine");
  });

  it("generate aceita order.after em formato lista", async () => {
    const { stdout } = await execFileAsync("node", ["--import", "tsx", cliPath.pathname, "generate", orderUserAfterMultipleFixturePath.pathname]);

    const copyIndex = stdout.indexOf("COPY . /app");
    const workdirIndex = stdout.indexOf("WORKDIR /app");
    const userIndex = stdout.indexOf("USER node");
    const entrypointIndex = stdout.indexOf('ENTRYPOINT ["node", "server.js"]');

    expect(copyIndex).toBeGreaterThan(-1);
    expect(workdirIndex).toBeGreaterThan(-1);
    expect(userIndex).toBeGreaterThan(copyIndex);
    expect(userIndex).toBeGreaterThan(workdirIndex);
    expect(userIndex).toBeLessThan(entrypointIndex);
  });

  it("generate com --name suporta service multi-stage", async () => {
    const { stdout } = await execFileAsync("node", [
      "--import",
      "tsx",
      cliPath.pathname,
      "generate",
      servicesMultiStageFixturePath.pathname,
      "--name",
      "dotnet-api"
    ]);

    const fromCount = (stdout.match(/^FROM /gm) ?? []).length;
    expect(fromCount).toBe(2);
    expect(stdout).toContain("FROM mcr.microsoft.com/dotnet/sdk:8.0");
    expect(stdout).toContain("FROM mcr.microsoft.com/dotnet/aspnet:8.0");
  });
});