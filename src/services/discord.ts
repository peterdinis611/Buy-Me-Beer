export async function notifyDiscordMembership(
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

  const content = [
    `🎉 **New member** on ${payload.creatorName}'s page`,
    `**${payload.supporterName}** joined **${payload.tierName}**`,
    payload.supporterEmail ? `Email: ${payload.supporterEmail}` : null,
  ]
    .filter(Boolean)
    .join("\n")

  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    })
  } catch (err) {
    console.error("Discord webhook failed:", err)
  }
}
