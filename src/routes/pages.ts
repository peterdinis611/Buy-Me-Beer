import { Router } from "express"
import type { Request, Response } from "express"
import {
  createSupport,
  findAsset,
  findMembershipTier,
  findUserByHandle,
  formatMoney,
  getCreatorStats,
  getMembershipTiers,
  getShopAssets,
  getSupportsForCreator,
  listCreators,
  updateSupport,
} from "../db/queries.js"
import { calculateGoalProgress } from "../lib/goals.js"
import { isReservedHandle } from "../lib/handles.js"
import { buildProfileUrl } from "../lib/social.js"
import { formatSupporterName, resolveSupportAmount } from "../lib/support.js"
import { filterPublicMessages } from "../lib/stats.js"
import { supportLimiter } from "../middleware/rateLimit.js"
import { activateMembership, completeSupport } from "../services/supportCompletion.js"
import { isStripeEnabled, createCheckoutSession } from "../services/stripe.js"
import { firstValidationError, shopPurchaseSchema, supportSchema } from "../lib/validation.js"

const router = Router()

router.get("/", (_req, res) => {
  res.render("pages/home", { title: "Buy Me Beer — Support creators you love" })
})

router.get("/explore", async (_req, res) => {
  const creators = await listCreators(48)
  res.render("pages/explore", { title: "Explore creators", creators })
})

async function startCheckout(
  req: Request,
  res: Response,
  creator: NonNullable<Awaited<ReturnType<typeof findUserByHandle>>>,
  support: Awaited<ReturnType<typeof createSupport>>,
  opts: {
    amount: number
    product: "coffee" | "beer" | "custom" | "membership" | "shop"
    tier?: Awaited<ReturnType<typeof findMembershipTier>>
    assetName?: string
  }
) {
  const baseUrl = process.env.BASE_URL ?? `http://localhost:${process.env.PORT ?? 3000}`

  if (isStripeEnabled()) {
    try {
      const session = await createCheckoutSession({
        creator,
        supportId: support.id,
        amount: opts.amount,
        product: opts.product,
        supporterName: support.supporterName,
        supporterEmail: support.supporterEmail,
        message: support.message,
        baseUrl,
        tier: opts.tier ?? undefined,
        assetName: opts.assetName,
      })
      await updateSupport(support.id, { stripeSessionId: session.id })
      if (session.url) return res.redirect(session.url)
    } catch (err) {
      console.error("Stripe error:", err)
      req.session.flash = { type: "error", message: "Payment could not be started. Please try again." }
      return res.redirect(`/${creator.handle}`)
    }
  }

  await completeSupport(support.id)
  return res.redirect(`/support/success?support_id=${support.id}`)
}

router.post("/:handle/support", supportLimiter, async (req, res) => {
  const handle = String(req.params.handle).toLowerCase()
  const creator = await findUserByHandle(handle)
  if (!creator) {
    return res.status(404).render("pages/404", {
      title: "Not found",
      message: "This creator page doesn't exist.",
    })
  }

  const product = String(req.body.product ?? "coffee")
  const parsed = supportSchema.safeParse({ ...req.body, product })

  if (!parsed.success) {
    req.session.flash = { type: "error", message: firstValidationError(parsed) }
    return res.redirect(`/${creator.handle}`)
  }

  const data = parsed.data
  let membershipTierId: string | null = null
  let membershipPrice: number | undefined
  let tier: Awaited<ReturnType<typeof findMembershipTier>> | undefined

  if (data.product === "membership") {
    const tierId = data.tierId ?? data.membershipTierId
    if (!tierId) {
      req.session.flash = { type: "error", message: "Please select a support tier." }
      return res.redirect(`/${creator.handle}`)
    }
    tier = await findMembershipTier(tierId)
    if (!tier || tier.userId !== creator.id) {
      req.session.flash = { type: "error", message: "Invalid support tier." }
      return res.redirect(`/${creator.handle}`)
    }
    membershipPrice = tier.price
    membershipTierId = tier.id
  }

  const amount = resolveSupportAmount({
    product: data.product,
    creator,
    customAmount: data.customAmount,
    membershipPrice,
  })

  const support = await createSupport({
    creatorId: creator.id,
    supporterName: formatSupporterName(data.name),
    supporterEmail: data.email ?? "",
    amount,
    product: data.product,
    message: data.message ?? "",
    status: "pending",
    stripeSessionId: null,
    membershipTierId,
    assetId: null,
    isPublic: data.isPublic,
  })

  if (!isStripeEnabled()) {
    await completeSupport(support.id)
    if (data.product === "membership" && tier) {
      const periodEnd =
        tier.billingInterval === "month"
          ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          : null
      await activateMembership({
        creatorId: creator.id,
        tierId: tier.id,
        supporterName: support.supporterName,
        supporterEmail: support.supporterEmail,
        currentPeriodEnd: periodEnd,
      })
    }
    return res.redirect(`/support/success?support_id=${support.id}`)
  }

  return startCheckout(req, res, creator, support, { amount, product: data.product, tier })
})

