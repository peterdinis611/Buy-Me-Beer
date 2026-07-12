import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { migrate } from "drizzle-orm/better-sqlite3/migrator"
import Database from "better-sqlite3"
import { drizzle } from "drizzle-orm/better-sqlite3"
import bcrypt from "bcryptjs"
import { db, dbPath } from "./index.js"
import { countUsers, createUser, findUserByHandle } from "./queries.js"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const migrationsFolder = path.join(__dirname, "../../drizzle")
const legacyJson = path.join(__dirname, "../../data/db.json")

export async function runMigrations() {
  if (!fs.existsSync(migrationsFolder)) {
    console.warn("No drizzle migrations folder — run npm run db:generate")
    return
  }

  const sqlite = new Database(dbPath)
  const migrationDb = drizzle(sqlite)
  migrate(migrationDb, { migrationsFolder })
  sqlite.close()
}

export async function migrateLegacyJson() {
  if ((await countUsers()) > 0) return
  if (!fs.existsSync(legacyJson)) return

  const legacy = JSON.parse(fs.readFileSync(legacyJson, "utf-8")) as {
    users?: Array<Record<string, unknown>>
    supports?: Array<Record<string, unknown>>
  }

  if (!legacy.users?.length) return

  console.log("Migrating legacy db.json → SQLite…")

  for (const u of legacy.users) {
    if (await findUserByHandle(String(u.handle))) continue
    await createUser({
      email: String(u.email),
      passwordHash: String(u.passwordHash),
      emailVerified: true,
      handle: String(u.handle),
      displayName: String(u.displayName),
      bio: String(u.bio ?? ""),
      avatarUrl: String(u.avatarUrl),
      coffeePrice: Number(u.coffeePrice ?? 500),
      beerPrice: Number(u.beerPrice ?? 800),
      coffeeLabel: String(u.coffeeLabel ?? "Buy me a coffee"),
      beerLabel: String(u.beerLabel ?? "Buy me a beer"),
      theme: (u.theme as "warm" | "dark" | "minimal") ?? "warm",
      website: "",
      twitter: "",
      github: "",
      goalAmount: 0,
      goalTitle: "",
    })
  }
}

export async function seedDemoUser() {
  const existing = await findUserByHandle("demo")

  if (!existing) {
    const passwordHash = await bcrypt.hash("demo1234", 10)
    await createUser({
      email: "demo@buy-me-beer.local",
      passwordHash,
      emailVerified: true,
      handle: "demo",
      displayName: "Demo Creator",
      bio: "Demo profile — try coffee ☕, beer 🍺, or membership tiers!",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=demo-creator",
      coffeePrice: 500,
      beerPrice: 800,
      coffeeLabel: "Buy me a coffee",
      beerLabel: "Buy me a beer",
      theme: "warm",
      website: "https://example.com",
      twitter: "democreator",
      github: "demo",
      goalAmount: 50000,
      goalTitle: "New streaming setup",
    })
  } else {
    const { updateUser } = await import("./queries.js")
    await updateUser(existing.id, {
      bio: "Demo profile — try coffee ☕, beer 🍺, or membership tiers!",
      website: existing.website || "https://example.com",
      twitter: existing.twitter || "democreator",
      github: existing.github || "demo",
      goalAmount: existing.goalAmount || 50000,
      goalTitle: existing.goalTitle || "New streaming setup",
    })
  }

  const demo = await findUserByHandle("demo")
  if (demo) {
    const { upsertMembershipTier, getMembershipTiers } = await import("./queries.js")
    const tiers = await getMembershipTiers(demo.id)
    if (tiers.length === 0) {
      await upsertMembershipTier(demo.id, {
        name: "Supporter",
        price: 300,
        description: "Monthly thank-you + shoutout",
      })
      await upsertMembershipTier(demo.id, {
        name: "VIP",
        price: 1000,
        description: "Early access to all content",
      })
    }
  }

  console.log("   Demo: http://localhost:3000/demo (demo@buy-me-beer.local / demo1234)")
}
