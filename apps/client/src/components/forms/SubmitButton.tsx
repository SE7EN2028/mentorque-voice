import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface SubmitButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  isSubmitting: boolean
  children: ReactNode
}

export function SubmitButton({ isSubmitting, children, disabled, ...rest }: SubmitButtonProps) {
  return (
    <button
      type="submit"
      disabled={isSubmitting || disabled}
      className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 px-4 py-3.5 text-[15px] font-bold text-white shadow-[0_10px_28px_-8px_rgba(110,86,248,0.55)] transition-[filter] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
      {...rest}
    >
      {isSubmitting && (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white" />
      )}
      {children}
    </button>
  )
}
