import { pgTable, text, jsonb } from "drizzle-orm/pg-core";

export const productsTable = pgTable("products", {
  barcode: text("barcode").primaryKey(),
  name: text("name"),
  brand: text("brand"),
  ingredients_raw: text("ingredients_raw"),
  image_url: text("image_url"),
  analysis_cache: jsonb("analysis_cache").default({}).notNull(),
});

export type Product = typeof productsTable.$inferSelect;
export type InsertProduct = typeof productsTable.$inferInsert;
