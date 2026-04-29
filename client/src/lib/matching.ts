import {
  canInstigate,
  getCurrentCycle,
  getPayingCategory,
  getPayingUserIdForSameSidePair,
} from '#/lib/cycle'
import { calculateCompatibility } from '#/lib/mbti'
import type { Profile, RankedMatch } from '#/lib/types'

export function rankProfilesForMonth(
  me: Profile,
  others: Profile[],
  maxMatches = 8,
): RankedMatch[] {
  return others
    .map((otherProfile) => ({
      otherProfile,
      compatibilityScore: calculateCompatibility(me, otherProfile),
      canSeeTheirPhoto: false,
    }))
    .sort((left, right) => right.compatibilityScore - left.compatibilityScore)
    .slice(0, maxMatches)
}

export function canInstigateThisMonth(category: Profile['category']): boolean {
  const cycle = getCurrentCycle()
  return canInstigate(category, cycle.month)
}

export function getPayingUserIdForPair(
  me: Profile,
  other: Profile,
  month: number,
): string {
  if (me.category === other.category) {
    return getPayingUserIdForSameSidePair(me.id, other.id, month)
  }

  const payingCategory = getPayingCategory(month)
  return me.category === payingCategory ? me.id : other.id
}

export function buildMatchIdForCycle(
  leftUserId: string,
  rightUserId: string,
  year: number,
  month: number,
): string {
  const [first, second] = [leftUserId, rightUserId].sort((a, b) =>
    a.localeCompare(b),
  )
  return `match-${year}-${month}-${first}-${second}`
}
