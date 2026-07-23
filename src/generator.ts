import type { DockerYamlV1 } from "./types.js";

function jsonArray(values: string[]): string {
  const escaped = values.map((value) => JSON.stringify(value));
  return `[${escaped.join(", ")}]`;
}

function inferWorkdir(spec: DockerYamlV1): string | null {
  if (spec.workdir && spec.workdir.trim().length > 0) {
    return spec.workdir;
  }

  const firstAbsoluteCopyDest = spec.copy?.find((item) => item.dest.startsWith("/"))?.dest;
  return firstAbsoluteCopyDest ?? null;
}

export function generateDockerfile(spec: DockerYamlV1): string {
  const lines: string[] = [];

  lines.push(`FROM ${spec.from}`);

  const workdir = inferWorkdir(spec);
  if (workdir) {
    lines.push(`WORKDIR ${workdir}`);
  }

  for (const item of spec.copy ?? []) {
    lines.push(`COPY ${item.src} ${item.dest}`);
  }

  for (const command of spec.run ?? []) {
    lines.push(`RUN ${command}`);
  }

  for (const [key, value] of Object.entries(spec.env ?? {})) {
    lines.push(`ENV ${key}=${value}`);
  }

  for (const port of spec.expose ?? []) {
    lines.push(`EXPOSE ${port}`);
  }

  if (spec.entrypoint && spec.entrypoint.length > 0) {
    lines.push(`ENTRYPOINT ${jsonArray(spec.entrypoint)}`);
  }

  if (spec.cmd && spec.cmd.length > 0) {
    lines.push(`CMD ${jsonArray(spec.cmd)}`);
  }

  return `${lines.join("\n")}\n`;
}