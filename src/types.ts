export type CopyInstruction = {
  src: string;
  dest: string;
  chown?: string;
  afterRun?: boolean;
};

export type EnvValue = string | number | boolean;

export type AddInstruction = {
  src: string;
  dest: string;
  chown?: string;
};

export type HealthCheckConfig = {
  cmd: string;
  interval?: string;
  timeout?: string;
  retries?: number;
  startPeriod?: string;
};

export type OrderAnchor = "from" | "shell" | "arg" | "workdir" | "copy" | "add" | "run" | "env" | "expose" | "label" | "volume" | "user" | "healthcheck" | "entrypoint" | "cmd" | "stopsignal";

export type OrderDirective = {
  before?: OrderAnchor;
  after?: OrderAnchor;
};

export type ExposeConfig = {
  ports: number[];
  before?: OrderAnchor;
  after?: OrderAnchor;
};

export type DockerStage = {
  from: string;
  shell?: string[];
  arg?: Record<string, string | number | boolean | null>;
  workdir?: string;
  copy?: CopyInstruction[];
  add?: AddInstruction[];
  run?: string[] | string;
  env?: Record<string, EnvValue>;
  expose?: number[] | ExposeConfig;
  label?: Record<string, string>;
  volume?: string[] | { paths: string[] };
  user?: string;
  healthcheck?: HealthCheckConfig;
  entrypoint?: string[];
  cmd?: string[];
  stopsignal?: string;
  order?: Partial<Record<Exclude<OrderAnchor, "from">, OrderDirective>>;
};

export type DockerYamlV1 = DockerStage & {
  version: 1;
  stages?: DockerStage[];
};

export type ValidationError = {
  path: string;
  message: string;
};

export type ValidationResult = {
  valid: boolean;
  errors: ValidationError[];
};