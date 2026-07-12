import { findSupportById, updateSupport } from "../db/queries.js"
import { formatMoney } from "../lib/money.js"
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

  if (support) {
    sseHub.publish(support.creatorId, "support_received", buildSupportReceivedPayload(support))
  }

  return support
}
