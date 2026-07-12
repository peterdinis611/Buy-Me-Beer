import { buildLeaderboard, supporterKey } from "../leaderboard.js"

describe("buildLeaderboard", () => {
  it("ranks supporters by total amount", () => {
    const board = buildLeaderboard([
      { supporterName: "Anna", supporterEmail: "anna@example.com", amount: 500 },
      { supporterName: "Bob", amount: 1500 },
      { supporterName: "Anna", supporterEmail: "anna@example.com", amount: 800 },
    ])

    expect(board[0]!.name).toBe("Bob")
    expect(board[0]!.badge).toBe("🥇")
    expect(board[1]!.name).toBe("Anna")
    expect(board[1]!.total).toBe(1300)
    expect(board[1]!.badge).toBe("🥈")
  })

  it("deduplicates by email when available", () => {
    expect(supporterKey("Anna", "anna@example.com")).toBe("email:anna@example.com")
    expect(supporterKey("Anna")).toBe("name:anna")
  })
})
