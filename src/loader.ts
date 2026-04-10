import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { EnvLoaderError } from "./errors.js";
import { logStderrInfo } from "./logger.js";
import type { LoadEnvOptions, LoadEnvResult } from "./types.js";

const DEFAULT_ENV_VAR_NAME = "MCP_ENV_FILE";
const DEFAULT_CANDIDATE_FILES = [".env.mcp", ".env.local", ".env"];

function resolveBaseDir(options: LoadEnvOptions): string {
  if (options.baseDir) {
    return path.resolve(options.baseDir);
  }

  if (options.resolveMode === "cwd") {
    return process.cwd();
  }

  const entryFile = options.entryFile ?? process.argv[1];
  if (!entryFile) {
    return process.cwd();
  }

  return path.dirname(path.resolve(entryFile));
}

function toAbsolutePath(maybeRelativePath: string, baseDir: string): string {
  if (path.isAbsolute(maybeRelativePath)) {
    return maybeRelativePath;
  }

  return path.resolve(baseDir, maybeRelativePath);
}

function applyParsedEnv(parsed: Record<string, string>, overrideExisting: boolean): void {
  for (const [key, value] of Object.entries(parsed)) {
    if (!overrideExisting && process.env[key] !== undefined) {
      continue;
    }
    process.env[key] = value;
  }
}

function parseAndApplyEnvFile(filePath: string, overrideExisting: boolean): void {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = dotenv.parse(raw);
    applyParsedEnv(parsed, overrideExisting);
  } catch (error) {
    throw new EnvLoaderError(
      "ENV_FILE_READ_FAILED",
      `Failed to read or parse env file: ${filePath}`,
      { filePath },
      error
    );
  }
}

export function loadEnv(options: LoadEnvOptions = {}): LoadEnvResult {
  const explicitEnvVarName = options.explicitEnvVarName ?? DEFAULT_ENV_VAR_NAME;
  const candidateFileNames = options.candidateFileNames ?? DEFAULT_CANDIDATE_FILES;
  const overrideExisting = options.overrideExisting ?? false;
  const failIfNotFound = options.failIfNotFound ?? false;
  const verbose = options.verbose ?? false;
  const baseDir = resolveBaseDir(options);

  const explicitEnvFileValue = process.env[explicitEnvVarName];
  if (explicitEnvFileValue) {
    const explicitFilePath = toAbsolutePath(explicitEnvFileValue, baseDir);
    const searchedFiles = [explicitFilePath];

    if (!fs.existsSync(explicitFilePath)) {
      throw new EnvLoaderError(
        "EXPLICIT_ENV_FILE_NOT_FOUND",
        `Env file specified by ${explicitEnvVarName} was not found: ${explicitFilePath}`,
        { explicitEnvVarName, explicitEnvFileValue, searchedFiles, baseDir }
      );
    }

    parseAndApplyEnvFile(explicitFilePath, overrideExisting);
    logStderrInfo(verbose, `Loaded env file from explicit path (${explicitEnvVarName}): ${explicitFilePath}`);

    return {
      ok: true,
      loaded: true,
      loadedFile: explicitFilePath,
      searchedFiles,
      explicitEnvVarName,
      explicitEnvFileValue,
      baseDir,
      source: "explicit"
    };
  }

  const searchedFiles = candidateFileNames.map((name) => path.resolve(baseDir, name));
  const matchedFile = searchedFiles.find((filePath) => fs.existsSync(filePath));

  if (!matchedFile) {
    logStderrInfo(verbose, `No env file found. searched=[${searchedFiles.join(", ")}]`);

    if (failIfNotFound) {
      throw new EnvLoaderError(
        "ENV_FILE_NOT_FOUND",
        "No env file was found in candidate locations.",
        { searchedFiles, baseDir }
      );
    }

    return {
      ok: true,
      loaded: false,
      searchedFiles,
      explicitEnvVarName,
      baseDir,
      source: "none"
    };
  }

  parseAndApplyEnvFile(matchedFile, overrideExisting);
  logStderrInfo(verbose, `Loaded env file from candidates: ${matchedFile}`);

  return {
    ok: true,
    loaded: true,
    loadedFile: matchedFile,
    searchedFiles,
    explicitEnvVarName,
    baseDir,
    source: "candidates"
  };
}
