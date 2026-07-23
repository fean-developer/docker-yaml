import type { DockerStage, DockerYamlV1, OrderAnchor, OrderDirective } from "./types.js";

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

function inferStageWorkdir(stage: DockerStage): string | null {
  if (stage.workdir && stage.workdir.trim().length > 0) {
    return stage.workdir;
  }

  const firstAbsoluteCopyDest = stage.copy?.find((item) => item.dest.startsWith("/"))?.dest;
  return firstAbsoluteCopyDest ?? null;
}

function stageToLines(stage: DockerStage): string[] {
  const workdir = inferStageWorkdir(stage);
  const copyBeforeRun = (stage.copy ?? []).filter((item) => !item.afterRun);
  const copyAfterRun = (stage.copy ?? []).filter((item) => item.afterRun);
  const expose = normalizeExpose(stage.expose);
  const runLines = normalizeRun(stage.run);
  const volume = normalizeVolume(stage.volume);
  const healthcheck = stage.healthcheck ? `HEALTHCHECK ${formatHealthcheck(stage.healthcheck)}` : undefined;

  const sections: Record<OrderAnchor, string[]> = {
    from: [`FROM ${stage.from}`],
    shell: stage.shell && stage.shell.length > 0 ? [`SHELL ${jsonArray(stage.shell)}`] : [],
    arg: Object.entries(stage.arg ?? {}).map(([key, value]) => (value === null ? `ARG ${key}` : `ARG ${key}=${String(value)}`)),
    workdir: workdir ? [`WORKDIR ${workdir}`] : [],
    copy: copyBeforeRun.map((item) => `COPY ${item.chown ? `--chown=${item.chown} ` : ""}${item.src} ${item.dest}`),
    add: (stage.add ?? []).map((item) => `ADD ${item.chown ? `--chown=${item.chown} ` : ""}${item.src} ${item.dest}`),
    run: [
      ...runLines,
      ...copyAfterRun.map((item) => `COPY ${item.chown ? `--chown=${item.chown} ` : ""}${item.src} ${item.dest}`)
    ],
    env: Object.entries(stage.env ?? {}).map(([key, value]) => `ENV ${key}=${String(value)}`),
    expose: expose.ports.map((port) => `EXPOSE ${port}`),
    label: Object.entries(stage.label ?? {}).map(([key, value]) => `LABEL ${key}="${value}"`),
    volume: volume.map((path) => `VOLUME ${jsonArray([path])}`),
    user: stage.user && stage.user.trim().length > 0 ? [`USER ${stage.user}`] : [],
    healthcheck: healthcheck ? [healthcheck] : [],
    entrypoint: stage.entrypoint && stage.entrypoint.length > 0 ? [`ENTRYPOINT ${jsonArray(stage.entrypoint)}`] : [],
    cmd: stage.cmd && stage.cmd.length > 0 ? [`CMD ${jsonArray(stage.cmd)}`] : [],
    stopsignal: stage.stopsignal ? [`STOPSIGNAL ${stage.stopsignal}`] : []
  };

  const order = mergeOrderDirectives(stage.order, expose.before, expose.after);
  const orderedKeys = resolveOrder(sections, order);
  const lines: string[] = [];

  for (const key of orderedKeys) {
    lines.push(...sections[key]);
  }

  return lines;
}

export function generateDockerfile(spec: DockerYamlV1): string {
  if (spec.stages && spec.stages.length > 0) {
    const stageBlocks = spec.stages.map((stage) => stageToLines(stage).join("\n"));
    return `${stageBlocks.join("\n\n")}\n`;
  }

  const workdir = inferWorkdir(spec);
  const copyBeforeRun = (spec.copy ?? []).filter((item) => !item.afterRun);
  const copyAfterRun = (spec.copy ?? []).filter((item) => item.afterRun);
  const expose = normalizeExpose(spec.expose);
  const runLines = normalizeRun(spec.run);
  const volume = normalizeVolume(spec.volume);
  const healthcheck = spec.healthcheck ? `HEALTHCHECK ${formatHealthcheck(spec.healthcheck)}` : undefined;

  const sections: Record<OrderAnchor, string[]> = {
    from: [`FROM ${spec.from}`],
    shell: spec.shell && spec.shell.length > 0 ? [`SHELL ${jsonArray(spec.shell)}`] : [],
    arg: Object.entries(spec.arg ?? {}).map(([key, value]) => (value === null ? `ARG ${key}` : `ARG ${key}=${String(value)}`)),
    workdir: workdir ? [`WORKDIR ${workdir}`] : [],
    copy: copyBeforeRun.map((item) => `COPY ${item.chown ? `--chown=${item.chown} ` : ""}${item.src} ${item.dest}`),
    add: (spec.add ?? []).map((item) => `ADD ${item.chown ? `--chown=${item.chown} ` : ""}${item.src} ${item.dest}`),
    run: [
      ...runLines,
      ...copyAfterRun.map((item) => `COPY ${item.chown ? `--chown=${item.chown} ` : ""}${item.src} ${item.dest}`)
    ],
    env: Object.entries(spec.env ?? {}).map(([key, value]) => `ENV ${key}=${String(value)}`),
    expose: expose.ports.map((port) => `EXPOSE ${port}`),
    label: Object.entries(spec.label ?? {}).map(([key, value]) => `LABEL ${key}="${value}"`),
    volume: volume.map((path) => `VOLUME ${jsonArray([path])}`),
    user: spec.user && spec.user.trim().length > 0 ? [`USER ${spec.user}`] : [],
    healthcheck: healthcheck ? [healthcheck] : [],
    entrypoint: spec.entrypoint && spec.entrypoint.length > 0 ? [`ENTRYPOINT ${jsonArray(spec.entrypoint)}`] : [],
    cmd: spec.cmd && spec.cmd.length > 0 ? [`CMD ${jsonArray(spec.cmd)}`] : [],
    stopsignal: spec.stopsignal ? [`STOPSIGNAL ${spec.stopsignal}`] : []
  };

  const order = mergeOrderDirectives(spec.order, expose.before, expose.after);
  const orderedKeys = resolveOrder(sections, order);
  const lines: string[] = [];

  for (const key of orderedKeys) {
    lines.push(...sections[key]);
  }

  return `${lines.join("\n")}\n`;
}

