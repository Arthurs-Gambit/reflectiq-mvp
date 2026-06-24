---
name: node:sqlite over better-sqlite3
description: Why to use Node.js 24 built-in node:sqlite instead of better-sqlite3 in Replit
---

## Rule
Always use `import { DatabaseSync } from "node:sqlite"` instead of `better-sqlite3` for SQLite in api-server artifacts.

**Why:** `better-sqlite3` requires native C++ bindings compiled via `node-gyp`. Replit's environment does not compile native bindings during `pnpm install` even when listed in `onlyBuiltDependencies`. The server will fail at startup with "Could not locate bindings file".

**How to apply:**
- `node:sqlite` is a Node.js 24 built-in — no package to install, no native bindings.
- It is experimental (prints `ExperimentalWarning` at startup) but fully functional.
- esbuild with `platform: "node"` externalizes it automatically.
- TypeScript does not include types in `@types/node` yet — add a local `src/types/node-sqlite.d.ts` with `declare module "node:sqlite"` containing `DatabaseSync`, `StatementSync` interfaces.
- API: `db.exec(sql)`, `db.prepare(sql)` → `stmt.run(...params)`, `stmt.get(...params)`, `stmt.all(...params)`. Spread positional params as individual args.
- `stmt.run()` returns `{ changes: number, lastInsertRowid: number | bigint }`.
