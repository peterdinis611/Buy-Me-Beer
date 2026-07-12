import {
  centsToEuros,
  clampCents,
  clampTierPrice,
  eurosToCents,
  formatMoney,
  MAX_TIP_CENTS,
  MIN_TIP_CENTS,
} from "../money.js"

describe("formatMoney", () => {
  it("formats cents as EUR currency", () => {
    expect(formatMoney(500)).toMatch(/5/)
    expect(formatMoney(500)).toMatch(/€|EUR/i)
  })

  it("handles zero", () => {
    expect(formatMoney(0)).toMatch(/0/)
  })
})

describe("eurosToCents / centsToEuros", () => {
  it("converts euros to cents", () => {
    expect(eurosToCents(5)).toBe(500)
    expect(eurosToCents(4.99)).toBe(499)
  })

  it("converts cents to euros", () => {
    expect(centsToEuros(800)).toBe(8)
  })
})

describe("clampCents", () => {
  it("clamps below minimum", () => {
    expect(clampCents(50)).toBe(MIN_TIP_CENTS)
  })

  it("clamps above maximum", () => {
    expect(clampCents(200_000)).toBe(MAX_TIP_CENTS)
  })

  it("rounds fractional cents", () => {
    expect(clampCents(505.7)).toBe(506)
  })
})

describe("clampTierPrice", () => {
  it("uses tier-specific bounds", () => {
    expect(clampTierPrice(50)).toBe(100)
    expect(clampTierPrice(60_000)).toBe(50_000)
    expect(clampTierPrice(1500)).toBe(1500)
  })
})
