export type CopyInstruction = {
  src: string;
  dest: string;
  chown?: string;
  afterRun?: boolean;
};

export type EnvValue = string | number | boolean;

export type OrderAnchor = "from" | "arg" | "workdir" | "copy" | "run" | "env" | "expose" | "user" | "entrypoint" | "cmd";

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
  arg?: Record<string, string | number | boolean | null>;
  workdir?: string;
  copy?: CopyInstruction[];
  run?: string[] | string;
  env?: Record<string, EnvValue>;
  expose?: number[] | ExposeConfig;
  user?: string;
  entrypoint?: string[];
  cmd?: string[];
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