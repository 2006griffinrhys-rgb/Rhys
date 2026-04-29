import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'

import QuizForm from '#/components/quiz-form'
import { getMyProfile, getSignedInUser, updateProfile } from '#/lib/db'

export const Route = createFileRoute('/quiz')({
  component: QuizPage,
})

function QuizPage() {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const saveQuiz = async (submission: {
    mbtiType: string
    ei: number
    sn: number
    tf: number
    jp: number
  }) => {
    setIsSubmitting(true)
    try {
      const user = await getSignedInUser()
      const profile = await getMyProfile(user)
      await updateProfile(profile.id, {
        mbti_type: submission.mbtiType,
        mbti_ei: submission.ei,
        mbti_sn: submission.sn,
        mbti_tf: submission.tf,
        mbti_jp: submission.jp,
        quiz_completed: true,
      })
      toast.success('Quiz saved', {
        description: `Your MBTI type is ${submission.mbtiType}.`,
      })
    } catch (error) {
      const fallbackMessage =
        error instanceof Error
          ? error.message
          : 'We could not save your quiz right now.'
      toast.error('Unable to save quiz', { description: fallbackMessage })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="px-4 py-10">
      <section className="page-shell max-w-3xl">
        <h1 className="mb-6 text-4xl text-foreground sm:text-5xl">MBTI quiz</h1>
        <QuizForm
          onSubmit={saveQuiz}
          submitLabel="Save results"
          isSubmitting={isSubmitting}
        />
      </section>
    </div>
  )
}
