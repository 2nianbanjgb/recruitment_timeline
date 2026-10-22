import { copyText } from '../lib/clipboard'
import { IconCopy } from './icons'
import { useToast } from './Toast'

export interface CopyButtonProps {
  /** 要复制的文本 */
  value: string
  /** 读屏名称，例如「复制地址」 */
  label: string
  /** 复制成功后的提示文案 */
  successMessage?: string
  className?: string
}

const BASE =
  'inline-flex shrink-0 items-center justify-center rounded-md border border-line bg-panel px-1.5 py-1 text-ink-faint transition hover:border-accent/40 hover:bg-accent-soft hover:text-accent'

/** 一键复制：地址、口令这类要贴到别处的信息。 */
export function CopyButton({ value, label, successMessage = '已复制', className }: CopyButtonProps) {
  const { toast } = useToast()

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={async () => {
        const ok = await copyText(value)
        toast(ok ? successMessage : '复制失败，可以手动选中再复制')
      }}
      className={className ?? BASE}
    >
      <IconCopy className="h-3.5 w-3.5" />
    </button>
  )
}
