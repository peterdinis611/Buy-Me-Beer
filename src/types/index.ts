export type SupportProduct = "coffee" | "beer" | "custom" | "membership"

export type SessionUser = {
  id: string
  email: string
  handle: string
  displayName: string
  emailVerified: boolean
}

declare module "express-session" {
  interface SessionData {
    user?: SessionUser
    flash?: { type: "success" | "error" | "info"; message: string }
  }
}

export type Flash = { type: "success" | "error" | "info"; message: string }
