import { useEffect, type RefObject } from 'react'

/**
 * Closes a lightweight toggled disclosure (dropdown menu, popover) when the
 * user presses Escape or clicks/taps outside the referenced container.
 * Used by things like the Sidebar's user menu and the dashboard's
 * notification bell — simple open/close dropdowns that stay mounted
 * (just visually hidden) rather than true modal dialogs, so they don't
 * need the heavier focus-trap treatment `useDialogFocus` gives ConfirmDialog.
 */
export function useDismissOnEscapeOrOutside(
  isOpen: boolean,
  containerRef: RefObject<HTMLElement | null>,
  onDismiss: () => void,
) {
  useEffect(() => {
    if (!isOpen) return

    function handlePointerDown(event: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onDismiss()
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onDismiss()
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, containerRef, onDismiss])
}
