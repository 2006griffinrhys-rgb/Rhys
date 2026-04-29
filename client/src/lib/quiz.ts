import type { QuizAnswer } from '#/lib/mbti'

export interface QuizQuestion {
  id: string
  prompt: string
  dimension: QuizAnswer['dimension']
  lowLabel: string
  highLabel: string
}

export const quizQuestions: QuizQuestion[] = [
  {
    id: 'q1',
    prompt: 'After a long week, what recharges you most?',
    dimension: 'ei',
    lowLabel: 'Quiet solo reset',
    highLabel: 'Energy with people',
  },
  {
    id: 'q2',
    prompt: 'You usually trust...',
    dimension: 'sn',
    lowLabel: 'Proven details',
    highLabel: 'Patterns and possibilities',
  },
  {
    id: 'q3',
    prompt: 'In decisions, you lean toward...',
    dimension: 'tf',
    lowLabel: 'People impact',
    highLabel: 'Logic first',
  },
  {
    id: 'q4',
    prompt: 'Your ideal month feels...',
    dimension: 'jp',
    lowLabel: 'Open and flexible',
    highLabel: 'Planned and structured',
  },
  {
    id: 'q5',
    prompt: 'At social gatherings you tend to...',
    dimension: 'ei',
    lowLabel: 'Settle into a few deep chats',
    highLabel: 'Move around and meet many people',
  },
  {
    id: 'q6',
    prompt: 'When a friend shares a challenge, you first offer...',
    dimension: 'tf',
    lowLabel: 'Empathy and support',
    highLabel: 'Practical strategy',
  },
  {
    id: 'q7',
    prompt: 'Planning a meetup means...',
    dimension: 'jp',
    lowLabel: 'Play it by ear',
    highLabel: 'Set date, time, and location early',
  },
  {
    id: 'q8',
    prompt: 'You are more drawn to...',
    dimension: 'sn',
    lowLabel: 'Real-world specifics',
    highLabel: 'Big-picture ideas',
  },
]
