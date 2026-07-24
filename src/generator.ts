import type { DockerNamedService, DockerStage, DockerYamlV1, DockerYamlV1Services, OrderAnchor, OrderDirective } from "./types.js";

export type GenerateDockerfileOptions = {
  name?: string;
};

function jsonArray(values: string[]): string {
  const escaped = values.map((value) => JSON.stringify(value));
  return `[${escaped.join(", ")}]`;
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
  const orderedKeys = resolveOrder(sections, order, {
    copyHasAfterRunItems: copyAfterRun.length > 0
  });
  const lines: string[] = [];

  for (const key of orderedKeys) {
    lines.push(...sections[key]);
  }

  return lines;
}

export function generateDockerfile(spec: DockerYamlV1, options: GenerateDockerfileOptions = {}): string {
  if (isServicesSpec(spec)) {
    return generateFromServices(spec, options);
  }

  if (spec.stages && spec.stages.length > 0) {
    const stageBlocks = spec.stages.map((stage) => stageToLines(stage).join("\n"));
    return `${stageBlocks.join("\n\n")}\n`;
  }

  return `${stageToLines(spec).join("\n")}\n`;
}

function generateFromServices(spec: DockerYamlV1Services, options: GenerateDockerfileOptions): string {
  if (options.name) {
    const selected = spec.services.find((service) => service.name === options.name);
    if (!selected) {
      throw new Error(`Servico '${options.name}' nao encontrado`);
    }

    return `${stageToLines(selected).join("\n")}\n`;
  }

  if (spec.services.length === 1) {
    return `${stageToLines(spec.services[0]).join("\n")}\n`;
  }

  const blocks = spec.services.map((service) => `# service: ${service.name}\n${stageToLines(service).join("\n")}`);
  return `${blocks.join("\n\n")}\n`;
}

function isServicesSpec(spec: DockerYamlV1): spec is DockerYamlV1Services {
  return "services" in spec;
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
  order: Partial<Record<Exclude<OrderAnchor, "from">, OrderDirective>>,
  options: { copyHasAfterRunItems: boolean }
): OrderAnchor[] {
  const defaultOrder: OrderAnchor[] = ["from", "shell", "arg", "env", "label", "run", "workdir", "copy", "add", "expose", "volume", "user", "healthcheck", "entrypoint", "cmd", "stopsignal"];
  const active = defaultOrder.filter((key) => sections[key].length > 0);
  const entries = Object.entries(order) as Array<[Exclude<OrderAnchor, "from">, OrderDirective]>;

  // Run multiple passes so chained rules converge even when anchors move later.
  for (let pass = 0; pass < entries.length * 2; pass += 1) {
    let moved = false;

    for (const [key, rule] of entries) {
      if (!rule || (!rule.before && !rule.after)) {
        continue;
      }

      const currentIndex = active.indexOf(key);
      if (currentIndex === -1) {
        continue;
      }

      const rawAnchor = rule.before ?? rule.after;
      if (!rawAnchor) {
        continue;
      }

      const resolvedAnchor = resolveAnchor(active, rawAnchor, options.copyHasAfterRunItems);
      if (!resolvedAnchor || resolvedAnchor === key) {
        continue;
      }

      const anchorIndex = active.indexOf(resolvedAnchor);
      if (anchorIndex === -1) {
        continue;
      }

      if (rule.before) {
        if (currentIndex < anchorIndex) {
          continue;
        }

        active.splice(currentIndex, 1);
        const target = active.indexOf(resolvedAnchor);
        active.splice(target, 0, key);
        moved = true;
      } else {
        if (currentIndex > anchorIndex) {
          continue;
        }

        active.splice(currentIndex, 1);
        const target = active.indexOf(resolvedAnchor);
        active.splice(target + 1, 0, key);
        moved = true;
      }
    }

    if (!moved) {
      break;
    }
  }

  return active;
}

function resolveAnchor(active: OrderAnchor[], anchor: OrderAnchor, copyHasAfterRunItems: boolean): OrderAnchor | null {
  if (active.includes(anchor)) {
    return anchor;
  }

  // COPY with afterRun=true is emitted inside RUN; treat it as an alias for ordering.
  if (anchor === "copy" && copyHasAfterRunItems && active.includes("run")) {
    return "run";
  }

  return null;
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