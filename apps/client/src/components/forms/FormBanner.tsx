interface FormBannerProps {
  variant: 'error' | 'success'
  message: string
}

export function FormBanner({ variant, message }: FormBannerProps) {
  const styles =
    variant === 'error'
      ? 'border-red-400/25 bg-red-400/[0.06] text-[#fb7185]'
      : 'border-emerald-400/25 bg-emerald-400/[0.06] text-[#34d399]'
  return (
    <div
      className={`flex items-center gap-2 rounded-[11px] border px-3.5 py-2.5 text-[13px] ${styles}`}
      role="status"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="shrink-0"
      >
        {variant === 'error' ? (
          <>
            <circle cx="12" cy="12" r="9" />
            <line x1="12" y1="8" x2="12" y2="13" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </>
        ) : (
          <polyline points="20 6 9 17 4 12" />
        )}
      </svg>
      {message}
    </div>
  )
}
