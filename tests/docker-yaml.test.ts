import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { generate, parse, validate } from "../src/index.js";

const validFixturePath = new URL("./fixtures/valid.yaml", import.meta.url);
const invalidFixturePath = new URL("./fixtures/invalid.yaml", import.meta.url);
const entrypointWorkdirFixturePath = new URL("./fixtures/entrypoint-workdir.yaml", import.meta.url);
const multiStageFixturePath = new URL("./fixtures/multi-stage.yaml", import.meta.url);
const multiStageInvalidFixturePath = new URL("./fixtures/multi-stage-invalid.yaml", import.meta.url);
const argSingleStageFixturePath = new URL("./fixtures/arg-single-stage.yaml", import.meta.url);
const argMultiStageFixturePath = new URL("./fixtures/arg-multi-stage.yaml", import.meta.url);
const argInvalidFixturePath = new URL("./fixtures/arg-invalid.yaml", import.meta.url);
const complexFixturePath = new URL("./fixtures/complex.yaml", import.meta.url);
const runMultilineFixturePath = new URL("./fixtures/run-multiline.yaml", import.meta.url);
const orderPlacementFixturePath = new URL("./fixtures/order-placement.yaml", import.meta.url);
const shellFixturePath = new URL("./fixtures/shell.yaml", import.meta.url);
const addFixturePath = new URL("./fixtures/add.yaml", import.meta.url);
const labelFixturePath = new URL("./fixtures/label.yaml", import.meta.url);
const volumeFixturePath = new URL("./fixtures/volume.yaml", import.meta.url);
const healthcheckFixturePath = new URL("./fixtures/healthcheck.yaml", import.meta.url);
const stopsignalFixturePath = new URL("./fixtures/stopsignal.yaml", import.meta.url);

const expectedDockerfile = [
  "FROM node:22-alpine",
  "WORKDIR /app",
  "COPY . /app",
  "RUN npm install",
  "RUN npm run build",
  "ENV NODE_ENV=production",
  "EXPOSE 3000",
  'CMD ["npm", "start"]',
  ""
].join("\n");