function normalizeExpose(expose: DockerStage["expose"]): { ports: number[]; before?: OrderAnchor; after?: OrderAnchor } {
  if (!expose) {
    return { ports: [] };
  }

  if (Array.isArray(expose)) {
    return { ports: expose };
  }

  return {
    ports: expose.ports,
    before: expose.before,
    after: expose.after
  };
}

function mergeOrderDirectives(
  order: DockerStage["order"] | undefined,
  exposeBefore: OrderAnchor | undefined,
  exposeAfter: OrderAnchor | undefined
): Partial<Record<Exclude<OrderAnchor, "from">, OrderDirective>> {
  const merged: Partial<Record<Exclude<OrderAnchor, "from">, OrderDirective>> = { ...(order ?? {}) };

  if (!merged.expose && (exposeBefore || exposeAfter)) {
    merged.expose = {
      before: exposeBefore,
      after: exposeAfter
    };
  }

  return merged;
}

function resolveOrder(
  sections: Record<OrderAnchor, string[]>,
  order: Partial<Record<Exclude<OrderAnchor, "from">, OrderDirective>>
): OrderAnchor[] {
  const defaultOrder: OrderAnchor[] = ["from", "shell", "arg", "workdir", "copy", "add", "run", "env", "expose", "label", "volume", "user", "healthcheck", "entrypoint", "cmd", "stopsignal"];
  const active = defaultOrder.filter((key) => sections[key].length > 0);

  for (const [key, rule] of Object.entries(order) as Array<[Exclude<OrderAnchor, "from">, OrderDirective]>) {
    if (!rule || (!rule.before && !rule.after)) {
      continue;
    }

    const currentIndex = active.indexOf(key);
    if (currentIndex === -1) {
      continue;
    }

    active.splice(currentIndex, 1);

    const anchor = rule.before ?? rule.after;
    if (!anchor) {
      active.push(key);
      continue;
    }

    const anchorIndex = active.indexOf(anchor);
    if (anchorIndex === -1) {
      active.push(key);
      continue;
    }

    if (rule.before) {
      active.splice(anchorIndex, 0, key);
    } else {
      active.splice(anchorIndex + 1, 0, key);
    }
  }

  return active;
}

function normalizeVolume(volume: DockerStage["volume"]): string[] {
  if (!volume) {
    return [];
  }

  if (Array.isArray(volume)) {
    return volume;
  }

  return volume.paths;
}

function formatHealthcheck(config: NonNullable<DockerStage["healthcheck"]>): string {
  const parts = [`CMD ${config.cmd}`];

  if (config.interval) {
    parts.push(`--interval=${config.interval}`);
  }

  if (config.timeout) {
    parts.push(`--timeout=${config.timeout}`);
  }

  if (config.retries) {
    parts.push(`--retries=${config.retries}`);
  }

  if (config.startPeriod) {
    parts.push(`--start-period=${config.startPeriod}`);
  }

  return parts.join(" ");
}

function normalizeRun(run: DockerStage["run"]): string[] {
  if (!run) {
    return [];
  }

  if (Array.isArray(run)) {
    return run.map((command) => `RUN ${command}`);
  }

  const chunks = run
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (chunks.length === 0) {
    return [];
  }

  if (chunks.length === 1) {
    return [`RUN ${chunks[0]}`];
  }

  const multiline = [`RUN ${chunks[0]} \\`];
  for (let index = 1; index < chunks.length; index += 1) {
    const isLast = index === chunks.length - 1;
    multiline.push(`${isLast ? "    " : "    "}${chunks[index]}${isLast ? "" : " \\"}`);
  }

  return multiline;
}