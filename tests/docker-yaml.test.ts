import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { generate, parse, validate } from "../src/index.js";

const validFixturePath = new URL("./fixtures/valid.yaml", import.meta.url);
const invalidFixturePath = new URL("./fixtures/invalid.yaml", import.meta.url);
const entrypointWorkdirFixturePath = new URL("./fixtures/entrypoint-workdir.yaml", import.meta.url);

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
});