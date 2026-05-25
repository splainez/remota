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
  accessKey: text("access_key").notNull().default(""),
  secretKey: text("secret_key").notNull().default(""),
  region: text("region").notNull().default("us-east-1"),
  bucket: text("bucket").notNull().default(""),
  endpoint: text("endpoint").notNull().default(""),
  useHttps: integer("use_https").notNull().default(1),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
