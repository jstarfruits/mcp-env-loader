export type ResolveMode = "entry" | "cwd";

export interface BaseLoadOptions {
  resolveMode?: ResolveMode;
  entryFile?: string;
  explicitEnvVarName?: string;
  candidateFileNames?: string[];
  overrideExisting?: boolean;
  failIfNotFound?: boolean;
  verbose?: boolean;
  baseDir?: string;
}

export interface LoadEnvOptions extends BaseLoadOptions {}

export interface ValidationOptions {
  required?: string[];
  defaults?: Record<string, string>;
  allowEmpty?: string[];
}

export interface LoadEnvResult {
  ok: boolean;
  loaded: boolean;
  loadedFile?: string;
  searchedFiles: string[];
  explicitEnvVarName: string;
  explicitEnvFileValue?: string;
  baseDir: string;
  source: "explicit" | "candidates" | "none";
}

export interface LoadAndValidateOptions extends LoadEnvOptions, ValidationOptions {}

export interface LoadAndValidateResult {
  env: NodeJS.ProcessEnv;
  loadResult: LoadEnvResult;
  missingKeys: string[];
}

export interface GetEnvOptions {
  required?: boolean;
  defaultValue?: string;
  allowEmpty?: boolean;
}
