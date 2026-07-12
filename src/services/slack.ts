export async function notifySlackMembership(
  webhookUrl: string,
  payload: {
    creatorName: string
    supporterName: string
    supporterEmail: string
    tierName: string
  }
) {
  const url = webhookUrl.trim()
  if (!url) return

  const text = [
    `New member on ${payload.creatorName}'s page`,
    `${payload.supporterName} joined ${payload.tierName}`,
    payload.supporterEmail ? `Email: ${payload.supporterEmail}` : null,
  ]
    .filter(Boolean)
    .join(" · ")

  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    })
  } catch (err) {
    console.error("Slack webhook failed:", err)
  }
}
