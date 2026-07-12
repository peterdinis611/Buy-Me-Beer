import type { NextFunction, Request, Response } from "express"
import { findUserById } from "../db/queries.js"

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.user) {
    req.session.flash = { type: "error", message: "Please log in to continue." }
    return res.redirect("/login")
  }
  next()
}

export async function requireVerifiedEmail(req: Request, res: Response, next: NextFunction) {
  if (!req.session.user) return res.redirect("/login")
  const user = await findUserById(req.session.user.id)
  if (user && !user.emailVerified) {
    res.locals.emailUnverified = true
  }
  next()
}

export function redirectIfAuth(req: Request, res: Response, next: NextFunction) {
  if (req.session.user) return res.redirect("/dashboard")
  next()
}

export function flashToLocals(req: Request, res: Response, next: NextFunction) {
  if (req.session.flash) {
    res.locals.flash = req.session.flash
    delete req.session.flash
  }
  res.locals.sessionUser = req.session.user ?? null
  res.locals.stripeEnabled = Boolean(
    process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY.startsWith("sk_")
  )
  res.locals.stripePublishableKey = process.env.STRIPE_PUBLISHABLE_KEY ?? ""
  const port = process.env.PORT ?? "3000"
  res.locals.baseUrl = (process.env.BASE_URL ?? `http://localhost:${port}`).replace(/\/$/, "")
  next()
}

function sessionUserFromDb(user: {
  id: string
  email: string
  handle: string
  displayName: string
  emailVerified: boolean
}) {
  return {
    id: user.id,
    email: user.email,
    handle: user.handle,
    displayName: user.displayName,
    emailVerified: user.emailVerified,
  }
}

export { sessionUserFromDb }
