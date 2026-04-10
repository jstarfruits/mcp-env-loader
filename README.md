# mcp-env-loader

stdio ベースの MCP サーバ向けに、`.env` の探索・読み込み・検証を共通化する Node.js / TypeScript ライブラリです。

## 目的

- `process.cwd()` 依存を避け、エントリーファイル基準で `.env` を安定解決
- `MCP_ENV_FILE` などの明示指定を優先
- required/default/allowEmpty を統一的に検証
- 失敗時の診断情報を整形
- stdout を汚さず stderr 前提で運用

## インストール

```bash
npm install mcp-env-loader
```

## 最短導入（stdio MCP サーバ）

```ts
import { formatEnvError, loadAndValidateEnv } from "mcp-env-loader";

try {
  loadAndValidateEnv({
    required: ["OPENAI_API_KEY"],
    defaults: { LOG_LEVEL: "info" }
  });
} catch (error) {
  process.stderr.write(`${formatEnvError(error)}\n`);
  process.exit(1);
}
```

CommonJS でも利用できます。

```js
const { loadAndValidateEnv, formatEnvError } = require("mcp-env-loader");
```

## デフォルト動作

- 解決基準: `entry`（`process.argv[1]` のディレクトリ）
- 明示指定 env 名: `MCP_ENV_FILE`
- 候補順: `.env.mcp` -> `.env.local` -> `.env`
- 既存 `process.env` は上書きしない
- env ファイル未検出だけでは失敗しない

## API

### `loadEnv(options?)`

env ファイルの探索と読み込みのみ行います。

```ts
import { loadEnv } from "mcp-env-loader";

const result = loadEnv({
  verbose: true
});
```

### `loadAndValidateEnv(options?)`

読み込み + default 適用 + required 検証を行います。

```ts
import { loadAndValidateEnv } from "mcp-env-loader";

loadAndValidateEnv({
  required: ["OPENAI_API_KEY", "UPSTASH_REDIS_REST_URL"],
  defaults: {
    LOG_LEVEL: "info"
  },
  allowEmpty: ["OPTIONAL_HEADER"],
  failIfNotFound: false
});
```

### `getEnv(key, options?)`

個別キー取得のヘルパーです。

```ts
import { getEnv } from "mcp-env-loader";

const apiKey = getEnv("OPENAI_API_KEY", { required: true });
const timeout = getEnv("TIMEOUT_MS", { defaultValue: "30000" });
```

### `formatEnvError(error)`

エラーを人間向けメッセージへ整形します。

```ts
import { formatEnvError, loadAndValidateEnv } from "mcp-env-loader";

try {
  loadAndValidateEnv({ required: ["OPENAI_API_KEY"] });
} catch (error) {
  process.stderr.write(`${formatEnvError(error)}\n`);
  process.exit(1);
}
```

## オプション（主要）

- `resolveMode`: `"entry" | "cwd"`
- `entryFile`: 解決基準に使うエントリーファイル
- `explicitEnvVarName`: 明示 env 名（デフォルト `MCP_ENV_FILE`）
- `candidateFileNames`: 候補ファイル名リスト
- `overrideExisting`: 既存 env を上書きするか（デフォルト `false`）
- `failIfNotFound`: env ファイル未検出をエラーにするか
- `required`: 必須 env の配列
- `defaults`: 未定義時のみ適用するデフォルト値
- `allowEmpty`: 空文字を許可するキー配列
- `verbose`: stderr へ探索ログを出す

## 推奨運用

- `.env*` は Git 管理しない
- `.env.example` / `.env.mcp.example` を共有する
- MCP クライアント設定に秘密情報の実値を直書きしない
- 必要に応じて `MCP_ENV_FILE` で個別ファイルを指定する

## ライセンス

MIT
