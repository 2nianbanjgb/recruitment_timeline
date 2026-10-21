import { useEffect, useRef, type ReactNode } from 'react'
import { btnPrimary, btnSecondary } from './ui'

export interface ConfirmDialogProps {
  open: boolean
  title: string
  description?: ReactNode
  confirmLabel: string
  cancelLabel?: string
  tone?: 'default' | 'danger'
  secondaryLabel?: string
  onConfirm: () => void
  onSecondary?: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = '取消',
  tone = 'default',
  secondaryLabel,
  onConfirm,
  onSecondary,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="confirm-title"
      onCancel={event => {
        event.preventDefault()
        onCancel()
      }}
      className="text-ink"
    >
      <div className="animate-pop w-[min(92vw,440px)] rounded-2xl border border-line bg-panel p-5 shadow-2xl">
        <h2 id="confirm-title" className="text-base font-semibold text-ink">
          {title}
        </h2>
        {description ? <div className="mt-2 text-sm leading-relaxed text-ink-muted">{description}</div> : null}
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button type="button" className={btnSecondary} onClick={onCancel}>
            {cancelLabel}
          </button>
          {secondaryLabel && onSecondary ? (
            <button type="button" className={btnSecondary} onClick={onSecondary}>
              {secondaryLabel}
            </button>
          ) : null}
          <button
            type="button"
            onClick={onConfirm}
            className={
              tone === 'danger'
                ? 'inline-flex items-center justify-center rounded-xl bg-danger px-3.5 py-2 text-sm font-medium text-white transition hover:brightness-110'
                : btnPrimary
            }
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  )
}
