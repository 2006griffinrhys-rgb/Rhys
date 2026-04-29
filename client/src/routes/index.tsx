import { Link, createFileRoute } from '@tanstack/react-router'
import { ArrowRight, Sparkles } from 'lucide-react'

import { Button } from '#/components/ui/button'

export const Route = createFileRoute('/')({ component: LandingPage })

function LandingPage() {
  return (
    <div className="px-4 pb-12 pt-10">
      <section className="page-shell space-y-8">
        <span className="inline-flex items-center rounded-full bg-[var(--cat-a)] px-4 py-1 text-[0.72rem] font-semibold tracking-[0.34em] text-foreground uppercase">
          <Sparkles className="mr-2 h-3.5 w-3.5" /> Give and take, by design
        </span>

        <h1 className="max-w-xl text-balance font-heading text-6xl leading-[0.9] text-foreground sm:text-7xl">
          Friendship,
          <br />
          <em>in turns.</em>
        </h1>

        <p className="max-w-3xl text-xl leading-10 text-muted-foreground">
          Friendship relies on a bit of give and take but goes downhill when one
          of you is left doing the heavy lifting. Tandem sorts the rota for you:
          one month side A gets the round in. The next, side B does. One month
          on, one month off, all year round.
        </p>

        <div className="flex flex-wrap items-center gap-4 pt-2">
          <Button
            asChild
            size="lg"
            className="rounded-full bg-primary px-8 text-base text-primary-foreground hover:bg-primary/95"
          >
            <Link to="/onboarding">
              Find my tribe <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Link
            to="/matches"
            className="inline-flex items-center border-b border-[var(--cat-a)] pb-1 text-sm font-medium tracking-[0.3em] text-foreground uppercase no-underline"
          >
            How it works
          </Link>
        </div>
      </section>
    </div>
  )
}
