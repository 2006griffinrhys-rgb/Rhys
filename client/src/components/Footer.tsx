import { APP_NAME } from '#/lib/constants'

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="mt-16 border-t border-border px-4 py-8">
      <div className="page-shell flex flex-col items-start justify-between gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center">
        <p className="m-0">&copy; {year} {APP_NAME}. Friendship in turns.</p>
        <p className="m-0 uppercase tracking-[0.2em]">Give and take, by design</p>
      </div>
    </footer>
  )
}
