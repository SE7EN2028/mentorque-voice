import { forwardRef, type InputHTMLAttributes } from 'react'

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, error, id, name, className, ...inputProps },
  ref,
) {
  const fieldId = id ?? name
  return (
    <div className="flex flex-col gap-1.5 text-left">
      <label htmlFor={fieldId} className="text-[13px] font-semibold text-[#c7c9d6]">
        {label}
      </label>
      <input
        ref={ref}
        id={fieldId}
        name={name}
        aria-invalid={Boolean(error)}
        className={`rounded-[11px] border bg-white/[0.03] px-4 py-3 text-[14.5px] text-ink outline-none transition-colors focus:border-violet-500 focus:ring-4 focus:ring-violet-500/15 ${
          error ? 'border-red-400/60' : 'border-white/10'
        } ${className ?? ''}`}
        {...inputProps}
      />
      {error && (
        <p className="flex items-center gap-1.5 text-[13px] text-[#fb7185]" role="alert">
          {error}
        </p>
      )}
    </div>
  )
})
