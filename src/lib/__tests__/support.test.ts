import {
  formatSupporterName,
  resolveSupportAmount,
  shouldShowOnWall,
} from "../support.js"

const creator = { coffeePrice: 500, beerPrice: 800 }

describe("resolveSupportAmount", () => {
  it("returns coffee price by default", () => {
    expect(resolveSupportAmount({ product: "coffee", creator })).toBe(500)
  })

  it("returns beer price for beer product", () => {
    expect(resolveSupportAmount({ product: "beer", creator })).toBe(800)
  })

  it("converts custom amount from euros to cents", () => {
    expect(resolveSupportAmount({ product: "custom", creator, customAmount: 10 })).toBe(1000)
  })

  it("uses default 5 EUR for custom when amount missing", () => {
    expect(resolveSupportAmount({ product: "custom", creator })).toBe(500)
  })

  it("uses membership tier price", () => {
    expect(
      resolveSupportAmount({ product: "membership", creator, membershipPrice: 1500 })
    ).toBe(1500)
  })

  it("falls back to coffee price when amount is too low", () => {
    expect(
      resolveSupportAmount({ product: "custom", creator, customAmount: 0.5 })
    ).toBe(500)
  })
})

describe("formatSupporterName", () => {
  it("returns Anonymous for empty names", () => {
    expect(formatSupporterName()).toBe("Anonymous")
    expect(formatSupporterName("   ")).toBe("Anonymous")
  })

  it("trims whitespace", () => {
    expect(formatSupporterName("  Anna  ")).toBe("Anna")
  })
})

describe("shouldShowOnWall", () => {
  it("defaults to public", () => {
    expect(shouldShowOnWall()).toBe(true)
    expect(shouldShowOnWall(undefined)).toBe(true)
  })

  it("respects explicit false", () => {
    expect(shouldShowOnWall(false)).toBe(false)
  })
})
