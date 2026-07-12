export type SupportProduct = "coffee" | "beer" | "custom" | "membership" | "shop" | "commission"

export type SupportRecord = {
  amount: number
  product: SupportProduct
  message?: string
  isPublic?: boolean
}

export type CreatorStatsSummary = {
  total: number
  count: number
  coffeeCount: number
  beerCount: number
  membershipCount: number
  customCount: number
  shopCount: number
  commissionCount: number
  averageTip: number
}

export function aggregateSupportStats(supports: SupportRecord[]): CreatorStatsSummary {
  const total = supports.reduce((sum, s) => sum + s.amount, 0)
  const count = supports.length
  const coffeeCount = supports.filter((s) => s.product === "coffee").length
  const beerCount = supports.filter((s) => s.product === "beer").length
  const membershipCount = supports.filter((s) => s.product === "membership").length
  const customCount = supports.filter((s) => s.product === "custom").length

  const shopCount = supports.filter((s) => s.product === "shop").length
  const commissionCount = supports.filter((s) => s.product === "commission").length

  return {
    total,
    count,
    coffeeCount,
    beerCount,
    membershipCount,
    customCount,
    shopCount,
    commissionCount,
    averageTip: count > 0 ? Math.round(total / count) : 0,
  }
}

export function filterPublicMessages<T extends SupportRecord>(supports: T[], limit = 12): T[] {
  return supports.filter((s) => s.isPublic !== false && Boolean(s.message?.trim())).slice(0, limit)
}
