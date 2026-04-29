import type { User } from '@supabase/supabase-js'

import { getCurrentCycle } from '#/lib/cycle'
import { demoMatches, demoProfiles, demoRequests, demoReveals } from '#/lib/demo-data'
import { supabase } from '#/lib/supabase'
import type {
  FriendshipRequest,
  MatchRecord,
  Profile,
  ProfileReveal,
} from '#/lib/types'

export async function getSignedInUser() {
  if (!supabase) {
    return null
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

export async function getMyProfile(user: User | null): Promise<Profile> {
  if (!supabase || !user) {
    return demoProfiles[0]
  }

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const selectedProfile = data as Profile | null
  if (selectedProfile != null) {
    return selectedProfile
  }

  return demoProfiles[0]
}

export async function getCompletedProfiles(myId: string): Promise<Profile[]> {
  if (!supabase) {
    return demoProfiles.filter(
      (profile) => profile.id !== myId && profile.quiz_completed,
    )
  }

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .neq('id', myId)
    .eq('quiz_completed', true)

  return data ?? []
}

export async function getProfilesByIds(ids: string[]): Promise<Profile[]> {
  const uniqueIds = [...new Set(ids)]
  if (uniqueIds.length === 0) {
    return []
  }

  if (!supabase) {
    return demoProfiles.filter((profile) => uniqueIds.includes(profile.id))
  }

  const { data } = await supabase.from('profiles').select('*').in('id', uniqueIds)
  return data ?? []
}

export async function getIncomingRequests(myId: string): Promise<FriendshipRequest[]> {
  const cycle = getCurrentCycle()
  if (!supabase) {
    return demoRequests.filter(
      (request) =>
        request.recipient_id === myId &&
        request.status === 'pending' &&
        request.cycle_year === cycle.year &&
        request.cycle_month === cycle.month,
    )
  }

  const { data } = await supabase
    .from('friendship_requests')
    .select('*')
    .eq('recipient_id', myId)
    .eq('status', 'pending')
    .eq('cycle_year', cycle.year)
    .eq('cycle_month', cycle.month)
    .order('id', { ascending: false })

  return data ?? []
}

export async function getCycleMatchesForUser(myId: string): Promise<MatchRecord[]> {
  const cycle = getCurrentCycle()
  if (!supabase) {
    return demoMatches.filter(
      (match) =>
        (match.user_a === myId || match.user_b === myId) &&
        match.cycle_year === cycle.year &&
        match.cycle_month === cycle.month,
    )
  }

  const { data } = await supabase
    .from('matches')
    .select('*')
    .eq('cycle_year', cycle.year)
    .eq('cycle_month', cycle.month)
    .or(`user_a.eq.${myId},user_b.eq.${myId}`)

  return data ?? []
}

export async function hasRevealForPair(
  senderId: string,
  recipientId: string,
): Promise<boolean> {
  const cycle = getCurrentCycle()
  if (!supabase) {
    return demoReveals.some(
      (reveal) =>
        reveal.sender_id === senderId &&
        reveal.recipient_id === recipientId &&
        reveal.cycle_year === cycle.year &&
        reveal.cycle_month === cycle.month,
    )
  }

  const { count } = await supabase
    .from('profile_reveals')
    .select('id', { count: 'exact', head: true })
    .eq('sender_id', senderId)
    .eq('recipient_id', recipientId)
    .eq('cycle_year', cycle.year)
    .eq('cycle_month', cycle.month)

  return (count ?? 0) > 0
}

export async function updateProfile(
  profileId: string,
  patch: Partial<Profile>,
): Promise<void> {
  if (!supabase) {
    return
  }

  const { error } = await supabase.from('profiles').update(patch).eq('id', profileId)
  if (error) {
    throw error
  }
}

export async function createFriendshipRequest(input: {
  matchId: string
  senderId: string
  recipientId: string
  message: string
  revealPhoto: boolean
}): Promise<void> {
  const cycle = getCurrentCycle()
  if (!supabase) {
    return
  }

  const { error: requestError } = await supabase.from('friendship_requests').insert({
    match_id: input.matchId,
    sender_id: input.senderId,
    recipient_id: input.recipientId,
    message: input.message,
    status: 'pending',
    cycle_year: cycle.year,
    cycle_month: cycle.month,
  })
  if (requestError) {
    throw requestError
  }

  if (input.revealPhoto) {
    const { error: revealError } = await supabase.from('profile_reveals').insert({
      sender_id: input.senderId,
      recipient_id: input.recipientId,
      cycle_year: cycle.year,
      cycle_month: cycle.month,
    } satisfies Omit<ProfileReveal, 'id'>)
    if (revealError) {
      throw revealError
    }
  }
}

export async function upsertCycleMatch(input: MatchRecord): Promise<void> {
  if (!supabase) {
    return
  }

  const { error } = await supabase.from('matches').upsert(input, {
    onConflict: 'user_a,user_b,cycle_year,cycle_month',
    ignoreDuplicates: true,
  })
  if (error) {
    throw error
  }
}

export async function setRequestStatus(
  requestId: string,
  status: FriendshipRequest['status'],
): Promise<void> {
  if (!supabase) {
    return
  }
  const { error } = await supabase
    .from('friendship_requests')
    .update({ status })
    .eq('id', requestId)
  if (error) {
    throw error
  }
}

export async function markPaidForCurrentCycle(profileId: string): Promise<void> {
  if (!supabase) {
    return
  }

  const { error } = await supabase
    .from('profiles')
    .update({ has_paid_current_cycle: true })
    .eq('id', profileId)
  if (error) {
    throw error
  }
}
