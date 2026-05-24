import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

export const connections = sqliteTable("connections", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  protocol: text("protocol").notNull(),
  host: text("host").notNull(),
  port: integer("port").notNull().default(22),
  username: text("username").notNull().default(""),
  authType: text("auth_type").notNull().default("password"),
  password: text("password").notNull().default(""),
  privateKeyPath: text("private_key_path").notNull().default(""),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
