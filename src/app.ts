import express from "express"
import session from "express-session"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { flashToLocals } from "./middleware/auth.js"
import authRoutes from "./routes/auth.js"
import dashboardRoutes from "./routes/dashboard.js"
import supportRoutes from "./routes/support.js"
import pageRoutes from "./routes/pages.js"
import webhookRoutes from "./routes/webhook.js"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export function createApp() {
  const app = express()

  app.set("view engine", "ejs")
  app.set("views", path.join(__dirname, "../views"))

  app.use(express.static(path.join(__dirname, "../public")))

  // Stripe webhook needs raw body — mount before json parser
  app.use("/webhooks", webhookRoutes)

  app.use(express.urlencoded({ extended: true }))
  app.use(express.json())

  app.use(
    session({
      secret: process.env.SESSION_SECRET ?? "dev-secret-change-in-production",
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 14,
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      },
    })
  )

  app.use(flashToLocals)

  app.use(authRoutes)
  app.use("/dashboard", dashboardRoutes)
  app.use("/support", supportRoutes)
  app.use(pageRoutes)

  app.use((_req, res) => {
    res.status(404).render("pages/404", { title: "Not found" })
  })

  return app
}
