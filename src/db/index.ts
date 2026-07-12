import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import Database from "better-sqlite3"
import { drizzle } from "drizzle-orm/better-sqlite3"
import * as schema from "./schema.js"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dataDir = path.join(__dirname, "../../data")
const dbPath = process.env.DATABASE_PATH ?? path.join(dataDir, "app.db")

if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })

const sqlite = new Database(dbPath)
sqlite.pragma("journal_mode = WAL")
sqlite.pragma("foreign_keys = ON")

export const db = drizzle(sqlite, { schema })
export { dbPath }
