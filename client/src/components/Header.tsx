import { Link } from '@tanstack/react-router'

import { APP_NAME } from '#/lib/constants'

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/90">
      <nav className="page-shell flex items-center justify-between py-4">
        <Link
          to="/"
          className="inline-flex items-center gap-2 no-underline"
          activeProps={{
            className: 'inline-flex items-center gap-2 no-underline',
          }}
        >
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--cat-a)] text-white">
            <span className="h-3.5 w-3.5 rounded-full bg-background/90" />
          </span>
          <span className="font-heading text-3xl font-semibold leading-none text-foreground">
            {APP_NAME}
          </span>
        </Link>

        <div className="flex items-center gap-3 text-sm font-medium">
          <Link
            to="/auth"
            className="text-foreground/80 no-underline transition-colors hover:text-foreground"
            activeProps={{ className: 'text-foreground no-underline' }}
          >
            Sign in
          </Link>
          <Link
            to="/onboarding"
            className="rounded-xl bg-foreground px-4 py-2 text-background no-underline transition-opacity hover:opacity-90"
            activeProps={{
              className:
                'rounded-xl bg-foreground px-4 py-2 text-background no-underline',
            }}
          >
            Begin
          </Link>
        </div>
      </nav>
    </header>
  )
}
