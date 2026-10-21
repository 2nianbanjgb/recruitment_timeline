import type { Status } from '../types'
import { STATUS_LABELS } from '../types'
import { STATUS_STYLES } from '../lib/colors'

export function StatusPill({ status }: { status: Status }) {
  const style = STATUS_STYLES[status]
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${style.pill}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {STATUS_LABELS[status]}
    </span>
  )
}
