import type { FriendshipRequest, MatchRecord, Profile, ProfileReveal } from '#/lib/types'

export const demoProfiles: Profile[] = [
  {
    id: 'demo-user',
    display_name: 'You',
    bio: 'Looking for low-pressure monthly catch-ups over coffee and walks.',
    city: 'London',
    avatar_url:
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=256&q=80',
    category: 'A',
    mbti_type: 'ENFP',
    mbti_ei: 78,
    mbti_sn: 65,
    mbti_tf: 44,
    mbti_jp: 33,
    quiz_completed: true,
    has_paid_current_cycle: false,
  },
  {
    id: 'u-1',
    display_name: 'Maya',
    bio: 'Bookstores, museum evenings, and trying a new bakery each month.',
    city: 'Bristol',
    avatar_url:
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=256&q=80',
    category: 'B',
    mbti_type: 'INFJ',
    mbti_ei: 43,
    mbti_sn: 68,
    mbti_tf: 40,
    mbti_jp: 62,
    quiz_completed: true,
    has_paid_current_cycle: true,
  },
  {
    id: 'u-2',
    display_name: 'Tom',
    bio: 'Cycling, indie films, and weekend brunch recommendations.',
    city: 'Manchester',
    avatar_url:
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80',
    category: 'A',
    mbti_type: 'INTJ',
    mbti_ei: 36,
    mbti_sn: 74,
    mbti_tf: 70,
    mbti_jp: 77,
    quiz_completed: true,
    has_paid_current_cycle: false,
  },
  {
    id: 'u-3',
    display_name: 'Amara',
    bio: 'Love pottery classes, playlists, and spontaneous dinner plans.',
    city: 'Leeds',
    avatar_url:
      'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=256&q=80',
    category: 'B',
    mbti_type: 'ENFJ',
    mbti_ei: 70,
    mbti_sn: 60,
    mbti_tf: 36,
    mbti_jp: 61,
    quiz_completed: true,
    has_paid_current_cycle: false,
  },
  {
    id: 'u-4',
    display_name: 'Rosa',
    bio: 'Morning runs, sketching cafes, and weekly farmer-market rituals.',
    city: 'Glasgow',
    avatar_url:
      'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=256&q=80',
    category: 'A',
    mbti_type: 'INFP',
    mbti_ei: 35,
    mbti_sn: 59,
    mbti_tf: 33,
    mbti_jp: 38,
    quiz_completed: true,
    has_paid_current_cycle: true,
  },
  {
    id: 'u-5',
    display_name: 'Ibrahim',
    bio: 'Tech chats, co-working sessions, and occasional football.',
    city: 'Birmingham',
    avatar_url:
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=256&q=80',
    category: 'B',
    mbti_type: 'ENTP',
    mbti_ei: 75,
    mbti_sn: 71,
    mbti_tf: 66,
    mbti_jp: 40,
    quiz_completed: true,
    has_paid_current_cycle: false,
  },
  {
    id: 'u-6',
    display_name: 'Aiko',
    bio: 'Tea ceremonies, photography walks, and thoughtful conversations.',
    city: 'Edinburgh',
    avatar_url:
      'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=256&q=80',
    category: 'A',
    mbti_type: 'ISFJ',
    mbti_ei: 28,
    mbti_sn: 42,
    mbti_tf: 35,
    mbti_jp: 74,
    quiz_completed: true,
    has_paid_current_cycle: false,
  },
  {
    id: 'u-7',
    display_name: 'Luca',
    bio: 'Trying new recipes and exploring hidden parks every weekend.',
    city: 'Liverpool',
    avatar_url:
      'https://images.unsplash.com/photo-1504593811423-6dd665756598?auto=format&fit=crop&w=256&q=80',
    category: 'B',
    mbti_type: 'ESFP',
    mbti_ei: 82,
    mbti_sn: 31,
    mbti_tf: 38,
    mbti_jp: 26,
    quiz_completed: true,
    has_paid_current_cycle: true,
  },
  {
    id: 'u-8',
    display_name: 'Hannah',
    bio: 'Board games, mellow live music, and city break planning.',
    city: 'Cardiff',
    avatar_url:
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=256&q=80',
    category: 'A',
    mbti_type: 'ISTP',
    mbti_ei: 34,
    mbti_sn: 37,
    mbti_tf: 76,
    mbti_jp: 35,
    quiz_completed: true,
    has_paid_current_cycle: false,
  },
]

export const demoMatches: MatchRecord[] = [
  {
    id: 'match-1',
    user_a: 'demo-user',
    user_b: 'u-1',
    compatibility_score: 93,
    cycle_year: 2026,
    cycle_month: 4,
  },
]

export const demoRequests: FriendshipRequest[] = [
  {
    id: 'request-1',
    match_id: 'match-1',
    sender_id: 'u-1',
    recipient_id: 'demo-user',
    message:
      'You seem lovely. Fancy a coffee + walk this weekend if our schedules align?',
    status: 'pending',
    cycle_year: 2026,
    cycle_month: 4,
  },
]

export const demoReveals: ProfileReveal[] = [
  {
    id: 'reveal-1',
    sender_id: 'u-1',
    recipient_id: 'demo-user',
    cycle_year: 2026,
    cycle_month: 4,
  },
]

