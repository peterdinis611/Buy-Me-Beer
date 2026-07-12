import { Router } from "express"
import bcrypt from "bcryptjs"
import {
  createAuthToken,
  deleteMembershipTier,
  findUserById,
  formatMoney,
  getCreatorStats,
  getMembershipTiers,
  isHandleTaken,
  updateUser,
  upsertMembershipTier,
} from "../db/queries.js"
import { requireAuth, requireVerifiedEmail } from "../middleware/auth.js"
import { sendVerificationEmail } from "../services/email.js"
import { sseHub } from "../services/sse.js"
import { calculateGoalProgress } from "../lib/goals.js"
import { buildProfileUrl, normalizeGithubUsername, normalizeTwitterHandle, normalizeWebsiteUrl } from "../lib/social.js"
import {
  changePasswordSchema,
  firstValidationError,
  profileFromSettings,
  profileSettingsSchema,
  tierSettingsSchema,
} from "../lib/validation.js"

const router = Router()

router.get("/events", requireAuth, (req, res) => {
  const creatorId = req.session.user!.id

  res.setHeader("Content-Type", "text/event-stream")
  res.setHeader("Cache-Control", "no-cache")
  res.setHeader("Connection", "keep-alive")
  res.setHeader("X-Accel-Buffering", "no")
  res.flushHeaders()

  res.write(`event: connected\ndata: ${JSON.stringify({ ok: true })}\n\n`)

  const unsubscribe = sseHub.subscribe(creatorId, res)

  req.on("close", () => {
    unsubscribe()
    res.end()
  })
})

router.use(requireAuth, requireVerifiedEmail)

router.get("/", async (req, res) => {
  const user = await findUserById(req.session.user!.id)
  if (!user) {
    req.session.destroy(() => res.redirect("/login"))
    return
  }

  const stats = await getCreatorStats(user.id)
  const baseUrl = process.env.BASE_URL ?? `http://localhost:${process.env.PORT ?? 3000}`

  res.render("pages/dashboard", {
    title: "Dashboard",
    user,
    stats,
    profileUrl: buildProfileUrl(baseUrl, user.handle),
    formatMoney,
    goalProgress: calculateGoalProgress(stats.total, user.goalAmount),
  })
})

router.get("/settings", async (req, res) => {
  const user = await findUserById(req.session.user!.id)
  if (!user) return res.redirect("/login")
  res.render("pages/settings", {
    title: "Profile settings",
    user,
    coffeePriceEuros: centsToEuros(user.coffeePrice),
    beerPriceEuros: centsToEuros(user.beerPrice),
    goalEuros: centsToEuros(user.goalAmount),
  })
})

router.post("/settings", async (req, res) => {
  const user = await findUserById(req.session.user!.id)
  if (!user) return res.redirect("/login")

  const parsed = profileSettingsSchema.safeParse(req.body)
  if (!parsed.success) {
    req.session.flash = { type: "error", message: firstValidationError(parsed) }
    return res.redirect("/dashboard/settings")
  }

  const profile = profileFromSettings(parsed.data)
  if (await isHandleTaken(profile.handle, user.id)) {
    req.session.flash = { type: "error", message: "Username already taken." }
    return res.redirect("/dashboard/settings")
  }

  const updated = await updateUser(user.id, {
    ...profile,
    avatarUrl: profile.avatarUrl || user.avatarUrl,
    website: normalizeWebsiteUrl(profile.website),
    twitter: normalizeTwitterHandle(profile.twitter),
    github: normalizeGithubUsername(profile.github),
  })

  if (updated && req.session.user) {
    req.session.user.handle = updated.handle
    req.session.user.displayName = updated.displayName
  }

  req.session.flash = { type: "success", message: "Profile updated." }
  res.redirect("/dashboard/settings")
})

router.get("/security", async (req, res) => {
  const user = await findUserById(req.session.user!.id)
  if (!user) return res.redirect("/login")
  res.render("pages/security", { title: "Security", user })
})

router.post("/security/password", async (req, res) => {
  const user = await findUserById(req.session.user!.id)
  if (!user) return res.redirect("/login")

  const parsed = changePasswordSchema.safeParse(req.body)
  if (!parsed.success) {
    req.session.flash = { type: "error", message: "New password must be at least 8 characters." }
    return res.redirect("/dashboard/security")
  }

  if (!(await bcrypt.compare(parsed.data.currentPassword, user.passwordHash))) {
    req.session.flash = { type: "error", message: "Current password is incorrect." }
    return res.redirect("/dashboard/security")
  }

  await updateUser(user.id, { passwordHash: await bcrypt.hash(parsed.data.newPassword, 12) })
  req.session.flash = { type: "success", message: "Password changed." }
  res.redirect("/dashboard/security")
})

router.post("/security/resend-verification", async (req, res) => {
  const user = await findUserById(req.session.user!.id)
  if (!user) return res.redirect("/login")

  if (user.emailVerified) {
    req.session.flash = { type: "info", message: "Email already verified." }
    return res.redirect("/dashboard/security")
  }

  const { token } = await createAuthToken(user.id, "verify_email")
  await sendVerificationEmail(user.email, token)
  req.session.flash = { type: "info", message: "Verification email sent — check your inbox." }
  res.redirect("/dashboard/security")
})

router.get("/tiers", async (req, res) => {
  const user = await findUserById(req.session.user!.id)
  if (!user) return res.redirect("/login")
  const tiers = await getMembershipTiers(user.id)
  res.render("pages/tiers", { title: "Membership tiers", user, tiers, formatMoney })
})

router.post("/tiers", async (req, res) => {
  const user = await findUserById(req.session.user!.id)
  if (!user) return res.redirect("/login")

  const parsed = tierSettingsSchema.safeParse(req.body)
  if (!parsed.success) {
    req.session.flash = { type: "error", message: firstValidationError(parsed) }
    return res.redirect("/dashboard/tiers")
  }

  const { id, name, priceEuros, description = "" } = parsed.data

  await upsertMembershipTier(user.id, {
    id,
    name: name.trim(),
    price: eurosToCents(priceEuros),
    description: description.trim(),
  })
  req.session.flash = { type: "success", message: "Tier saved." }
  res.redirect("/dashboard/tiers")
})

router.post("/tiers/:id/delete", async (req, res) => {
  const user = await findUserById(req.session.user!.id)
  if (!user) return res.redirect("/login")
  await deleteMembershipTier(user.id, req.params.id!)
  req.session.flash = { type: "success", message: "Tier deleted." }
  res.redirect("/dashboard/tiers")
})

export default router