router.post("/:handle/shop/:assetId", supportLimiter, async (req, res) => {
  const handle = String(req.params.handle).toLowerCase()
  const creator = await findUserByHandle(handle)
  if (!creator) return res.redirect("/")

  const asset = await findAsset(String(req.params.assetId))
  if (!asset || asset.userId !== creator.id || !asset.active) {
    req.session.flash = { type: "error", message: "Product not available." }
    return res.redirect(`/${creator.handle}`)
  }

  const parsed = shopPurchaseSchema.safeParse(req.body)
  if (!parsed.success) {
    req.session.flash = { type: "error", message: firstValidationError(parsed) }
    return res.redirect(`/${creator.handle}`)
  }

  const support = await createSupport({
    creatorId: creator.id,
    supporterName: formatSupporterName(parsed.data.name),
    supporterEmail: parsed.data.email ?? "",
    amount: asset.price,
    product: "shop",
    message: `Purchased: ${asset.name}`,
    status: "pending",
    stripeSessionId: null,
    membershipTierId: null,
    assetId: asset.id,
    isPublic: false,
  })

  if (!isStripeEnabled()) {
    await completeSupport(support.id)
    return res.redirect(`/support/success?support_id=${support.id}`)
  }

  return startCheckout(req, res, creator, support, {
    amount: asset.price,
    product: "shop",
    assetName: asset.name,
  })
})

router.get("/:handle", async (req, res) => {
  const handle = String(req.params.handle).toLowerCase()

  if (isReservedHandle(handle)) {
    return res.status(404).render("pages/404", {
      title: "Not found",
      message: "This page doesn't exist.",
    })
  }

  const creator = await findUserByHandle(handle)
  if (!creator) {
    return res.status(404).render("pages/404", {
      title: "Not found",
      message: "This creator page doesn't exist.",
    })
  }

  const stats = await getCreatorStats(creator.id)
  const publicMessages = await getSupportsForCreator(creator.id, true)
  const tiers = await getMembershipTiers(creator.id)
  const shopItems = await getShopAssets(creator.id)
  const goalProgress = calculateGoalProgress(stats.total, creator.goalAmount)
  const baseUrl = process.env.BASE_URL ?? `http://localhost:${process.env.PORT ?? 3000}`

  res.render("pages/creator", {
    title: `${creator.displayName} — Buy Me Beer`,
    creator,
    stats,
    tiers,
    shopItems,
    publicMessages: filterPublicMessages(publicMessages),
    goalProgress,
    formatMoney,
    profileUrl: buildProfileUrl(baseUrl, creator.handle),
    ogDescription: creator.bio || `Support ${creator.displayName} on Buy Me Beer`,
    supportConfig: {
      coffee: { label: creator.coffeeLabel, formatted: formatMoney(creator.coffeePrice) },
      beer: { label: creator.beerLabel, formatted: formatMoney(creator.beerPrice) },
      tiers: tiers.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        formatted: formatMoney(t.price),
        billingInterval: t.billingInterval,
        priceLabel: t.billingInterval === "month" ? `${formatMoney(t.price)}/mo` : formatMoney(t.price),
      })),
    },
  })
})

export default router