describe("docker-yaml API", () => {
  it("parse + validate fixture valida", async () => {
    const content = await readFile(validFixturePath, "utf8");
    const parsed = parse(content);
    const result = validate(parsed);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("generate fixture valida para Dockerfile esperado", async () => {
    const content = await readFile(validFixturePath, "utf8");
    const dockerfile = generate(content);
    expect(dockerfile).toBe(expectedDockerfile);
  });

  it("valida fixture invalida com erros", async () => {
    const content = await readFile(invalidFixturePath, "utf8");
    const parsed = parse(content);
    const result = validate(parsed);

    expect(result.valid).toBe(false);
    expect(result.errors.some((error) => error.path === "from")).toBe(true);
    expect(result.errors.some((error) => error.path === "expose[0]")).toBe(true);
    expect(result.errors.some((error) => error.path === "unknownField")).toBe(true);
  });

  it("workdir explicito tem precedencia sobre inferencia de copy.dest", async () => {
    const content = await readFile(entrypointWorkdirFixturePath, "utf8");
    const dockerfile = generate(content);

    expect(dockerfile).toContain("WORKDIR /workspace");
    expect(dockerfile).not.toContain("WORKDIR /app");
  });

  it("gera ENTRYPOINT em exec form quando informado", async () => {
    const content = await readFile(entrypointWorkdirFixturePath, "utf8");
    const dockerfile = generate(content);

    expect(dockerfile).toContain('ENTRYPOINT ["node", "server.js"]');
  });

  it("gera Dockerfile multi-stage quando stages e informado", async () => {
    const content = await readFile(multiStageFixturePath, "utf8");
    const dockerfile = generate(content);

    expect(dockerfile).toContain("FROM node:22-alpine");
    expect(dockerfile).toContain("FROM nginx:alpine");
    expect(dockerfile).toContain("RUN npm run build");
    expect(dockerfile).toContain("EXPOSE 80");
  });

  it("invalida quando mistura from raiz com stages", async () => {
    const content = await readFile(multiStageInvalidFixturePath, "utf8");
    const parsed = parse(content);
    const result = validate(parsed);

    expect(result.valid).toBe(false);
    expect(result.errors.some((error) => error.path === "from")).toBe(true);
  });

  it("gera ARG no modo single-stage", async () => {
    const content = await readFile(argSingleStageFixturePath, "utf8");
    const dockerfile = generate(content);

    expect(dockerfile).toContain("ARG NODE_VERSION=22");
    expect(dockerfile).toContain("ARG APP_ENV=production");
    expect(dockerfile).toContain("ARG ENABLE_DEBUG=false");
    expect(dockerfile).toContain("ARG OPTIONAL_VALUE");
  });

  it("gera ARG em cada stage no modo multi-stage", async () => {
    const content = await readFile(argMultiStageFixturePath, "utf8");
    const dockerfile = generate(content);

    expect(dockerfile).toContain("ARG BUILD_MODE=production");
    expect(dockerfile).toContain("ARG OPTIONAL_TOKEN");
    expect(dockerfile).toContain("ARG NGINX_PORT=80");
  });

  it("invalida ARG com tipo nao suportado", async () => {
    const content = await readFile(argInvalidFixturePath, "utf8");
    const parsed = parse(content);
    const result = validate(parsed);

    expect(result.valid).toBe(false);
    expect(result.errors.some((error) => error.path === "arg.BAD_VALUE")).toBe(true);
  });

  it("valida e gera complex.yaml com copy --chown apos run de criacao de usuario", async () => {
    const content = await readFile(complexFixturePath, "utf8");
    const parsed = parse(content);
    const validation = validate(parsed);

    expect(validation.valid).toBe(true);

    const dockerfile = generate(content);
    const runUserIndex = dockerfile.indexOf("addgroup -S appgroup");
    const copyChownIndex = dockerfile.indexOf("COPY --chown=appuser:appgroup . ./");

    expect(runUserIndex).toBeGreaterThan(-1);
    expect(copyChownIndex).toBeGreaterThan(-1);
    expect(copyChownIndex).toBeGreaterThan(runUserIndex);
    expect(dockerfile).toContain("USER appuser:appgroup");
  });

  it("suporta run multiline em string", async () => {
    const content = await readFile(runMultilineFixturePath, "utf8");
    const parsed = parse(content);
    const validation = validate(parsed);

    expect(validation.valid).toBe(true);

    const dockerfile = generate(content);
    expect(dockerfile).toContain("RUN addgroup -S appgroup && \\");
    expect(dockerfile).toContain("    adduser -S appuser -G appgroup");
  });

  it("suporta before/after para ordenacao de chaves", async () => {
    const content = await readFile(orderPlacementFixturePath, "utf8");
    const parsed = parse(content);
    const validation = validate(parsed);

    expect(validation.valid).toBe(true);

    const dockerfile = generate(content);
    const exposeIndex = dockerfile.indexOf("EXPOSE 3000");
    const argIndex = dockerfile.indexOf("ARG APP_ENV=production");
    const runIndex = dockerfile.indexOf("RUN npm ci");
    const envIndex = dockerfile.indexOf("ENV NODE_ENV=production");

    expect(exposeIndex).toBeGreaterThan(-1);
    expect(argIndex).toBeGreaterThan(-1);
    expect(runIndex).toBeGreaterThan(-1);
    expect(envIndex).toBeGreaterThan(-1);

    expect(exposeIndex).toBeLessThan(argIndex);
    expect(envIndex).toBeGreaterThan(runIndex);
  });

  it("suporta SHELL instruction", async () => {
    const content = await readFile(shellFixturePath, "utf8");
    const parsed = parse(content);
    const validation = validate(parsed);

    expect(validation.valid).toBe(true);

    const dockerfile = generate(content);
    expect(dockerfile).toContain('SHELL ["/bin/sh", "-c"]');
    expect(dockerfile).toContain("RUN echo");
  });

  it("suporta ADD instruction com chown", async () => {
    const content = await readFile(addFixturePath, "utf8");
    const parsed = parse(content);
    const validation = validate(parsed);

    expect(validation.valid).toBe(true);

    const dockerfile = generate(content);
    expect(dockerfile).toContain("ADD https://example.com/file.tar.gz /opt/app");
    expect(dockerfile).toContain("ADD --chown=appuser:appgroup ./local/config.json /etc/app/config.json");
  });

  it("suporta LABEL instruction", async () => {
    const content = await readFile(labelFixturePath, "utf8");
    const parsed = parse(content);
    const validation = validate(parsed);

    expect(validation.valid).toBe(true);

    const dockerfile = generate(content);
    expect(dockerfile).toContain('LABEL maintainer="user@example.com"');
    expect(dockerfile).toContain('LABEL version="1.0.0"');
    expect(dockerfile).toContain('LABEL description="Node.js application"');
  });

  it("suporta VOLUME instruction", async () => {
    const content = await readFile(volumeFixturePath, "utf8");
    const parsed = parse(content);
    const validation = validate(parsed);

    expect(validation.valid).toBe(true);

    const dockerfile = generate(content);
    expect(dockerfile).toContain('VOLUME ["/var/lib/postgresql/data"]');
    expect(dockerfile).toContain('VOLUME ["/var/log/postgresql"]');
  });

  it("suporta HEALTHCHECK instruction", async () => {
    const content = await readFile(healthcheckFixturePath, "utf8");
    const parsed = parse(content);
    const validation = validate(parsed);

    expect(validation.valid).toBe(true);

    const dockerfile = generate(content);
    expect(dockerfile).toContain("HEALTHCHECK CMD curl -f http://localhost/ || exit 1");
    expect(dockerfile).toContain("--interval=30s");
    expect(dockerfile).toContain("--timeout=10s");
    expect(dockerfile).toContain("--retries=3");
    expect(dockerfile).toContain("--start-period=40s");
  });

  it("suporta STOPSIGNAL instruction", async () => {
    const content = await readFile(stopsignalFixturePath, "utf8");
    const parsed = parse(content);
    const validation = validate(parsed);

    expect(validation.valid).toBe(true);

    const dockerfile = generate(content);
    expect(dockerfile).toContain("STOPSIGNAL SIGTERM");
    expect(dockerfile).toContain("USER appuser");
    expect(dockerfile).toContain('ENTRYPOINT ["dumb-init", "--"]');
  });
});