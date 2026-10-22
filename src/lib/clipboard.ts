/**
 * 复制文本到剪贴板。
 * 优先用 Clipboard API；在非安全上下文或旧浏览器里退回 textarea + execCommand。
 */
export async function copyText(value: string): Promise<boolean> {
  const text = value.trim()
  if (!text) return false

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // 没有权限或非安全上下文时继续走兜底方案
  }

  try {
    const area = document.createElement('textarea')
    area.value = text
    area.setAttribute('readonly', '')
    area.style.position = 'fixed'
    area.style.top = '-9999px'
    area.style.opacity = '0'
    document.body.appendChild(area)
    area.select()
    area.setSelectionRange(0, text.length)
    const ok = document.execCommand('copy')
    document.body.removeChild(area)
    return ok
  } catch {
    return false
  }
}
