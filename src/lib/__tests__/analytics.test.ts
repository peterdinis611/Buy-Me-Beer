import { bucketRevenueByDay, maxDailyTotal, supportsToCsv } from "../analytics.js"

describe("bucketRevenueByDay", () => {
  it("groups revenue by day", () => {
    const today = new Date()
    today.setHours(12, 0, 0, 0)
    const buckets = bucketRevenueByDay([{ createdAt: today, amount: 500 }], 7)

    expect(buckets).toHaveLength(7)
    expect(buckets.at(-1)!.total).toBe(500)
    expect(maxDailyTotal(buckets)).toBe(500)
  })
})

describe("supportsToCsv", () => {
  it("exports csv rows", () => {
    const csv = supportsToCsv([
      {
        createdAt: new Date("2026-07-01T10:00:00.000Z"),
        supporterName: "Anna",
        supporterEmail: "anna@example.com",
        amount: 500,
        product: "beer",
        message: "Nice!",
        isGift: true,
        giftRecipientName: "Peter",
      },
    ])

    expect(csv.split("\n")).toHaveLength(2)
    expect(csv).toContain("Anna")
    expect(csv).toContain("yes")
    expect(csv).toContain("Peter")
  })
})
