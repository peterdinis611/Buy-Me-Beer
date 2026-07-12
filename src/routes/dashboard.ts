import { Router } from "express"
import bcrypt from "bcryptjs"
import {
  createAuthToken,
  deleteAsset,
  deleteMembershipTier,
  deletePost,
  findUserById,
  formatMoney,
  getActiveMemberships,
  getAllShopAssets,
  getCommissionsForCreator,
  getCompletedSupportsSince,
  getCreatorStats,
  getMembershipTiers,
  getPostsForCreator,
  isHandleTaken,
  updateCommission,
  updateUser,
  upsertAsset,
  upsertMembershipTier,
  upsertPost,
} from "../db/queries.js"
import { requireAuth, requireVerifiedEmail } from "../middleware/auth.js"
import { sendVerificationEmail } from "../services/email.js"
import { sseHub } from "../services/sse.js"
import { bucketRevenueByDay, maxDailyTotal, supportsToCsv } from "../lib/analytics.js"
import { normalizePrimaryColor } from "../lib/branding.js"
import { calculateGoalProgress } from "../lib/goals.js"
import { centsToEuros, eurosToCents } from "../lib/money.js"
import { buildProfileUrl, normalizeGithubUsername, normalizeTwitterHandle, normalizeWebsiteUrl } from "../lib/social.js"
import { imageUpload, publicUploadUrl } from "../middleware/upload.js"
import {
  changePasswordSchema,
  commissionStatusSchema,
  firstValidationError,
  integrationsSchema,
  parseFormBoolean,
  postSchema,
  profileFromSettings,
  profileSettingsSchema,
  shopAssetSchema,
  tierSettingsSchema,
} from "../lib/validation.js"
import { postBodyPlainText, sanitizePostBody } from "../lib/postBody.js"

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

