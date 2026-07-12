export type SupportRow = {
  supporterName: string
  supporterEmail?: string
  amount: number
}

export type LeaderboardEntry = {
  key: string
  name: string
  total: number
  count: number
  badge: string | null
}

const BADGES = ["🥇", "🥈", "🥉"]

export function supporterKey(name: string, email?: string): string {
  const normalizedEmail = email?.trim().toLowerCase()
  if (normalizedEmail) return `email:${normalizedEmail}`
  return `name:${name.trim().toLowerCase()}`
}

export function buildLeaderboard(supports: SupportRow[], limit = 10): LeaderboardEntry[] {
  const totals = new Map<string, { name: string; total: number; count: number }>()

  for (const support of supports) {
    const name = support.supporterName.trim() || "Anonymous"
    const key = supporterKey(name, support.supporterEmail)
    const existing = totals.get(key) ?? { name, total: 0, count: 0 }
    existing.total += support.amount
    existing.count += 1
    totals.set(key, existing)
  }

  return [...totals.values()]
    .sort((a, b) => b.total - a.total || b.count - a.count)
    .slice(0, limit)
    .map((entry, index) => ({
      key: `${entry.name}-${index}`,
      name: entry.name,
      total: entry.total,
      count: entry.count,
      badge: BADGES[index] ?? null,
    }))
}
