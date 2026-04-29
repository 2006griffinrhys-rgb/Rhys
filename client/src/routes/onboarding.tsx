import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { ArrowRight, CheckCircle2, Wallet } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import QuizForm, { type QuizSubmission } from '#/components/quiz-form'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Textarea } from '#/components/ui/textarea'
import { MONTHLY_PRICE_GBP } from '#/lib/constants'
import { getMyProfile, getSignedInUser, markPaidForCurrentCycle, updateProfile } from '#/lib/db'
import type { Profile } from '#/lib/types'

export const Route = createFileRoute('/onboarding')({
  component: OnboardingPage,
})

type OnboardingStep = 0 | 1 | 2 | 3

function OnboardingPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<OnboardingStep>(0)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  const next = () => setStep((current) => Math.min(3, current + 1) as OnboardingStep)

  const getOrLoadProfile = async () => {
    if (profile) {
      return profile
    }

    const user = await getSignedInUser()
    const loaded = await getMyProfile(user)
    setProfile(loaded)
    return loaded
  }

  const completeSignup = async () => {
    setLoading(true)
    try {
      if (!email.trim()) {
        toast.error('Please add your email first.')
        return
      }

      await getOrLoadProfile()
      next()
      toast.success('Account step complete')
    } finally {
      setLoading(false)
    }
  }

  const saveQuiz = async (submission: QuizSubmission) => {
    setLoading(true)
    try {
      const currentProfile = await getOrLoadProfile()
      await updateProfile(currentProfile.id, {
        mbti_type: submission.mbtiType,
        mbti_ei: submission.ei,
        mbti_sn: submission.sn,
        mbti_tf: submission.tf,
        mbti_jp: submission.jp,
        quiz_completed: true,
      })

      setProfile((current) =>
        current
          ? {
              ...current,
              mbti_type: submission.mbtiType,
              mbti_ei: submission.ei,
              mbti_sn: submission.sn,
              mbti_tf: submission.tf,
              mbti_jp: submission.jp,
              quiz_completed: true,
            }
          : current,
      )

      next()
      toast.success(`MBTI saved as ${submission.mbtiType}`)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to save your quiz right now.'
      toast.error('Quiz not saved', { description: message })
    } finally {
      setLoading(false)
    }
  }

  const saveProfileAndContinue = async () => {
    if (!profile) {
      return
    }

    setLoading(true)
    try {
      await updateProfile(profile.id, {
        display_name: profile.display_name,
        bio: profile.bio,
        city: profile.city,
        avatar_url: profile.avatar_url,
      })
      next()
      toast.success('Profile complete')
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to save your profile right now.'
      toast.error('Profile not saved', { description: message })
    } finally {
      setLoading(false)
    }
  }

  const payNow = async () => {
    if (!profile) {
      return
    }
    setLoading(true)
    try {
      await markPaidForCurrentCycle(profile.id)
      setProfile((current) =>
        current ? { ...current, has_paid_current_cycle: true } : current,
      )
      toast.success(`Unlocked for £${MONTHLY_PRICE_GBP.toFixed(2)} this cycle`)
      await navigate({ to: '/matches' })
    } finally {
      setLoading(false)
    }
  }

  const stepLabel = useMemo(() => {
    return ['Signup', 'MBTI quiz', 'Profile', 'Soft pay prompt'][step]
  }, [step])

  return (
    <div className="px-4 py-10">
      <section className="page-shell max-w-4xl space-y-6">
        <div className="space-y-1">
          <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">Onboarding</p>
          <h1 className="text-4xl text-foreground sm:text-5xl">Step {step + 1}: {stepLabel}</h1>
        </div>

        <div className="grid gap-2 sm:grid-cols-4">
          {[0, 1, 2, 3].map((index) => (
            <div
              key={index}
              className={[
                'h-2 rounded-full',
                index <= step ? 'bg-primary' : 'bg-secondary',
              ].join(' ')}
            />
          ))}
        </div>

        {step === 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Create your account</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="onboarding-email">Email</Label>
                <Input
                  id="onboarding-email"
                  placeholder="you@example.com"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
              <Button onClick={completeSignup} disabled={loading}>
                {loading ? 'Saving...' : 'Continue'}
                <ArrowRight className="h-4 w-4" />
              </Button>
              <p className="m-0 text-xs text-muted-foreground">
                Prefer passwordless or Google? You can also sign in on the{' '}
                <Link to="/auth">auth page</Link>.
              </p>
            </CardContent>
          </Card>
        )}

        {step === 1 && (
          <QuizForm onSubmit={saveQuiz} submitLabel="Save and continue" isSubmitting={loading} />
        )}

        {step === 2 && profile && (
          <Card>
            <CardHeader>
              <CardTitle>Set up your public profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="display-name">Display name</Label>
                <Input
                  id="display-name"
                  value={profile.display_name}
                  onChange={(event) =>
                    setProfile((current) =>
                      current
                        ? {
                            ...current,
                            display_name: event.target.value,
                          }
                        : current,
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={profile.city}
                  onChange={(event) =>
                    setProfile((current) =>
                      current ? { ...current, city: event.target.value } : current,
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="avatar-url">Avatar URL</Label>
                <Input
                  id="avatar-url"
                  value={profile.avatar_url ?? ''}
                  onChange={(event) =>
                    setProfile((current) =>
                      current
                        ? {
                            ...current,
                            avatar_url: event.target.value || null,
                          }
                        : current,
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">Short bio</Label>
                <Textarea
                  id="bio"
                  rows={4}
                  value={profile.bio}
                  onChange={(event) =>
                    setProfile((current) =>
                      current ? { ...current, bio: event.target.value } : current,
                    )
                  }
                />
              </div>
              <Button onClick={saveProfileAndContinue} disabled={loading}>
                {loading ? 'Saving...' : 'Save profile and continue'}
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 3 && profile && (
          <Card>
            <CardHeader>
              <CardTitle>Optional: unlock this month now</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="m-0 text-sm text-muted-foreground">
                You can skip this and only pay when needed. If you are the paying
                user for a request this cycle, accepting it will require payment.
              </p>
              <div className="rounded-xl border border-border bg-secondary/60 p-4">
                <p className="m-0 text-sm">
                  <Wallet className="mr-2 inline h-4 w-4 text-[var(--cat-a)]" />
                  <strong>£{MONTHLY_PRICE_GBP.toFixed(2)}/month</strong>
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button onClick={payNow} disabled={loading}>
                  {loading ? 'Processing...' : 'Pay £9.99 now'}
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/matches">
                    Skip for now
                    <CheckCircle2 className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  )
}
