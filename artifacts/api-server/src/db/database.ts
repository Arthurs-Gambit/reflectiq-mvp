import { DatabaseSync } from "node:sqlite";
import path from "path";
import fs from "fs";

const workspaceRoot = process.cwd().endsWith(path.join("artifacts", "api-server"))
  ? path.resolve(process.cwd(), "../..")
  : process.cwd();

const dataDir = path.resolve(workspaceRoot, "artifacts/api-server/data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.resolve(dataDir, "reflectiq.db");
const db = new DatabaseSync(dbPath);

db.exec(`PRAGMA journal_mode = WAL`);
db.exec(`PRAGMA foreign_keys = ON`);

db.exec(`
  CREATE TABLE IF NOT EXISTS reflections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    topic TEXT NOT NULL,
    step1_text TEXT NOT NULL,
    step2_text TEXT NOT NULL,
    step3_text TEXT NOT NULL,
    signal TEXT NOT NULL,
    confidence REAL NOT NULL DEFAULT 0.8,
    cluster_id INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS clusters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    topic TEXT NOT NULL,
    signal TEXT NOT NULL,
    student_count INTEGER NOT NULL DEFAULT 0,
    representative_phrases TEXT NOT NULL DEFAULT '[]',
    suggested_action TEXT NOT NULL DEFAULT 'No action needed',
    action_status TEXT,
    trend_direction TEXT NOT NULL DEFAULT 'stable',
    trend_delta INTEGER,
    is_suppressed INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

export default db;
