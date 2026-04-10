import { EnvLoaderError } from "./errors.js";

function formatList(label: string, values?: unknown[]): string[] {
  if (!values || values.length === 0) {
    return [];
  }

  return [label, ...values.map((v) => `  - ${String(v)}`)];
}

export function formatEnvError(error: unknown): string {
  if (!(error instanceof EnvLoaderError)) {
    if (error instanceof Error) {
      return `MCP env initialization failed: ${error.message}`;
    }
    return "MCP env initialization failed: Unknown error.";
  }

  const details = error.details ?? {};
  const lines: string[] = [];

  lines.push(`MCP env initialization failed [${error.code}]`);
  lines.push(error.message);

  const missingKeys = Array.isArray(details.missingKeys) ? details.missingKeys : [];
  const searchedFiles = Array.isArray(details.searchedFiles) ? details.searchedFiles : [];
  const loadedFile = typeof details.loadedFile === "string" ? details.loadedFile : undefined;
  const explicitEnvVarName = typeof details.explicitEnvVarName === "string" ? details.explicitEnvVarName : undefined;
  const explicitEnvFileValue =
    typeof details.explicitEnvFileValue === "string" ? details.explicitEnvFileValue : undefined;
  const baseDir = typeof details.baseDir === "string" ? details.baseDir : undefined;
  const filePath = typeof details.filePath === "string" ? details.filePath : undefined;

  if (missingKeys.length > 0) {
    lines.push(...formatList("Missing environment variables:", missingKeys));
  }

  if (filePath) {
    lines.push(`Target env file: ${filePath}`);
  }

  if (loadedFile) {
    lines.push(`Loaded env file: ${loadedFile}`);
  }

  if (baseDir) {
    lines.push(`Resolution base directory: ${baseDir}`);
  }

  if (searchedFiles.length > 0) {
    lines.push(...formatList("Searched files:", searchedFiles));
  }

  if (explicitEnvVarName) {
    lines.push(`Explicit env variable name: ${explicitEnvVarName}`);
    if (explicitEnvFileValue) {
      lines.push(`Explicit env file value: ${explicitEnvFileValue}`);
    }
  }

  lines.push("Hints:");
  lines.push("  - Set required keys in .env.mcp / .env.local / .env");
  lines.push(
    `  - Or set explicit env file path via ${explicitEnvVarName ?? "MCP_ENV_FILE"} (or your configured variable name)`
  );
  lines.push("  - Check stderr logs for load and validation details");

  if (error.cause instanceof Error) {
    lines.push(`Cause: ${error.cause.message}`);
  }

  return lines.join("\n");
}
