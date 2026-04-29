import { Link, createFileRoute } from '@tanstack/react-router'
import { Mail, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { toast } from 'sonner'

import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { supabase } from '#/lib/supabase'

export const Route = createFileRoute('/auth')({
  component: AuthPage,
})

function AuthPage() {
  const [email, setEmail] = useState('')
  const [loadingEmail, setLoadingEmail] = useState(false)
  const [loadingGoogle, setLoadingGoogle] = useState(false)

  const onEmailSignIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!email.trim()) {
      toast.error('Please enter your email.')
      return
    }

    if (!supabase) {
      toast.message('Supabase not configured', {
        description: 'Demo mode enabled. Add env vars to enable auth.',
      })
      return
    }

    setLoadingEmail(true)
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/onboarding`,
      },
    })
    setLoadingEmail(false)

    if (error) {
      toast.error('Could not send magic link.', { description: error.message })
      return
    }

    toast.success('Magic link sent!', {
      description: 'Check your inbox to continue onboarding.',
    })
  }

  const onGoogleSignIn = async () => {
    if (!supabase) {
      toast.message('Supabase not configured', {
        description: 'Demo mode enabled. Add env vars to enable auth.',
      })
      return
    }

    setLoadingGoogle(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/onboarding`,
      },
    })
    setLoadingGoogle(false)

    if (error) {
      toast.error('Google sign-in failed.', { description: error.message })
    }
  }

  return (
    <div className="px-4 py-10">
      <section className="page-shell grid gap-6 md:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-4xl">Sign in to Tandem</CardTitle>
            <p className="m-0 text-sm text-muted-foreground">
              Join monthly friendship matching based on MBTI compatibility.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={onEmailSignIn} className="space-y-3">
              <label className="text-sm font-medium text-foreground" htmlFor="email">
                Email
              </label>
              <div className="flex gap-2">
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
                <Button type="submit" disabled={loadingEmail}>
                  <Mail className="h-4 w-4" />
                  {loadingEmail ? 'Sending...' : 'Magic Link'}
                </Button>
              </div>
            </form>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={onGoogleSignIn}
              disabled={loadingGoogle}
            >
              {loadingGoogle ? 'Redirecting...' : 'Continue with Google'}
            </Button>

            <p className="text-xs text-muted-foreground">
              By continuing you agree to monthly cycle rules and payment gates
              for paying-side users.
            </p>
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-2xl">How it works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p className="m-0">
              <ShieldCheck className="mr-2 inline h-4 w-4 text-[var(--cat-a)]" />
              Side A and Side B alternate instigating monthly.
            </p>
            <p className="m-0">
              Paying users unlock requests for <strong>£9.99/month</strong>.
            </p>
            <p className="m-0">
              Accepting an incoming request triggers payment if this month you are
              the paying user.
            </p>
            <Link to="/onboarding" className="text-foreground no-underline underline">
              Go to onboarding →
            </Link>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
