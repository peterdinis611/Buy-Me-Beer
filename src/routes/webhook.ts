import { Router, raw } from "express"
import Stripe from "stripe"
import { completeSupport } from "../services/supportCompletion.js"
import { isStripeEnabled } from "../services/stripe.js"

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
        await completeSupport(supportId, { stripeSessionId: session.id })
      }
    }

    res.json({ received: true })
  }
)

export default router
