import {
  firstValidationError,
  loginSchema,
  parseFormBoolean,
  profileSettingsSchema,
  signupSchema,
  supportSchema,
  tierSettingsSchema,
} from "../validation.js"

describe("signupSchema", () => {
  it("accepts valid signup data", () => {
    const result = signupSchema.safeParse({
      email: "user@example.com",
      password: "password123",
      displayName: "Peter",
      handle: "peter",
    })

    expect(result.success).toBe(true)
  })

  it("rejects short password", () => {
    const result = signupSchema.safeParse({
      email: "user@example.com",
      password: "short",
      displayName: "Peter",
      handle: "peter",
    })

    expect(result.success).toBe(false)
  })
})

describe("loginSchema", () => {
  it("requires valid email", () => {
    expect(loginSchema.safeParse({ email: "a@b.com", password: "x" }).success).toBe(true)
    expect(loginSchema.safeParse({ email: "invalid", password: "x" }).success).toBe(false)
  })
})

describe("profileSettingsSchema", () => {
  it("accepts euro price fields", () => {
    const result = profileSettingsSchema.safeParse({
      displayName: "Peter",
      handle: "peter",
      coffeeLabel: "Coffee",
      beerLabel: "Beer",
      coffeePriceEuros: 6,
      beerPriceEuros: 9,
      theme: "warm",
      goalEuros: 50,
    })

    expect(result.success).toBe(true)
  })
})

describe("supportSchema", () => {
  it("accepts coffee support", () => {
    const result = supportSchema.safeParse({ product: "coffee", name: "Anna" })
    expect(result.success).toBe(true)
  })

  it("parses isPublic false from form string", () => {
    const result = supportSchema.safeParse({ product: "coffee", isPublic: "false" })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.isPublic).toBe(false)
  })

  it("requires custom amount for custom product", () => {
    const result = supportSchema.safeParse({ product: "custom" })
    expect(result.success).toBe(false)
  })

  it("rejects custom amount below minimum", () => {
    const result = supportSchema.safeParse({ product: "custom", customAmount: 0.5 })
    expect(result.success).toBe(false)
  })
})

describe("tierSettingsSchema", () => {
  it("validates tier in euros", () => {
    const result = tierSettingsSchema.safeParse({ name: "Supporter", priceEuros: 5 })
    expect(result.success).toBe(true)
  })
})

describe("parseFormBoolean", () => {
  it("parses common form values", () => {
    expect(parseFormBoolean("true")).toBe(true)
    expect(parseFormBoolean("false")).toBe(false)
    expect(parseFormBoolean("on")).toBe(true)
  })
})

describe("firstValidationError", () => {
  it("returns first zod issue message", () => {
    const result = loginSchema.safeParse({ email: "bad", password: "" })
    if (result.success) throw new Error("expected failure")

    expect(firstValidationError(result)).toBeTruthy()
  })
})
