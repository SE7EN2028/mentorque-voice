import { useEffect, useRef } from 'react'

/**
 * Shared a11y wiring for modal dialogs that are mounted only while open
 * (i.e. the caller renders `{open && <Dialog ... />}` rather than toggling
 * a `hidden` prop on an always-mounted element). On mount: remembers
 * whatever element had focus and moves focus onto the element referenced
 * by the returned ref (attach it to the dialog's default/cancel button, or
 * whatever should receive focus first). While mounted: pressing Escape
 * calls `onClose`. On unmount: focus returns to the original trigger
 * element, so keyboard users land back where they started.
 */
export function useDialogFocus<T extends HTMLElement>(onClose: () => void) {
  const initialFocusRef = useRef<T>(null)
  const triggerRef = useRef<Element | null>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    triggerRef.current = document.activeElement
    initialFocusRef.current?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current()
      }
    }
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      if (triggerRef.current instanceof HTMLElement) {
        triggerRef.current.focus()
      }
    }
    // Mount/unmount is the right lifecycle for this wiring — these dialogs
    // are mounted exactly while open, so re-running on every render would
    // needlessly refocus and rebind the listener.
  }, [])

  return initialFocusRef
}
