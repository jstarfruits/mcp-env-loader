import { EnvLoaderError } from "./errors.js";
import type { GetEnvOptions } from "./types.js";

export function getEnv(key: string, options: GetEnvOptions = {}): string | undefined {
  const allowEmpty = options.allowEmpty ?? false;
  const required = options.required ?? false;
  const value = process.env[key];

  if (value === undefined) {
    if (options.defaultValue !== undefined) {
      return options.defaultValue;
    }

    if (required) {
      throw new EnvLoaderError("ENV_VALIDATION_FAILED", `Missing required environment variable: ${key}`, {
        missingKey: key
      });
    }

    return undefined;
  }

  if (value === "" && !allowEmpty) {
    if (options.defaultValue !== undefined) {
      return options.defaultValue;
    }

    if (required) {
      throw new EnvLoaderError("ENV_VALIDATION_FAILED", `Environment variable is empty: ${key}`, {
        missingKey: key,
        empty: true
      });
    }

    return undefined;
  }

  return value;
}
