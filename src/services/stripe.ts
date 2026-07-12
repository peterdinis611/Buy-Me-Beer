import Stripe from "stripe"
import type { User } from "../db/schema.js"
import type { SupportProduct } from "../types/index.js"

const secretKey = process.env.STRIPE_SECRET_KEY

export function isStripeEnabled() {
  return Boolean(secretKey && secretKey.startsWith("sk_"))
}

function getStripe() {
  if (!isStripeEnabled()) throw new Error("Stripe is not configured")
  return new Stripe(secretKey!)
}

export async function createCheckoutSession(opts: {
  creator: User
  supportId: string
  amount: number
  product: SupportProduct
  supporterName: string
  supporterEmail: string
  message: string
  baseUrl: string
}) {
  const stripe = getStripe()
  const { creator, supportId, amount, product, supporterName, supporterEmail, message, baseUrl } =
    opts

  const productName =
    product === "coffee"
      ? `${creator.coffeeLabel} for ${creator.displayName}`
      : product === "beer"
        ? `${creator.beerLabel} for ${creator.displayName}`
        : product === "membership"
          ? `Membership for ${creator.displayName}`
          : `Support for ${creator.displayName}`

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: supporterEmail || undefined,
    line_items: [
      {
        price_data: {
          currency: "eur",
          unit_amount: amount,
          product_data: {
            name: productName,
            description: message || `Support ${creator.displayName} (@${creator.handle})`,
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      supportId,
      creatorId: creator.id,
      product,
      supporterName,
    },
    success_url: `${baseUrl}/support/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/support/cancel?creator=${encodeURIComponent(creator.handle)}`,
  })

  return session
}

export async function retrieveCheckoutSession(sessionId: string) {
  const stripe = getStripe()
  return stripe.checkout.sessions.retrieve(sessionId)
}
