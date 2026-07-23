export type CopyInstruction = {
  src: string;
  dest: string;
};

export type DockerStage = {
  from: string;
  arg?: Record<string, string | number | boolean | null>;
  workdir?: string;
  copy?: CopyInstruction[];
  run?: string[];
  env?: Record<string, string>;
  expose?: number[];
  entrypoint?: string[];
  cmd?: string[];
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