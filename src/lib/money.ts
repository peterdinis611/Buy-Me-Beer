export const MIN_TIP_CENTS = 100
export const MAX_TIP_CENTS = 100_000
export const MIN_TIER_CENTS = 100
export const MAX_TIER_CENTS = 50_000

export function formatMoney(cents: number, currency = "EUR"): string {
  return new Intl.NumberFormat("sk-SK", { style: "currency", currency }).format(cents / 100)
}

export function eurosToCents(euros: number): number {
  return Math.round(euros * 100)
}

export function centsToEuros(cents: number): number {
  return cents / 100
}

export function clampCents(amount: number, min = MIN_TIP_CENTS, max = MAX_TIP_CENTS): number {
  return Math.max(min, Math.min(max, Math.round(amount)))
}

export function clampTierPrice(price: number): number {
  return clampCents(price, MIN_TIER_CENTS, MAX_TIER_CENTS)
}
