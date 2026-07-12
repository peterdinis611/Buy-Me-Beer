import {
  firstValidationError,
  loginSchema,
  membershipTierSchema,
  profileSchema,
  signupSchema,
  supportSchema,
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

  it("rejects invalid handle characters", () => {
    const result = signupSchema.safeParse({
      email: "user@example.com",
      password: "password123",
      displayName: "Peter",
      handle: "peter!",
    })

    expect(result.success).toBe(false)
  })
})

describe("loginSchema", () => {
  it("requires email and password", () => {
    expect(loginSchema.safeParse({ email: "a@b.com", password: "x" }).success).toBe(true)
    expect(loginSchema.safeParse({ email: "invalid", password: "x" }).success).toBe(false)
  })
})

describe("profileSchema", () => {
  it("coerces price fields to numbers", () => {
    const result = profileSchema.safeParse({
      displayName: "Peter",
      handle: "peter",
      coffeeLabel: "Coffee",
      beerLabel: "Beer",
      coffeePrice: "600",
      beerPrice: "900",
      theme: "warm",
      goalAmount: "5000",
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.coffeePrice).toBe(600)
      expect(result.data.goalAmount).toBe(5000)
    }
  })
})

describe("supportSchema", () => {
  it("accepts coffee support", () => {
    const result = supportSchema.safeParse({ product: "coffee", name: "Anna" })
    expect(result.success).toBe(true)
  })

  it("accepts empty email string", () => {
    const result = supportSchema.safeParse({ product: "beer", email: "" })
    expect(result.success).toBe(true)
  })
})

describe("membershipTierSchema", () => {
  it("validates tier input", () => {
    const result = membershipTierSchema.safeParse({
      name: "Supporter",
      price: 500,
      description: "Monthly support",
    })

    expect(result.success).toBe(true)
  })

  it("rejects price below minimum", () => {
    const result = membershipTierSchema.safeParse({ name: "Supporter", price: 50 })
    expect(result.success).toBe(false)
  })
})

describe("firstValidationError", () => {
  it("returns first zod issue message", () => {
    const result = loginSchema.safeParse({ email: "bad", password: "" })
    if (result.success) throw new Error("expected failure")

    expect(firstValidationError(result)).toBeTruthy()
    expect(typeof firstValidationError(result)).toBe("string")
  })
})
