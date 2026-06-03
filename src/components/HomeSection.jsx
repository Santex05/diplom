import { PAGE_CONTAINER } from '../constants/layout'

export default function HomeSection({
  title,
  subtitle,
  action,
  children,
  footer,
  className = '',
}) {
  return (
    <section className={`${PAGE_CONTAINER} home-fade-up ${className}`}>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight text-white md:text-3xl">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-1 text-xs font-medium uppercase tracking-[0.2em] text-accent/75">
              {subtitle}
            </p>
          )}
        </div>
        {action}
      </div>
      {children}
      {footer}
    </section>
  )
}
