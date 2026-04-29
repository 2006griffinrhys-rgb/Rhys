import type { Profile } from '#/lib/types'

const LETTER_THRESHOLDS = {
  ei: 50,
  sn: 50,
  tf: 50,
  jp: 50,
}

const MBTI_COMPATIBILITY_MATRIX: Record<string, string[]> = {
  INTJ: ['ENFP', 'ENTP', 'INFJ'],
  INTP: ['ENTJ', 'ENFJ', 'INFJ'],
  ENTJ: ['INTP', 'INFP', 'ENFP'],
  ENTP: ['INFJ', 'INTJ', 'INFP'],
  INFJ: ['ENFP', 'ENTP', 'INTJ'],
  INFP: ['ENFJ', 'ENTJ', 'ENFP'],
  ENFJ: ['INFP', 'ISFP', 'INTP'],
  ENFP: ['INFJ', 'INTJ', 'INFP'],
  ISTJ: ['ESFP', 'ESTP', 'ISFJ'],
  ISFJ: ['ESFP', 'ESTP', 'ISTJ'],
  ESTJ: ['ISFP', 'ISTP', 'ESFJ'],
  ESFJ: ['ISFP', 'ISTP', 'ESTJ'],
  ISTP: ['ESFJ', 'ESTJ', 'ISFP'],
  ISFP: ['ENFJ', 'ESFJ', 'ESTJ'],
  ESTP: ['ISFJ', 'ISTJ', 'ESFP'],
  ESFP: ['ISFJ', 'ISTJ', 'ESTP'],
}

export interface QuizAnswer {
  dimension: 'ei' | 'sn' | 'tf' | 'jp'
  value: number
}

export function normalizeScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)))
}

export function toMbtiTypeFromScores(scores: {
  ei: number
  sn: number
  tf: number
  jp: number
}): string {
  const eiLetter = scores.ei >= LETTER_THRESHOLDS.ei ? 'E' : 'I'
  const snLetter = scores.sn >= LETTER_THRESHOLDS.sn ? 'N' : 'S'
  const tfLetter = scores.tf >= LETTER_THRESHOLDS.tf ? 'T' : 'F'
  const jpLetter = scores.jp >= LETTER_THRESHOLDS.jp ? 'J' : 'P'

  return `${eiLetter}${snLetter}${tfLetter}${jpLetter}`
}

export function aggregateQuizAnswers(answers: QuizAnswer[]) {
  const buckets: Record<QuizAnswer['dimension'], number[]> = {
    ei: [],
    sn: [],
    tf: [],
    jp: [],
  }

  answers.forEach((answer) => {
    buckets[answer.dimension].push(normalizeScore(answer.value))
  })

  const average = (values: number[]) => {
    if (values.length === 0) {
      return 50
    }
    return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
  }

  const scores = {
    ei: average(buckets.ei),
    sn: average(buckets.sn),
    tf: average(buckets.tf),
    jp: average(buckets.jp),
  }

  return {
    ...scores,
    mbtiType: toMbtiTypeFromScores(scores),
  }
}

function axisDistance(left: number | null, right: number | null): number {
  if (left == null || right == null) {
    return 50
  }

  return Math.abs(left - right)
}

export function calculateCompatibility(me: Profile, other: Profile): number {
  const distancePenalty =
    axisDistance(me.mbti_ei, other.mbti_ei) * 0.26 +
    axisDistance(me.mbti_sn, other.mbti_sn) * 0.28 +
    axisDistance(me.mbti_tf, other.mbti_tf) * 0.24 +
    axisDistance(me.mbti_jp, other.mbti_jp) * 0.22

  const meType = me.mbti_type ?? ''
  const otherType = other.mbti_type ?? ''
  const preferredMatches = MBTI_COMPATIBILITY_MATRIX[meType] ?? []
  const hasPreferredType = preferredMatches.includes(otherType)
  const mirroredPreference = (MBTI_COMPATIBILITY_MATRIX[otherType] ?? []).includes(
    meType,
  )

  const bonus = hasPreferredType ? 12 : 0
  const mirroredBonus = mirroredPreference ? 8 : 0
  const sameTypeBonus = meType !== '' && meType === otherType ? 4 : 0

  const baseScore = 100 - distancePenalty

  return Math.max(
    0,
    Math.min(100, Math.round(baseScore + bonus + mirroredBonus + sameTypeBonus)),
  )
}
