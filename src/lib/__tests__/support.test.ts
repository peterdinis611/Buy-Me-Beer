import { describe, expect, it } from "@jest/globals"
import { resolveSupportAmount } from "../support.js"

const creator = { beerPrice: 800 }

describe("resolveSupportAmount", () => {
  it("returns beer price for beer product", () => {
    expect(resolveSupportAmount({ product: "beer", creator })).toBe(800)
  })

  it("returns custom amount in cents", () => {
    expect(resolveSupportAmount({ product: "custom", creator, customAmount: 12.5 })).toBe(1250)
  })

  it("clamps custom zero to minimum cents without beer fallback", () => {
    expect(resolveSupportAmount({ product: "custom", creator, customAmount: 0 })).toBe(100)
  })

  it("uses membership price when provided", () => {
    expect(resolveSupportAmount({ product: "membership", creator, membershipPrice: 1500 })).toBe(1500)
  })

  it("falls back to beer price for preset products", () => {
    expect(resolveSupportAmount({ product: "shop", creator, membershipPrice: undefined })).toBe(800)
  })
})
