import { createClient } from '@supabase/supabase-js'

import type {
  FriendshipRequest,
  MatchRecord,
  Profile,
  ProfileReveal,
} from '#/lib/types'

export interface TandemDatabase {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Partial<Profile> & { id: string; category: 'A' | 'B' }
        Update: Partial<Profile>
      }
      matches: {
        Row: MatchRecord
        Insert: Omit<MatchRecord, 'id'>
        Update: Partial<Omit<MatchRecord, 'id'>>
      }
      friendship_requests: {
        Row: FriendshipRequest
        Insert: Omit<FriendshipRequest, 'id'>
        Update: Partial<Omit<FriendshipRequest, 'id'>>
      }
      profile_reveals: {
        Row: ProfileReveal
        Insert: Omit<ProfileReveal, 'id'>
        Update: Partial<Omit<ProfileReveal, 'id'>>
      }
    }
  }
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as
  | string
  | undefined

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

export const supabase = isSupabaseConfigured
  ? createClient<TandemDatabase>(supabaseUrl!, supabaseAnonKey!)
  : null
