import { aggregateSupportStats, filterPublicMessages } from "../stats.js"

describe("aggregateSupportStats", () => {
  const supports = [
    { amount: 500, product: "coffee" as const },
    { amount: 800, product: "beer" as const },
    { amount: 1500, product: "membership" as const },
    { amount: 1000, product: "custom" as const },
  ]

  it("sums totals and counts by product", () => {
    const stats = aggregateSupportStats(supports)

    expect(stats.total).toBe(3800)
    expect(stats.count).toBe(4)
    expect(stats.beerCount).toBe(2)
    expect(stats.membershipCount).toBe(1)
    expect(stats.customCount).toBe(1)
  })

  it("calculates average tip", () => {
    expect(aggregateSupportStats(supports).averageTip).toBe(950)
  })

  it("handles empty list", () => {
    const stats = aggregateSupportStats([])

    expect(stats.total).toBe(0)
    expect(stats.count).toBe(0)
    expect(stats.averageTip).toBe(0)
  })
})

describe("filterPublicMessages", () => {
  const supports = [
    { amount: 500, product: "beer" as const, message: "Great work!", isPublic: true },
    { amount: 800, product: "beer" as const, message: "", isPublic: true },
    { amount: 500, product: "beer" as const, message: "Hidden", isPublic: false },
    { amount: 500, product: "beer" as const, message: "Thanks!", isPublic: true },
  ]

  it("returns only public messages with text", () => {
    const result = filterPublicMessages(supports)

    expect(result).toHaveLength(2)
    expect(result[0]!.message).toBe("Great work!")
    expect(result[1]!.message).toBe("Thanks!")
  })

  it("respects limit", () => {
    const many = Array.from({ length: 20 }, (_, i) => ({
      amount: 500,
      product: "beer" as const,
      message: `msg ${i}`,
      isPublic: true,
    }))

    expect(filterPublicMessages(many, 5)).toHaveLength(5)
  })
})
