export type RevenueSupport = {
  createdAt: Date
  amount: number
}

export type DailyRevenue = {
  date: string
  total: number
  count: number
}

export type CsvSupportRow = {
  createdAt: Date
  supporterName: string
  supporterEmail: string
  amount: number
  product: string
  message: string
  isGift?: boolean
  giftRecipientName?: string
}

function formatDateKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function bucketRevenueByDay(supports: RevenueSupport[], days: number): DailyRevenue[] {
  const cutoff = new Date()
  cutoff.setHours(0, 0, 0, 0)
  cutoff.setDate(cutoff.getDate() - (days - 1))

  const buckets = new Map<string, DailyRevenue>()

  for (let i = 0; i < days; i++) {
    const day = new Date(cutoff)
    day.setDate(cutoff.getDate() + i)
    const key = formatDateKey(day)
    buckets.set(key, { date: key, total: 0, count: 0 })
  }

  for (const support of supports) {
    const key = formatDateKey(support.createdAt)
    const bucket = buckets.get(key)
    if (!bucket) continue
    bucket.total += support.amount
    bucket.count += 1
  }

  return [...buckets.values()]
}

export function supportsToCsv(rows: CsvSupportRow[]): string {
  const header = "Date,Supporter,Email,Amount (EUR),Product,Message,Gift,Gift recipient"
  const lines = rows.map((row) => {
    const amount = (row.amount / 100).toFixed(2)
    const escape = (value: string) => `"${value.replace(/"/g, '""')}"`
    return [
      row.createdAt.toISOString(),
      escape(row.supporterName),
      escape(row.supporterEmail),
      amount,
      row.product,
      escape(row.message),
      row.isGift ? "yes" : "no",
      escape(row.giftRecipientName ?? ""),
    ].join(",")
  })

  return [header, ...lines].join("\n")
}

export function maxDailyTotal(buckets: DailyRevenue[]): number {
  return buckets.reduce((max, bucket) => Math.max(max, bucket.total), 0)
}
