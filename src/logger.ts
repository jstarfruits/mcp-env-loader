export function logStderrInfo(verbose: boolean, message: string): void {
  if (!verbose) {
    return;
  }

  process.stderr.write(`[mcp-env-loader] ${message}\n`);
}
