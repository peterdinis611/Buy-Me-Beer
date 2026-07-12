import type { Support, User } from "../db/schema.js"
import { formatMoney } from "../lib/money.js"

const baseUrl = () => process.env.BASE_URL ?? `http://localhost:${process.env.PORT ?? 3000}`

async function deliver(to: string, subject: string, body: string) {
  if (process.env.SMTP_HOST) {
    console.log(`[email] ${subject} → ${to}`)
    return
  }
  console.log(`\n📧 ${subject}\n   To: ${to}\n${body}\n`)
}

export async function sendVerificationEmail(email: string, token: string) {
  const link = `${baseUrl()}/verify-email?token=${token}`
  await deliver(email, "Verify your email", `Open this link:\n   ${link}`)
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const link = `${baseUrl()}/reset-password?token=${token}`
  await deliver(email, "Reset your password", `Open this link:\n   ${link}`)
}

export async function sendCreatorNewSupportEmail(creator: User, support: Support) {
  const amount = formatMoney(support.amount)
  const productLabel =
    support.product === "shop"
      ? "Shop purchase"
      : support.product === "membership"
        ? "Membership"
        : "Support"

  await deliver(
    creator.email,
    `New ${productLabel.toLowerCase()}: ${amount}`,
    `${support.supporterName} sent you ${amount}.\n` +
      (support.message ? `Message: "${support.message}"\n` : "") +
      `\nView dashboard: ${baseUrl()}/dashboard`
  )
}

export async function sendSupporterThankYouEmail(creator: User, support: Support) {
  if (!support.supporterEmail) return

  const amount = formatMoney(support.amount)
  const custom = creator.thankYouMessage?.trim()
  const message =
    custom ||
    `Thank you for supporting ${creator.displayName}! Your ${amount} tip means a lot.`

  await deliver(
    support.supporterEmail,
    `Thank you from ${creator.displayName}!`,
    `${message}\n\n— ${creator.displayName}\n${baseUrl()}/${creator.handle}`
  )
}

export async function sendShopDownloadEmail(
  creator: User,
  support: Support,
  asset: { name: string; src: string }
) {
  if (!support.supporterEmail) return

  await deliver(
    support.supporterEmail,
    `Your download: ${asset.name}`,
    `Thanks for purchasing "${asset.name}" from ${creator.displayName}!\n\n` +
      `Download: ${asset.src}\n\n— ${creator.displayName}`
  )
}
