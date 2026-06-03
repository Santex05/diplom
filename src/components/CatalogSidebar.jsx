export default function CatalogSidebar() {
  const items = [
    { id: 'library', label: 'Библиотека', active: true, icon: 'library' },
    { id: 'favorites', label: 'Избранное', icon: 'heart' },
    { id: 'history', label: 'История', icon: 'history' },
    { id: 'downloads', label: 'Загрузки', icon: 'download' },
  ]

  return (
    <aside className="hidden w-56 shrink-0 flex-col border-r border-white/5 bg-[#0d1018] lg:flex xl:w-64">
      <div className="border-b border-white/5 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#c4b5fd]/20 text-sm font-semibold text-[#c4b5fd]">
            П
          </div>
          <div>
            <p className="text-sm font-medium text-white">Пользователь</p>
            <p className="text-xs uppercase tracking-wider text-[#6b7280]">Local Host</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition ${
              item.active
                ? 'border-l-2 border-[#c4b5fd] bg-[#c4b5fd]/10 pl-[10px] font-medium text-white'
                : 'border-l-2 border-transparent text-[#9ca3af] hover:bg-white/5 hover:text-white'
            }`}
          >
            <SidebarIcon name={item.icon} active={item.active} />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="p-4">
        <button
          type="button"
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-[#141820] py-2.5 text-sm text-[#9ca3af] transition hover:border-white/20 hover:text-white"
        >
          <span className="text-lg leading-none">+</span>
          Добавить папку
        </button>
      </div>
    </aside>
  )
}

function SidebarIcon({ name, active }) {
  const cls = `h-5 w-5 ${active ? 'text-[#c4b5fd]' : 'text-[#6b7280]'}`
  if (name === 'heart') {
    return (
      <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
      </svg>
    )
  }
  if (name === 'history') {
    return (
      <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  }
  if (name === 'download') {
    return (
      <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
      </svg>
    )
  }
  return (
    <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6.878V6a2.25 2.25 0 012.25-2.25h7.5A2.25 2.25 0 0118 6v.878m-12 0c.235-.083.487-.128.75-.128h10.5c.263 0 .515.045.75.128m-12 0A2.25 2.25 0 004.5 9v9a2.25 2.25 0 002.25 2.25h10.5A2.25 2.25 0 0019.5 18V9a2.25 2.25 0 00-2.25-2.25m-12 0V9a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 9V6.878" />
    </svg>
  )
}
