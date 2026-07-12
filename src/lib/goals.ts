export function calculateGoalProgress(totalCents: number, goalAmountCents: number): number {
  if (goalAmountCents <= 0) return 0
  return Math.min(100, (totalCents / goalAmountCents) * 100)
}

export function isGoalReached(totalCents: number, goalAmountCents: number): boolean {
  return goalAmountCents > 0 && totalCents >= goalAmountCents
}

export function remainingToGoal(totalCents: number, goalAmountCents: number): number {
  if (goalAmountCents <= 0) return 0
  return Math.max(0, goalAmountCents - totalCents)
}
