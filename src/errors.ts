export type EnvLoaderErrorCode =
  | "EXPLICIT_ENV_FILE_NOT_FOUND"
  | "ENV_FILE_NOT_FOUND"
  | "ENV_FILE_READ_FAILED"
  | "ENV_VALIDATION_FAILED";

export class EnvLoaderError extends Error {
  public readonly code: EnvLoaderErrorCode;
  public readonly details?: Record<string, unknown>;

  constructor(code: EnvLoaderErrorCode, message: string, details?: Record<string, unknown>, cause?: unknown) {
    super(message, cause ? { cause } : undefined);
    this.name = "EnvLoaderError";
    this.code = code;
    this.details = details;
  }
}
