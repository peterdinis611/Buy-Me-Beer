import Stripe from "stripe"
import type { MembershipTier, User } from "../db/schema.js"
import type { SupportProduct } from "../types/index.js"

const secretKey = process.env.STRIPE_SECRET_KEY

export function isStripeEnabled() {
  return Boolean(secretKey && secretKey.startsWith("sk_"))
}

function getStripe() {
  if (!isStripeEnabled()) throw new Error("Stripe is not configured")
  return new Stripe(secretKey!)
}

type CheckoutOpts = {
  creator: User
  supportId: string
  amount: number
  product: SupportProduct
  supporterName: string
  supporterEmail: string
  message: string
  baseUrl: string
  tier?: MembershipTier
  assetName?: string
}

export async function createCheckoutSession(opts: CheckoutOpts) {
  const stripe = getStripe()
  const {
    creator,
    supportId,
    amount,
    product,
    supporterName,
    supporterEmail,
    message,
    baseUrl,
    tier,
    assetName,
  } = opts

  const isSubscription = product === "membership" && tier?.billingInterval === "month"

  const productName =
    product === "shop" && assetName
      ? assetName
      : product === "coffee"
        ? `${creator.coffeeLabel} for ${creator.displayName}`
        : product === "beer"
          ? `${creator.beerLabel} for ${creator.displayName}`
          : product === "membership" && tier
            ? `${tier.name} — ${creator.displayName}`
            : `Support for ${creator.displayName}`

  const lineItem: Stripe.Checkout.SessionCreateParams.LineItem = isSubscription
    ? {
        price_data: {
          currency: "eur",
          unit_amount: amount,
          recurring: { interval: "month" },
          product_data: {
            name: productName,
            description: tier?.description || message || `Membership for @${creator.handle}`,
          },
        },
        quantity: 1,
      }
    : {
        price_data: {
          currency: "eur",
          unit_amount: amount,
          product_data: {
            name: productName,
            description: message || `Support ${creator.displayName} (@${creator.handle})`,
          },
        },
        quantity: 1,
      }

  const session = await stripe.checkout.sessions.create({
    mode: isSubscription ? "subscription" : "payment",
    customer_email: supporterEmail || undefined,
    line_items: [lineItem],
    metadata: {
      supportId,
      creatorId: creator.id,
      product,
      supporterName,
      ...(tier ? { tierId: tier.id } : {}),
    },
    ...(isSubscription && tier
      ? {
          subscription_data: {
            metadata: {
              creatorId: creator.id,
              tierId: tier.id,
            },
          },
        }
      : {}),
    success_url: `${baseUrl}/support/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/support/cancel?creator=${encodeURIComponent(creator.handle)}`,
  })

  return session
}

export async function retrieveCheckoutSession(sessionId: string) {
  const stripe = getStripe()
  return stripe.checkout.sessions.retrieve(sessionId)
}

export async function retrieveSubscription(subscriptionId: string) {
  const stripe = getStripe()
  return stripe.subscriptions.retrieve(subscriptionId)
}

export function subscriptionPeriodEnd(sub: Stripe.Subscription): Date {
  const end = sub.items.data[0]?.current_period_end
  return end ? new Date(end * 1000) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
}
