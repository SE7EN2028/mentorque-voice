import type { ReactNode } from 'react'
import { useDialogFocus } from '../hooks/useDialogFocus'

interface ConfirmDialogProps {
  icon: ReactNode
  iconBg: string
  title: string
  message: string
  confirmLabel: string
  /** 'brand' = filled violet→purple gradient (the lower-stakes confirm,
   * e.g. ending an interview you'll still get scored for). 'danger' =
   * outlined rose (the more destructive confirm, e.g. discarding a
   * session or logging out), matching the mockup's dialogs exactly. */
  confirmVariant: 'brand' | 'danger'
  /** Disables the confirm button (e.g. while an async confirm action is
   * still in flight) without affecting Cancel/Escape/backdrop dismissal. */
  confirmDisabled?: boolean
  onCancel: () => void
  onConfirm: () => void
}

/**
 * Shared shell for the app's confirm dialogs (end/leave interview, log out,
 * etc.) — a centered `bg-elevated` card over a blurred scrim, matching the
 * mockup. Handles the a11y wiring every one of these needs: Escape closes
 * it, focus moves onto the Cancel button when it opens and returns to
 * whatever triggered it when it closes, and clicking the backdrop cancels
 * just like the Cancel button.
 */
export function ConfirmDialog({
  icon,
  iconBg,
  title,
  message,
  confirmLabel,
  confirmVariant,
  confirmDisabled = false,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  const cancelButtonRef = useDialogFocus<HTMLButtonElement>(onCancel)

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      className="fixed inset-0 z-[200] flex items-center justify-center bg-[#050508]/75 p-10 backdrop-blur-md"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-105 rounded-[18px] border border-white/10 bg-elevated p-7 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.7)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={`mb-4.5 flex h-11 w-11 items-center justify-center rounded-xl ${iconBg}`}>
          {icon}
        </div>
        <h2
          id="confirm-dialog-title"
          className="mb-2 font-display text-lg font-bold text-[#F9F9FC]"
        >
          {title}
        </h2>
        <p className="mb-6 text-sm leading-relaxed text-ink-dim">{message}</p>
        <div className="flex gap-2.5">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-[11px] border border-white/14 bg-white/4 px-3 py-3 text-sm font-semibold text-ink transition-colors hover:bg-white/8"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={confirmDisabled}
            className={
              confirmVariant === 'brand'
                ? 'flex-1 rounded-[11px] bg-gradient-to-br from-violet-500 to-purple-500 px-3 py-3 text-sm font-bold text-white shadow-[0_8px_22px_-6px_rgba(110,86,248,0.5)] transition-[filter] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60'
                : 'flex-1 rounded-[11px] border-[1.5px] border-rose-400 bg-rose-400/15 px-3 py-3 text-sm font-bold text-rose-400 transition-colors hover:bg-rose-400/25 disabled:cursor-not-allowed disabled:opacity-60'
            }
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
