import { EnvLoaderError } from "./errors.js";
import { loadEnv } from "./loader.js";
import type { LoadAndValidateOptions, LoadAndValidateResult } from "./types.js";

function applyDefaults(defaults: Record<string, string>): void {
  for (const [key, value] of Object.entries(defaults)) {
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function collectMissingKeys(required: string[], allowEmptySet: Set<string>): string[] {
  return required.filter((key) => {
    const value = process.env[key];
    if (value === undefined) {
      return true;
    }
    if (value === "" && !allowEmptySet.has(key)) {
      return true;
    }
    return false;
  });
}

export function loadAndValidateEnv(options: LoadAndValidateOptions = {}): LoadAndValidateResult {
  const loadResult = loadEnv(options);
  const defaults = options.defaults ?? {};
  const required = options.required ?? [];
  const allowEmptySet = new Set(options.allowEmpty ?? []);

  applyDefaults(defaults);
  const missingKeys = collectMissingKeys(required, allowEmptySet);

  if (missingKeys.length > 0) {
    throw new EnvLoaderError(
      "ENV_VALIDATION_FAILED",
      `Required environment variables are missing: ${missingKeys.join(", ")}`,
      {
        missingKeys,
        required,
        allowEmpty: [...allowEmptySet],
        loadedFile: loadResult.loadedFile,
        searchedFiles: loadResult.searchedFiles,
        explicitEnvVarName: loadResult.explicitEnvVarName,
        explicitEnvFileValue: loadResult.explicitEnvFileValue,
        baseDir: loadResult.baseDir
      }
    );
  }

  return {
    env: process.env,
    loadResult,
    missingKeys
  };
}
