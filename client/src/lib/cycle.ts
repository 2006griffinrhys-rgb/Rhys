export type Category = 'A' | 'B'

export interface Cycle {
  year: number
  month: number
  cycleKey: number
}

export function getCurrentCycle(now = new Date()): Cycle {
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  return {
    year,
    month,
    cycleKey: year * 100 + month,
  }
}

export function getActiveCategory(month: number): Category {
  return month % 2 === 1 ? 'A' : 'B'
}

export function getPayingCategory(month: number): Category {
  return getActiveCategory(month) === 'A' ? 'B' : 'A'
}

export function canInstigate(category: Category, month: number): boolean {
  return category === getActiveCategory(month)
}

export function getPayingUserIdForSameSidePair(
  idA: string,
  idB: string,
  month: number,
): string {
  const [first, second] = [idA, idB].sort((left, right) =>
    left.localeCompare(right),
  )
  const seed = `${first}:${second}:${month}`

  let hash = 0
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0
  }

  return hash % 2 === 0 ? first : second
}

export function monthName(month: number): string {
  return new Date(2026, month - 1, 1).toLocaleString('en-GB', {
    month: 'long',
  })
}

export function daysLeftInMonth(now = new Date()): number {
  const year = now.getFullYear()
  const month = now.getMonth()
  const nextMonthStart = new Date(year, month + 1, 1)
  const today = new Date(year, month, now.getDate(), 0, 0, 0, 0)
  const diffMs = nextMonthStart.getTime() - today.getTime()

  return Math.max(0, Math.ceil(diffMs / 86_400_000) - 1)
}
