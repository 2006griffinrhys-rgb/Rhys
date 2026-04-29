import { getCurrentCycle, getPayingUserIdForSameSidePair } from '#/lib/cycle'
import { getPayingUserIdForPair } from '#/lib/matching'
import type { Profile } from '#/lib/types'

export function isCurrentUserPayerForPair(
  me: Profile,
  other: Profile,
  cycleMonth = getCurrentCycle().month,
): boolean {
  if (me.category === other.category) {
    return (
      getPayingUserIdForSameSidePair(me.id, other.id, cycleMonth) === me.id
    )
  }

  return getPayingUserIdForPair(me, other, cycleMonth) === me.id
}
