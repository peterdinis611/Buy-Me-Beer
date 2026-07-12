import { calculateGoalProgress, isGoalReached, remainingToGoal } from "../goals.js"

describe("calculateGoalProgress", () => {
  it("returns 0 when no goal is set", () => {
    expect(calculateGoalProgress(5000, 0)).toBe(0)
  })

  it("calculates percentage progress", () => {
    expect(calculateGoalProgress(2500, 10000)).toBe(25)
  })

  it("caps at 100%", () => {
    expect(calculateGoalProgress(15000, 10000)).toBe(100)
  })
})

describe("isGoalReached", () => {
  it("returns false without a goal", () => {
    expect(isGoalReached(5000, 0)).toBe(false)
  })

  it("returns true when total meets goal", () => {
    expect(isGoalReached(10000, 10000)).toBe(true)
    expect(isGoalReached(12000, 10000)).toBe(true)
  })

  it("returns false when below goal", () => {
    expect(isGoalReached(9999, 10000)).toBe(false)
  })
})

describe("remainingToGoal", () => {
  it("returns remaining cents to goal", () => {
    expect(remainingToGoal(3000, 10000)).toBe(7000)
  })

  it("returns 0 when goal exceeded", () => {
    expect(remainingToGoal(15000, 10000)).toBe(0)
  })

  it("returns 0 when no goal", () => {
    expect(remainingToGoal(5000, 0)).toBe(0)
  })
})
