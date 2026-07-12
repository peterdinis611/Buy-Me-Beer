import { Router } from "express"
import type { Response } from "express"
import { findAsset, findUserByHandle, findUserById } from "../db/queries.js"
import { completeSupport } from "../services/supportCompletion.js"
import { isStripeEnabled, retrieveCheckoutSession } from "../services/stripe.js"
import { formatMoney } from "../lib/money.js"
import type { Support } from "../db/schema.js"

const router = Router()

async function renderSuccess(res: Response, support: Support | undefined, demo: boolean) {
  const creator = support ? await findUserById(support.creatorId) : undefined
  const asset =
    support?.product === "shop" && support.assetId ? await findAsset(support.assetId) : undefined

  res.render("pages/success", {
    title: "Thank you!",
    support,
    creator,
    asset,
    demo,
    formatMoney,
  })
}

router.get("/success", async (req, res) => {
  const sessionId = String(req.query.session_id ?? "")

  if (sessionId && isStripeEnabled()) {
    try {
      const session = await retrieveCheckoutSession(sessionId)
      const support = session.metadata?.supportId
        ? await completeSupport(session.metadata.supportId, { stripeSessionId: session.id })
        : undefined

      return renderSuccess(res, support, false)
    } catch {
      /* fall through */
    }
  }

  const supportId = String(req.query.support_id ?? "")
  const support = supportId ? await completeSupport(supportId) : undefined

  await renderSuccess(res, support, !isStripeEnabled())
})

router.get("/cancel", async (req, res) => {
  const handle = String(req.query.creator ?? "").toLowerCase()
  req.session.flash = { type: "info", message: "Payment cancelled — no charge was made." }

  if (handle && (await findUserByHandle(handle))) {
    return res.redirect(`/${handle}`)
  }

  res.redirect("/")
})

export default router
