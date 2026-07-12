import { clampCents, MIN_TIP_CENTS } from "./money.js"
import type { SupportProduct } from "../types/index.js"

export type { SupportProduct }

export type CreatorPrices = {
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

  let amount = creator.beerPrice

  switch (product) {
    case "beer":
      amount = creator.beerPrice
      break
    case "custom":
      amount = clampCents(Math.round((customAmount ?? 0) * 100))
      break
    case "membership":
    case "shop":
      amount = membershipPrice ?? creator.beerPrice
      break
    default:
      amount = creator.beerPrice
  }

  if (product !== "custom" && amount < MIN_TIP_CENTS) {
    amount = creator.beerPrice
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
