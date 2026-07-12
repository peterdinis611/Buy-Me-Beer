import { Router, raw } from "express"
import Stripe from "stripe"
import { v4 as uuid } from "uuid"
import {
  createSupport,
  findUserById,
} from "../db/queries.js"
import {
  activateMembership,
  cancelMembershipBySubscription,
  completeSupport,
} from "../services/supportCompletion.js"
import { isStripeEnabled, retrieveSubscription, subscriptionPeriodEnd } from "../services/stripe.js"

const router = Router()

router.post(
  "/stripe",
  raw({ type: "application/json" }),
  async (req, res) => {
    if (!isStripeEnabled()) return res.status(400).send("Stripe not configured")

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
    const sig = req.headers["stripe-signature"]
    const secret = process.env.STRIPE_WEBHOOK_SECRET

    if (!sig || !secret) return res.status(400).send("Missing webhook secret")

    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(req.body as Buffer, sig, secret)
    } catch (err) {
      console.error("Webhook signature failed:", err)
      return res.status(400).send("Invalid signature")
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session
      const supportId = session.metadata?.supportId

      if (supportId) {
        const support = await completeSupport(supportId, { stripeSessionId: session.id })

        if (support && session.mode === "subscription" && session.subscription) {
          const subId =
            typeof session.subscription === "string"
              ? session.subscription
              : session.subscription.id
          const sub = await retrieveSubscription(subId)
          const tierId = session.metadata?.tierId ?? support.membershipTierId

          if (tierId) {
            await activateMembership({
              creatorId: support.creatorId,
              tierId,
              supporterName: support.supporterName,
              supporterEmail: support.supporterEmail,
              stripeSubscriptionId: subId,
              currentPeriodEnd: subscriptionPeriodEnd(sub),
            })
          }
        }
      }
    }

    if (event.type === "invoice.paid") {
      const invoice = event.data.object as Stripe.Invoice
      const subRef = invoice.parent?.subscription_details?.subscription
      const subId = typeof subRef === "string" ? subRef : subRef?.id

      if (subId && invoice.billing_reason === "subscription_cycle") {
        const sub = await retrieveSubscription(subId)
        const invoiceMeta = invoice.parent?.subscription_details?.metadata
        const creatorId = invoiceMeta?.creatorId ?? sub.metadata?.creatorId
        const tierId = invoiceMeta?.tierId ?? sub.metadata?.tierId

        if (creatorId && tierId && invoice.amount_paid) {
          await createSupport({
            creatorId,
            supporterName: invoice.customer_email ?? "Member",
            supporterEmail: invoice.customer_email ?? "",
            amount: invoice.amount_paid,
            product: "membership",
            message: "Monthly membership renewal",
            status: "completed",
            stripeSessionId: null,
            membershipTierId: tierId,
            assetId: null,
            isPublic: false,
          })

          const creator = await findUserById(creatorId)
          if (creator) {
            const { sendCreatorNewSupportEmail } = await import("../services/email.js")
            const support = {
              id: uuid(),
              creatorId,
              supporterName: invoice.customer_email ?? "Member",
              supporterEmail: invoice.customer_email ?? "",
              amount: invoice.amount_paid,
              product: "membership" as const,
              message: "Monthly membership renewal",
              status: "completed" as const,
              stripeSessionId: null,
              membershipTierId: tierId,
              assetId: null,
              isPublic: false,
              createdAt: new Date(),
            }
            await sendCreatorNewSupportEmail(creator, support)
          }
        }
      }
    }

    if (event.type === "customer.subscription.deleted") {
      const sub = event.data.object as Stripe.Subscription
      await cancelMembershipBySubscription(sub.id)
    }

    res.json({ received: true })
  }
)

export default router
