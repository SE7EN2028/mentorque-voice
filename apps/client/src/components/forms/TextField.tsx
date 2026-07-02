import { forwardRef, type InputHTMLAttributes } from 'react'

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, error, id, name, ...inputProps },
  ref,
) {
  const fieldId = id ?? name
  return (
    <div className="flex flex-col gap-1.5 text-left">
      <label htmlFor={fieldId} className="text-sm font-medium text-slate-300">
        {label}
      </label>
      <input
        ref={ref}
        id={fieldId}
        name={name}
        aria-invalid={Boolean(error)}
        className={`rounded-md border bg-slate-900 px-3 py-2 text-slate-100 outline-none transition-colors focus:border-indigo-500 ${
          error ? 'border-red-500' : 'border-slate-700'
        }`}
        {...inputProps}
      />
      {error && (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  )
})
