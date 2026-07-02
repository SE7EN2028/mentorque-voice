import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  subtitle?: string
  children?: ReactNode
}

export function PageHeader({ title, subtitle, children }: PageHeaderProps) {
  return (
    <header className="sticky top-0 z-20 flex h-20 items-center justify-between gap-4 border-b border-hairline bg-canvas/72 px-5 backdrop-blur-md sm:px-10">
      <div className="min-w-0">
        <div className="truncate font-display text-[21px] font-bold text-[#f9f9fc]">{title}</div>
        {subtitle && <div className="mt-0.5 truncate text-[13px] text-[#8b8ea0]">{subtitle}</div>}
      </div>
      {children && <div className="flex shrink-0 items-center gap-4.5">{children}</div>}
    </header>
  )
}
