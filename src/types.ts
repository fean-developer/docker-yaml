export type CopyInstruction = {
  src: string;
  dest: string;
};

export type DockerYamlV1 = {
  version: 1;
  from: string;
  workdir?: string;
  copy?: CopyInstruction[];
  run?: string[];
  env?: Record<string, string>;
  expose?: number[];
  entrypoint?: string[];
  cmd?: string[];
};

export type ValidationError = {
  path: string;
  message: string;
};

export type ValidationResult = {
  valid: boolean;
  errors: ValidationError[];
};