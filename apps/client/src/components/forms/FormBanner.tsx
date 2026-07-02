interface FormBannerProps {
  variant: 'error' | 'success'
  message: string
}

export function FormBanner({ variant, message }: FormBannerProps) {
  const styles =
    variant === 'error'
      ? 'border-red-900 bg-red-950/50 text-red-300'
      : 'border-emerald-900 bg-emerald-950/50 text-emerald-300'
  return (
    <div className={`rounded-md border px-3 py-2 text-sm ${styles}`} role="status">
      {message}
    </div>
  )
}
