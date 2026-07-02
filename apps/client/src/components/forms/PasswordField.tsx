import { forwardRef, useState, type InputHTMLAttributes } from 'react'

interface PasswordFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string
  error?: string
}

/** TextField's visual twin with a show/hide toggle — a plain client-side
 * input-type swap, not a new auth capability. */
export const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(
  function PasswordField({ label, error, id, name, ...inputProps }, ref) {
    const [visible, setVisible] = useState(false)
    const fieldId = id ?? name

    return (
      <div className="flex flex-col gap-1.5 text-left">
        <label htmlFor={fieldId} className="text-[13px] font-semibold text-[#c7c9d6]">
          {label}
        </label>
        <div className="relative">
          <input
            ref={ref}
            id={fieldId}
            name={name}
            type={visible ? 'text' : 'password'}
            aria-invalid={Boolean(error)}
            className={`block w-full rounded-[11px] border bg-white/[0.03] py-3 pr-11 pl-4 text-[14.5px] text-ink outline-none transition-colors focus:border-violet-500 focus:ring-4 focus:ring-violet-500/15 ${
              error ? 'border-red-400/60' : 'border-white/10'
            }`}
            {...inputProps}
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? 'Hide password' : 'Show password'}
            className="absolute top-1/2 right-1.5 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-[#6a6d7c] transition-colors hover:bg-white/5 hover:text-[#c7c9d6]"
          >
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
        </div>
        {error && (
          <p className="flex items-center gap-1.5 text-[13px] text-[#fb7185]" role="alert">
            {error}
          </p>
        )}
      </div>
    )
  },
)
