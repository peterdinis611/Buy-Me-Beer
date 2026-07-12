import express from "express"
import session from "express-session"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { flashToLocals } from "./middleware/auth.js"
import { isPostBodyHtml, postBodyPreview, sanitizePostBody } from "./lib/postBody.js"
import authRoutes from "./routes/auth.js"
import dashboardRoutes from "./routes/dashboard.js"
import supportRoutes from "./routes/support.js"
import embedRoutes from "./routes/embed.js"
import pageRoutes from "./routes/pages.js"
import webhookRoutes from "./routes/webhook.js"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export function createApp() {
  const app = express()

  app.set("view engine", "ejs")
  app.set("views", path.join(__dirname, "../views"))
  app.locals.sanitizePostBody = sanitizePostBody
  app.locals.isPostBodyHtml = isPostBodyHtml
  app.locals.postBodyPreview = postBodyPreview

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
  app.use("/embed", embedRoutes)
  app.use(pageRoutes)

  app.use((_req, res) => {
    res.status(404).render("pages/not-found", { title: "Not found" })
  })

  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err)
    if (res.headersSent) return

    const isDev = process.env.NODE_ENV !== "production"
    res.status(500).render("pages/error", {
      title: "Error",
      message:
        isDev && err instanceof Error
          ? err.message
          : "We're sorry — an unexpected error occurred. Please try again in a moment.",
    })
  })

  return app
}
