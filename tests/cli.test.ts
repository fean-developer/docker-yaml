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
});