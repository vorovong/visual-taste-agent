import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const references = sqliteTable("references", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  url: text("url").notNull(),
  title: text("title"),
  verdict: text("verdict", { enum: ["like", "dislike", "delete"] }),
  sourceType: text("source_type", { enum: ["url", "image", "file"] })
    .notNull()
    .default("url"),
  iframeAllowed: integer("iframe_allowed", { mode: "boolean" }),
  capturedAt: text("captured_at").notNull(),
  evaluatedAt: text("evaluated_at"),
  sourceDomain: text("source_domain"),
  contentType: text("content_type").default("website"),
  originalFilename: text("original_filename"),
});

export const screenshots = sqliteTable("screenshots", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  referenceId: integer("reference_id")
    .notNull()
    .references(() => references.id, { onDelete: "cascade" }),
  viewport: text("viewport", { enum: ["mobile", "tablet", "desktop"] }).notNull(),
  path: text("path").notNull(),
});

export const hashtags = sqliteTable("hashtags", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  category: text("category"),
  usageCount: integer("usage_count").notNull().default(0),
});

export const referenceHashtags = sqliteTable("reference_hashtags", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  referenceId: integer("reference_id")
    .notNull()
    .references(() => references.id, { onDelete: "cascade" }),
  hashtagId: integer("hashtag_id")
    .notNull()
    .references(() => hashtags.id, { onDelete: "cascade" }),
});

export const designMetadata = sqliteTable("design_metadata", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  referenceId: integer("reference_id")
    .notNull()
    .references(() => references.id, { onDelete: "cascade" }),
  colors: text("colors"), // JSON string
  fonts: text("fonts"), // JSON string
  layout: text("layout"), // JSON string
  meta: text("meta"), // JSON string
});

export const tasteLog = sqliteTable("taste_log", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  referenceId: integer("reference_id")
    .notNull()
    .references(() => references.id, { onDelete: "cascade" }),
  field: text("field").notNull(),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  changedAt: text("changed_at").notNull(),
});

export const designSystems = sqliteTable("design_systems", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  philosophy: text("philosophy"),
  tokens: text("tokens"), // JSON string
  atomicSpec: text("atomic_spec"),
  basedOn: text("based_on"), // JSON string (reference IDs)
  status: text("status", { enum: ["draft", "stable", "archived"] })
    .notNull()
    .default("draft"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
