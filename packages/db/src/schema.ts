// Drizzle schema definitions
// Add your database schema here

import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

// Example schema - replace with your actual schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

