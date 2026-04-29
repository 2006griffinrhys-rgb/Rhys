import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'

import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { aggregateQuizAnswers } from '#/lib/mbti'
import { quizQuestions } from '#/lib/quiz'

export interface QuizSubmission {
  mbtiType: string
  ei: number
  sn: number
  tf: number
  jp: number
}

interface QuizFormProps {
  onSubmit: (submission: QuizSubmission) => Promise<void> | void
  submitLabel?: string
  isSubmitting?: boolean
}

export default function QuizForm({
  onSubmit,
  submitLabel = 'Save my MBTI results',
  isSubmitting = false,
}: QuizFormProps) {
  const [answers, setAnswers] = useState<Record<string, number>>(() =>
    Object.fromEntries(quizQuestions.map((question) => [question.id, 50])),
  )

  const summary = useMemo(() => {
    const quizAnswers = quizQuestions.map((question) => ({
      dimension: question.dimension,
      value: answers[question.id] ?? 50,
    }))

    return aggregateQuizAnswers(quizAnswers)
  }, [answers])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await onSubmit({
      mbtiType: summary.mbtiType,
      ei: summary.ei,
      sn: summary.sn,
      tf: summary.tf,
      jp: summary.jp,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">
            MBTI compatibility quiz <span className="text-muted-foreground">(2 min)</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {quizQuestions.map((question) => (
            <div key={question.id} className="space-y-2">
              <p className="m-0 text-base font-medium text-foreground">{question.prompt}</p>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{question.lowLabel}</span>
                <span>{question.highLabel}</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={answers[question.id] ?? 50}
                onChange={(event) =>
                  setAnswers((previous) => ({
                    ...previous,
                    [question.id]: Number(event.target.value),
                  }))
                }
                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-secondary accent-primary"
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-6">
          <div>
            <p className="m-0 text-xs tracking-[0.2em] text-muted-foreground uppercase">
              Current MBTI
            </p>
            <p className="m-0 font-heading text-4xl text-foreground">{summary.mbtiType}</p>
          </div>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : submitLabel}
          </Button>
        </CardContent>
      </Card>
    </form>
  )
}
