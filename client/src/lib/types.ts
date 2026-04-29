import type { Category } from '#/lib/cycle'

export interface Profile {
  id: string
  display_name: string
  bio: string
  city: string
  avatar_url: string | null
  category: Category
  mbti_type: string | null
  mbti_ei: number | null
  mbti_sn: number | null
  mbti_tf: number | null
  mbti_jp: number | null
  quiz_completed: boolean
  has_paid_current_cycle: boolean
}

export interface MatchRecord {
  id: string
  user_a: string
  user_b: string
  compatibility_score: number
  cycle_year: number
  cycle_month: number
}

export type FriendshipRequestStatus = 'pending' | 'accepted' | 'declined'

export interface FriendshipRequest {
  id: string
  match_id: string
  sender_id: string
  recipient_id: string
  message: string
  status: FriendshipRequestStatus
  cycle_year: number
  cycle_month: number
}

export interface ProfileReveal {
  id: string
  sender_id: string
  recipient_id: string
  cycle_year: number
  cycle_month: number
}

export interface RankedMatch {
  otherProfile: Profile
  compatibilityScore: number
  canSeeTheirPhoto: boolean
}
