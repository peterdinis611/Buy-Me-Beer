import "dotenv/config"
import { createApp } from "./app.js"
import { migrateLegacyJson, runMigrations, seedDemoUser } from "./db/migrate.js"

const PORT = Number(process.env.PORT) || 3000

await runMigrations()
await migrateLegacyJson()
await seedDemoUser()

const app = createApp()

app.listen(PORT, () => {
  console.log(`🍺 Buy Me Beer running at http://localhost:${PORT}`)
  console.log(`   Database: ${process.env.DATABASE_PATH ?? "./data/app.db"}`)
  if (!process.env.STRIPE_SECRET_KEY) console.log("   Demo payment mode (no STRIPE_SECRET_KEY)")
  if (process.env.AUTO_VERIFY_EMAIL !== "true") {
    console.log("   Email verification: links logged to console (set AUTO_VERIFY_EMAIL=true to skip)")
  }
})
