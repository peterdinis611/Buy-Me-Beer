import {
  createMembership,
  findAsset,
  findMembershipBySubscriptionId,
  findSupportById,
  findUserById,
  updateMembership,
  updateSupport,
} from "../db/queries.js"
import { formatMoney } from "../lib/money.js"
import {
  sendCreatorNewSupportEmail,
  sendShopDownloadEmail,
  sendSupporterThankYouEmail,
} from "./email.js"
import { sseHub, type SupportReceivedPayload } from "./sse.js"

export function buildSupportReceivedPayload(support: {
  id: string
  supporterName: string
  amount: number
  product: string
  message: string
}): SupportReceivedPayload {
  return {
    id: support.id,
    supporterName: support.supporterName,
    amount: support.amount,
    product: support.product,
    message: support.message,
    formattedAmount: formatMoney(support.amount),
  }
}

async function notifySupportCompleted(support: NonNullable<Awaited<ReturnType<typeof findSupportById>>>) {
  sseHub.publish(support.creatorId, "support_received", buildSupportReceivedPayload(support))

  const creator = await findUserById(support.creatorId)
  if (!creator) return

  await sendCreatorNewSupportEmail(creator, support)
  await sendSupporterThankYouEmail(creator, support)

  if (support.product === "shop" && support.assetId) {
    const asset = await findAsset(support.assetId)
    if (asset) await sendShopDownloadEmail(creator, support, asset)
  }
}

export async function completeSupport(
  supportId: string,
  patch?: { stripeSessionId?: string | null }
) {
  const existing = await findSupportById(supportId)
  if (!existing) return undefined
  if (existing.status === "completed") return existing

  const support = await updateSupport(supportId, {
    status: "completed",
    ...(patch?.stripeSessionId !== undefined ? { stripeSessionId: patch.stripeSessionId } : {}),
  })

  if (support) await notifySupportCompleted(support)

  return support
}

export async function activateMembership(opts: {
  creatorId: string
  tierId: string
  supporterName: string
  supporterEmail: string
  stripeSubscriptionId?: string | null
  currentPeriodEnd?: Date | null
}) {
  const existing = opts.stripeSubscriptionId
    ? await findMembershipBySubscriptionId(opts.stripeSubscriptionId)
    : undefined

  if (existing) {
    return updateMembership(existing.id, {
      status: "active",
      currentPeriodEnd: opts.currentPeriodEnd ?? existing.currentPeriodEnd,
    })
  }

  return createMembership({
    creatorId: opts.creatorId,
    tierId: opts.tierId,
    supporterName: opts.supporterName,
    supporterEmail: opts.supporterEmail,
    stripeSubscriptionId: opts.stripeSubscriptionId ?? null,
    status: "active",
    currentPeriodEnd: opts.currentPeriodEnd ?? null,
  })
}

export async function cancelMembershipBySubscription(stripeSubscriptionId: string) {
  const membership = await findMembershipBySubscriptionId(stripeSubscriptionId)
  if (!membership) return undefined
  return updateMembership(membership.id, { status: "canceled" })
}