router.use((req, res, next) => {
  const baseUrl = process.env.BASE_URL ?? `http://localhost:${process.env.PORT ?? 3000}`
  if (req.session.user?.handle) {
    res.locals.dashboardProfileUrl = buildProfileUrl(baseUrl, req.session.user.handle)
  }
  next()
})

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
    thankYouMessage: user.thankYouMessage ?? "",
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
    primaryColor: normalizePrimaryColor(profile.primaryColor),
    coverImageUrl: profile.coverImageUrl || user.coverImageUrl,
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

  const { id, name, priceEuros, description = "", billingInterval } = parsed.data

  await upsertMembershipTier(user.id, {
    id,
    name: name.trim(),
    price: eurosToCents(priceEuros),
    description: description.trim(),
    billingInterval,
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

router.get("/members", async (req, res) => {
  const user = await findUserById(req.session.user!.id)
  if (!user) return res.redirect("/login")
  const members = await getActiveMemberships(user.id)
  const tiers = await getMembershipTiers(user.id)
  const tierMap = Object.fromEntries(tiers.map((t) => [t.id, t.name]))
  res.render("pages/members", { title: "Members", user, members, tierMap, formatMoney })
})

router.get("/shop", async (req, res) => {
  const user = await findUserById(req.session.user!.id)
  if (!user) return res.redirect("/login")
  const items = await getAllShopAssets(user.id)
  res.render("pages/shop", { title: "Shop / Extras", user, items, formatMoney })
})

router.post("/shop", async (req, res) => {
  const user = await findUserById(req.session.user!.id)
  if (!user) return res.redirect("/login")

  const parsed = shopAssetSchema.safeParse(req.body)
  if (!parsed.success) {
    req.session.flash = { type: "error", message: firstValidationError(parsed) }
    return res.redirect("/dashboard/shop")
  }

  const { id, name, description = "", src, priceEuros } = parsed.data
  await upsertAsset(user.id, {
    id,
    name: name.trim(),
    description: description.trim(),
    src: src.trim(),
    price: eurosToCents(priceEuros),
  })
  req.session.flash = { type: "success", message: "Product saved." }
  res.redirect("/dashboard/shop")
})

router.post("/shop/:id/delete", async (req, res) => {
  const user = await findUserById(req.session.user!.id)
  if (!user) return res.redirect("/login")
  await deleteAsset(user.id, req.params.id!)
  req.session.flash = { type: "success", message: "Product removed." }
  res.redirect("/dashboard/shop")
})

router.get("/qr.png", requireAuth, async (req, res) => {
  const user = await findUserById(req.session.user!.id)
  if (!user) return res.redirect("/login")

  const baseUrl = process.env.BASE_URL ?? `http://localhost:${process.env.PORT ?? 3000}`
  const profileUrl = buildProfileUrl(baseUrl, user.handle)

  try {
    const QRCode = await import("qrcode")
    const png = await QRCode.toBuffer(profileUrl, { margin: 1, width: 280 })
    res.type("png").send(png)
  } catch {
    res.status(500).send("QR generation failed")
  }
})

router.post("/upload/avatar", (req, res, next) => {
  imageUpload.single("avatar")(req, res, (err) => {
    if (err) {
      req.session.flash = { type: "error", message: err instanceof Error ? err.message : "Upload failed." }
      return res.redirect("/dashboard/settings")
    }
    next()
  })
}, async (req, res) => {
  const user = await findUserById(req.session.user!.id)
  if (!user) return res.redirect("/login")

  if (!req.file) {
    req.session.flash = { type: "error", message: "Choose an image to upload." }
    return res.redirect("/dashboard/settings")
  }

  const baseUrl = process.env.BASE_URL ?? `http://localhost:${process.env.PORT ?? 3000}`
  await updateUser(user.id, { avatarUrl: publicUploadUrl(req.file.filename, baseUrl) })
  req.session.flash = { type: "success", message: "Avatar uploaded." }
  res.redirect("/dashboard/settings")
})

router.post("/upload/cover", (req, res, next) => {
  imageUpload.single("cover")(req, res, (err) => {
    if (err) {
      req.session.flash = { type: "error", message: err instanceof Error ? err.message : "Upload failed." }
      return res.redirect("/dashboard/settings")
    }
    next()
  })
}, async (req, res) => {
  const user = await findUserById(req.session.user!.id)
  if (!user) return res.redirect("/login")

  if (!req.file) {
    req.session.flash = { type: "error", message: "Choose a cover image to upload." }
    return res.redirect("/dashboard/settings")
  }

  const baseUrl = process.env.BASE_URL ?? `http://localhost:${process.env.PORT ?? 3000}`
  await updateUser(user.id, { coverImageUrl: publicUploadUrl(req.file.filename, baseUrl) })
  req.session.flash = { type: "success", message: "Cover image uploaded." }
  res.redirect("/dashboard/settings")
})

router.get("/posts", async (req, res) => {
  const user = await findUserById(req.session.user!.id)
  if (!user) return res.redirect("/login")
  const items = await getPostsForCreator(user.id, true)
  res.render("pages/posts", { title: "Posts / Updates", user, items })
})

router.post("/posts", async (req, res) => {
  const user = await findUserById(req.session.user!.id)
  if (!user) return res.redirect("/login")

  const parsed = postSchema.safeParse(req.body)
  if (!parsed.success) {
    req.session.flash = { type: "error", message: firstValidationError(parsed) }
    return res.redirect("/dashboard/posts")
  }

  const { id, title, body = "", visibility, published } = parsed.data
  const safeBody = sanitizePostBody(body)
  const plainLength = postBodyPlainText(safeBody).length
  if (plainLength > 5000) {
    req.session.flash = { type: "error", message: "Post body is too long (max 5000 characters)." }
    return res.redirect("/dashboard/posts")
  }

  await upsertPost(user.id, {
    id,
    title: title.trim(),
    body: safeBody,
    visibility,
    published: published === undefined ? true : parseFormBoolean(published),
  })
  req.session.flash = { type: "success", message: "Post saved." }
  res.redirect("/dashboard/posts")
})

router.post("/posts/:id/delete", async (req, res) => {
  const user = await findUserById(req.session.user!.id)
  if (!user) return res.redirect("/login")
  await deletePost(user.id, req.params.id!)
  req.session.flash = { type: "success", message: "Post deleted." }
  res.redirect("/dashboard/posts")
})

router.get("/analytics", async (req, res) => {
  const user = await findUserById(req.session.user!.id)
  if (!user) return res.redirect("/login")

  const days = Number(req.query.days) === 90 ? 90 : 30
  const since = new Date()
  since.setHours(0, 0, 0, 0)
  since.setDate(since.getDate() - (days - 1))

  const supports = await getCompletedSupportsSince(user.id, since)
  const chart = bucketRevenueByDay(
    supports.map((s) => ({ createdAt: s.createdAt, amount: s.amount })),
    days
  )

  res.render("pages/analytics", {
    title: "Analytics",
    user,
    days,
    chart,
    chartMax: maxDailyTotal(chart),
    formatMoney,
    monthTotal: supports.reduce((sum, s) => sum + s.amount, 0),
    monthCount: supports.length,
  })
})

router.get("/analytics/export.csv", async (req, res) => {
  const user = await findUserById(req.session.user!.id)
  if (!user) return res.redirect("/login")

  const days = Number(req.query.days) === 90 ? 90 : 30
  const since = new Date()
  since.setHours(0, 0, 0, 0)
  since.setDate(since.getDate() - (days - 1))

  const supports = await getCompletedSupportsSince(user.id, since)
  const csv = supportsToCsv(
    supports.map((s) => ({
      createdAt: s.createdAt,
      supporterName: s.supporterName,
      supporterEmail: s.supporterEmail,
      amount: s.amount,
      product: s.product,
      message: s.message,
      isGift: s.isGift,
      giftRecipientName: s.giftRecipientName,
    }))
  )

  res.setHeader("Content-Type", "text/csv; charset=utf-8")
  res.setHeader("Content-Disposition", `attachment; filename="supports-${days}d.csv"`)
  res.send(csv)
})

router.get("/commissions", async (req, res) => {
  const user = await findUserById(req.session.user!.id)
  if (!user) return res.redirect("/login")
  const items = await getCommissionsForCreator(user.id)
  res.render("pages/commissions", { title: "Commissions", user, items, formatMoney })
})

router.post("/commissions/:id/status", async (req, res) => {
  const user = await findUserById(req.session.user!.id)
  if (!user) return res.redirect("/login")

  const parsed = commissionStatusSchema.safeParse(req.body)
  if (!parsed.success) {
    req.session.flash = { type: "error", message: firstValidationError(parsed) }
    return res.redirect("/dashboard/commissions")
  }

  const commission = (await getCommissionsForCreator(user.id)).find((c) => c.id === req.params.id)
  if (!commission) {
    req.session.flash = { type: "error", message: "Commission not found." }
    return res.redirect("/dashboard/commissions")
  }

  await updateCommission(commission.id, { status: parsed.data.status })
  req.session.flash = { type: "success", message: "Commission updated." }
  res.redirect("/dashboard/commissions")
})

router.get("/integrations", async (req, res) => {
  const user = await findUserById(req.session.user!.id)
  if (!user) return res.redirect("/login")
  res.render("pages/integrations", { title: "Integrations", user })
})

router.post("/integrations", async (req, res) => {
  const user = await findUserById(req.session.user!.id)
  if (!user) return res.redirect("/login")

  const parsed = integrationsSchema.safeParse(req.body)
  if (!parsed.success) {
    req.session.flash = { type: "error", message: firstValidationError(parsed) }
    return res.redirect("/dashboard/integrations")
  }

  await updateUser(user.id, {
    discordWebhookUrl: parsed.data.discordWebhookUrl ?? "",
    slackWebhookUrl: parsed.data.slackWebhookUrl ?? "",
  })
  req.session.flash = { type: "success", message: "Integrations saved." }
  res.redirect("/dashboard/integrations")
})

export default router
