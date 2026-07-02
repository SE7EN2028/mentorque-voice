import { forwardRef, type SelectHTMLAttributes } from 'react'

interface SelectOption {
  value: string
  label: string
}

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  error?: string
  options: SelectOption[]
}

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(function SelectField(
  { label, error, id, name, options, ...selectProps },
  ref,
) {
  const fieldId = id ?? name
  return (
    <div className="flex flex-col gap-1.5 text-left">
      <label htmlFor={fieldId} className="text-sm font-medium text-slate-300">
        {label}
      </label>
      <select
        ref={ref}
        id={fieldId}
        name={name}
        aria-invalid={Boolean(error)}
        className={`rounded-md border bg-slate-900 px-3 py-2 text-slate-100 outline-none transition-colors focus:border-indigo-500 ${
          error ? 'border-red-500' : 'border-slate-700'
        }`}
        {...selectProps}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  )
})
