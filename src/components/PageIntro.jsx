import { Link } from 'react-router-dom'

export default function PageIntro({
  backTo = '/',
  backLabel = 'На главную',
  title,
  subtitle,
  count,
  countLabel,
  action,
}) {
  return (
    <header className="mb-10 pt-4">
      <Link
        to={backTo}
        className="mb-6 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-text-muted transition hover:text-accent"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        {backLabel}
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-white md:text-5xl">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-2 max-w-xl text-sm text-text-muted md:text-base">{subtitle}</p>
          )}
          {count != null && countLabel && (
            <p className="mt-4 text-xs font-medium uppercase tracking-[0.16em] text-accent/80">
              {count} {countLabel}
            </p>
          )}
        </div>
        {action}
      </div>
    </header>
  )
}
