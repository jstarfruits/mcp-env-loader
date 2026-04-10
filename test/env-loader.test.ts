import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  EnvLoaderError,
  formatEnvError,
  getEnv,
  loadAndValidateEnv,
  loadEnv
} from "../src/index.js";

const TEST_KEYS = [
  "MCP_ENV_FILE",
  "CUSTOM_ENV_FILE",
  "API_KEY",
  "BASE_URL",
  "EMPTY_OK",
  "EMPTY_NO",
  "PRESET",
  "FROM_FILE",
  "DEFAULT_ONLY",
  "REQ_ONE",
  "REQ_TWO"
] as const;

function snapshotEnv(): Partial<NodeJS.ProcessEnv> {
  const snapshot: Partial<NodeJS.ProcessEnv> = {};
  for (const key of TEST_KEYS) {
    snapshot[key] = process.env[key];
  }
  return snapshot;
}

function restoreEnv(snapshot: Partial<NodeJS.ProcessEnv>): void {
  for (const key of TEST_KEYS) {
    const value = snapshot[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

function createTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "mcp-env-loader-test-"));
}

describe("loadEnv", () => {
  const snapshots: Partial<NodeJS.ProcessEnv>[] = [];

  afterEach(() => {
    const snapshot = snapshots.pop();
    if (snapshot) {
      restoreEnv(snapshot);
    }
  });

  it("loads from explicit env file when MCP_ENV_FILE is set", () => {
    snapshots.push(snapshotEnv());
    const dir = createTempDir();
    const explicit = path.join(dir, "custom.env");
    fs.writeFileSync(explicit, "API_KEY=abc123\n", "utf8");

    process.env.MCP_ENV_FILE = explicit;
    const result = loadEnv({ entryFile: path.join(dir, "index.js") });

    expect(result.loaded).toBe(true);
    expect(result.source).toBe("explicit");
    expect(result.loadedFile).toBe(explicit);
    expect(process.env.API_KEY).toBe("abc123");
  });

  it("uses candidate order .env.mcp -> .env.local -> .env", () => {
    snapshots.push(snapshotEnv());
    const dir = createTempDir();

    fs.writeFileSync(path.join(dir, ".env.local"), "FROM_FILE=local\n", "utf8");
    fs.writeFileSync(path.join(dir, ".env"), "FROM_FILE=default\n", "utf8");
    fs.writeFileSync(path.join(dir, ".env.mcp"), "FROM_FILE=mcp\n", "utf8");

    const result = loadEnv({ entryFile: path.join(dir, "server.js") });

    expect(result.loadedFile).toBe(path.join(dir, ".env.mcp"));
    expect(process.env.FROM_FILE).toBe("mcp");
  });

  it("does not override existing process.env by default", () => {
    snapshots.push(snapshotEnv());
    const dir = createTempDir();
    fs.writeFileSync(path.join(dir, ".env"), "PRESET=from_file\n", "utf8");

    process.env.PRESET = "from_os";

    loadEnv({ entryFile: path.join(dir, "server.js") });
    expect(process.env.PRESET).toBe("from_os");
  });

  it("throws for missing explicit env file", () => {
    snapshots.push(snapshotEnv());
    const dir = createTempDir();

    process.env.MCP_ENV_FILE = path.join(dir, "missing.env");

    expect(() => loadEnv({ entryFile: path.join(dir, "server.js") })).toThrowError(EnvLoaderError);
  });
});

describe("loadAndValidateEnv", () => {
  const snapshots: Partial<NodeJS.ProcessEnv>[] = [];

  afterEach(() => {
    const snapshot = snapshots.pop();
    if (snapshot) {
      restoreEnv(snapshot);
    }
  });

  it("applies defaults only when undefined", () => {
    snapshots.push(snapshotEnv());

    process.env.BASE_URL = "https://already-set.example";

    const result = loadAndValidateEnv({
      failIfNotFound: false,
      defaults: {
        BASE_URL: "https://default.example",
        DEFAULT_ONLY: "fallback"
      }
    });

    expect(result.env.BASE_URL).toBe("https://already-set.example");
    expect(result.env.DEFAULT_ONLY).toBe("fallback");
  });

  it("collects missing required keys in a single error", () => {
    snapshots.push(snapshotEnv());

    try {
      loadAndValidateEnv({
        failIfNotFound: false,
        required: ["REQ_ONE", "REQ_TWO"]
      });
      throw new Error("expected to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(EnvLoaderError);
      const envError = error as EnvLoaderError;
      expect(envError.code).toBe("ENV_VALIDATION_FAILED");
      expect(envError.details?.missingKeys).toEqual(["REQ_ONE", "REQ_TWO"]);
    }
  });

  it("treats empty string as missing unless allowEmpty includes key", () => {
    snapshots.push(snapshotEnv());

    process.env.EMPTY_OK = "";
    process.env.EMPTY_NO = "";

    expect(() =>
      loadAndValidateEnv({
        failIfNotFound: false,
        required: ["EMPTY_OK", "EMPTY_NO"],
        allowEmpty: ["EMPTY_OK"]
      })
    ).toThrowError(EnvLoaderError);
  });
});

describe("getEnv and formatEnvError", () => {
  const snapshots: Partial<NodeJS.ProcessEnv>[] = [];

  afterEach(() => {
    const snapshot = snapshots.pop();
    if (snapshot) {
      restoreEnv(snapshot);
    }
  });

  it("supports default value and required rules", () => {
    snapshots.push(snapshotEnv());

    expect(getEnv("API_KEY", { defaultValue: "fallback" })).toBe("fallback");
    expect(() => getEnv("API_KEY", { required: true })).toThrowError(EnvLoaderError);
  });

  it("returns undefined for empty string when allowEmpty=false", () => {
    snapshots.push(snapshotEnv());
    process.env.EMPTY_NO = "";

    expect(getEnv("EMPTY_NO")).toBeUndefined();
    expect(getEnv("EMPTY_NO", { allowEmpty: true })).toBe("");
  });

  it("formats env error with searched paths and hints", () => {
    const err = new EnvLoaderError("ENV_VALIDATION_FAILED", "Missing keys", {
      missingKeys: ["API_KEY"],
      searchedFiles: ["/tmp/.env.mcp", "/tmp/.env.local"],
      loadedFile: "/tmp/.env"
    });

    const message = formatEnvError(err);

    expect(message).toContain("ENV_VALIDATION_FAILED");
    expect(message).toContain("API_KEY");
    expect(message).toContain("/tmp/.env");
    expect(message).toContain("Hints:");
  });
});
