import { sqlite } from "./index";

const migrations = [
  `CREATE TABLE IF NOT EXISTS "references" (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    url TEXT NOT NULL,
    title TEXT,
    verdict TEXT CHECK(verdict IN ('like', 'dislike', 'delete')),
    source_type TEXT NOT NULL DEFAULT 'url' CHECK(source_type IN ('url', 'image', 'file')),
    iframe_allowed INTEGER,
    captured_at TEXT NOT NULL,
    evaluated_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS screenshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reference_id INTEGER NOT NULL REFERENCES "references"(id) ON DELETE CASCADE,
    viewport TEXT NOT NULL CHECK(viewport IN ('mobile', 'tablet', 'desktop')),
    path TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS hashtags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    category TEXT,
    usage_count INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS reference_hashtags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reference_id INTEGER NOT NULL REFERENCES "references"(id) ON DELETE CASCADE,
    hashtag_id INTEGER NOT NULL REFERENCES hashtags(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS design_metadata (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reference_id INTEGER NOT NULL REFERENCES "references"(id) ON DELETE CASCADE,
    colors TEXT,
    fonts TEXT,
    layout TEXT,
    meta TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS taste_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reference_id INTEGER NOT NULL REFERENCES "references"(id) ON DELETE CASCADE,
    field TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    changed_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS design_systems (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    philosophy TEXT,
    tokens TEXT,
    atomic_spec TEXT,
    based_on TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'stable', 'archived')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_references_url ON "references"(url)`,
  `CREATE INDEX IF NOT EXISTS idx_screenshots_ref ON screenshots(reference_id)`,
  `CREATE INDEX IF NOT EXISTS idx_ref_hashtags_ref ON reference_hashtags(reference_id)`,
  `CREATE INDEX IF NOT EXISTS idx_ref_hashtags_tag ON reference_hashtags(hashtag_id)`,
  `CREATE INDEX IF NOT EXISTS idx_design_metadata_ref ON design_metadata(reference_id)`,
  `CREATE INDEX IF NOT EXISTS idx_taste_log_ref ON taste_log(reference_id)`,
  // M11: 매체 확장 마이그레이션
  `ALTER TABLE "references" ADD COLUMN source_domain TEXT`,
  `ALTER TABLE "references" ADD COLUMN content_type TEXT DEFAULT 'website'`,
  `ALTER TABLE "references" ADD COLUMN original_filename TEXT`,
  `CREATE INDEX IF NOT EXISTS idx_references_domain ON "references"(source_domain)`,
  `CREATE INDEX IF NOT EXISTS idx_references_content_type ON "references"(content_type)`,
];

export function runMigrations() {
  for (const sql of migrations) {
    try {
      sqlite.exec(sql);
    } catch (e: unknown) {
      // ALTER TABLE ADD COLUMN fails if column already exists — safe to ignore
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("duplicate column name")) continue;
      throw e;
    }
  }
  console.log("Migrations complete.");
}

// CLI에서 직접 실행할 때
if (process.argv[1]?.endsWith("migrate.ts") || process.argv[1]?.endsWith("migrate.js")) {
  runMigrations();
}
