import { clampCents, MIN_TIP_CENTS } from "./money.js"

export type SupportProduct = "coffee" | "beer" | "custom" | "membership"

export type CreatorPrices = {
  coffeePrice: number
  beerPrice: number
}

export type ResolveSupportAmountInput = {
  product: SupportProduct
  creator: CreatorPrices
  customAmount?: number
  membershipPrice?: number
}

export function resolveSupportAmount(input: ResolveSupportAmountInput): number {
  const { product, creator, customAmount, membershipPrice } = input

  let amount = creator.coffeePrice

  switch (product) {
    case "beer":
      amount = creator.beerPrice
      break
    case "custom":
      amount = clampCents(Math.round((customAmount ?? 0) * 100))
      break
    case "membership":
      amount = membershipPrice ?? creator.coffeePrice
      break
    default:
      amount = creator.coffeePrice
  }

  if (product !== "custom" && amount < MIN_TIP_CENTS) {
    amount = creator.coffeePrice
  }

  return amount
}

export function formatSupporterName(name?: string | null): string {
  const trimmed = name?.trim()
  return trimmed || "Anonymous"
}

export function shouldShowOnWall(isPublic?: boolean | null): boolean {
  return isPublic !== false
}
