import { Router } from "express"
import bcrypt from "bcryptjs"
import {
  consumeAuthToken,
  createAuthToken,
  createUser,
  findUserByEmail,
  findUserById,
  isHandleTaken,
  updateUser,
} from "../db/queries.js"
import { isReservedHandle, normalizeHandle } from "../lib/handles.js"
import { authLimiter } from "../middleware/rateLimit.js"
import { redirectIfAuth, sessionUserFromDb } from "../middleware/auth.js"
import { sendPasswordResetEmail, sendVerificationEmail } from "../services/email.js"
import {
  firstValidationError,
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  signupSchema,
} from "../lib/validation.js"

const router = Router()

router.get("/login", redirectIfAuth, (_req, res) => {
  res.render("pages/login", { title: "Log in" })
})

router.post("/login", authLimiter, redirectIfAuth, async (req, res) => {
  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) {
    req.session.flash = { type: "error", message: "Invalid email or password." }
    return res.redirect("/login")
  }

  const user = await findUserByEmail(parsed.data.email)
  if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
    req.session.flash = { type: "error", message: "Invalid email or password." }
    return res.redirect("/login")
  }

  req.session.user = sessionUserFromDb(user)
  res.redirect("/dashboard")
})

router.get("/signup", redirectIfAuth, (_req, res) => {
  res.render("pages/signup", { title: "Create account" })
})

router.post("/signup", authLimiter, redirectIfAuth, async (req, res) => {
  const handle = normalizeHandle(String(req.body.handle ?? req.body.displayName ?? ""))
  const parsed = signupSchema.safeParse({ ...req.body, handle })

  if (!parsed.success) {
    req.session.flash = { type: "error", message: firstValidationError(parsed) }
    return res.redirect("/signup")
  }

  if (isReservedHandle(parsed.data.handle)) {
    req.session.flash = { type: "error", message: "This username is reserved." }
    return res.redirect("/signup")
  }

  if (await findUserByEmail(parsed.data.email)) {
    req.session.flash = { type: "error", message: "Email already registered." }
    return res.redirect("/signup")
  }

  if (await isHandleTaken(parsed.data.handle)) {
    req.session.flash = { type: "error", message: "Username already taken." }
    return res.redirect("/signup")
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12)
  const autoVerify = process.env.AUTO_VERIFY_EMAIL === "true"

  const user = await createUser({
    email: parsed.data.email,
    passwordHash,
    emailVerified: autoVerify,
    handle: parsed.data.handle,
    displayName: parsed.data.displayName,
    bio: "",
    avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(parsed.data.handle)}`,
    beerPrice: 800,
    beerLabel: "Buy me a beer",
    theme: "warm",
    website: "",
    twitter: "",
    github: "",
    goalAmount: 0,
    goalTitle: "",
  })

  if (!autoVerify) {
    const { token } = await createAuthToken(user.id, "verify_email")
    await sendVerificationEmail(user.email, token)
  }

  req.session.user = sessionUserFromDb(user)
  req.session.flash = {
    type: "success",
    message: autoVerify
      ? "Welcome! Your page is ready."
      : "Account created! Check your email for the verification link.",
  }
  res.redirect("/dashboard")
})

router.get("/verify-email", async (req, res) => {
  const token = String(req.query.token ?? "")
  const row = token ? await consumeAuthToken(token, "verify_email") : null

  if (!row) {
    req.session.flash = { type: "error", message: "Invalid or expired verification link." }
    return res.redirect("/login")
  }

  await updateUser(row.userId, { emailVerified: true })
  const user = await findUserById(row.userId)
  if (user && req.session.user?.id === user.id) {
    req.session.user.emailVerified = true
  }

  req.session.flash = { type: "success", message: "Email verified successfully!" }
  res.redirect("/dashboard")
})

router.get("/forgot-password", redirectIfAuth, (_req, res) => {
  res.render("pages/forgot-password", { title: "Forgot password" })
})

router.post("/forgot-password", authLimiter, redirectIfAuth, async (req, res) => {
  const parsed = forgotPasswordSchema.safeParse(req.body)
  if (!parsed.success) {
    req.session.flash = { type: "error", message: "Enter a valid email." }
    return res.redirect("/forgot-password")
  }

  const user = await findUserByEmail(parsed.data.email)
  if (user) {
    const { token } = await createAuthToken(user.id, "reset_password")
    await sendPasswordResetEmail(user.email, token)
  }

  req.session.flash = {
    type: "info",
    message: "If that email exists, we sent reset instructions to your inbox.",
  }
  res.redirect("/login")
})

router.get("/reset-password", redirectIfAuth, (req, res) => {
  const token = String(req.query.token ?? "")
  if (!token) return res.redirect("/forgot-password")
  res.render("pages/reset-password", { title: "Reset password", token })
})

router.post("/reset-password", authLimiter, redirectIfAuth, async (req, res) => {
  const parsed = resetPasswordSchema.safeParse(req.body)
  if (!parsed.success) {
    req.session.flash = { type: "error", message: "Password must be at least 8 characters." }
    return res.redirect(`/reset-password?token=${req.body.token}`)
  }

  const row = await consumeAuthToken(parsed.data.token, "reset_password")
  if (!row) {
    req.session.flash = { type: "error", message: "Invalid or expired reset link." }
    return res.redirect("/forgot-password")
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12)
  await updateUser(row.userId, { passwordHash })

  req.session.flash = { type: "success", message: "Password updated. You can log in now." }
  res.redirect("/login")
})

router.post("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/"))
})

export default router
