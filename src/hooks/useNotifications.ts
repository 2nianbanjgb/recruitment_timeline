import { useCallback, useEffect, useState } from 'react'
import type { RecruitEvent } from '../types'
import {
  currentPermission,
  dueNotifications,
  presentNotification,
  requestPermission,
  sendTestNotification,
  type PermissionState,
} from '../lib/notify'
import { loadNotified, saveNotified } from '../store/storage'

const TICK_MS = 20_000

/** 页面存活期间按触发点发送浏览器通知；发过的记录落本地做去重。 */
export function useNotifications(events: RecruitEvent[], enabled: boolean) {
  const [permission, setPermission] = useState<PermissionState>(currentPermission)

  useEffect(() => {
    if (!enabled || permission !== 'granted') return

    const check = () => {
      const now = Date.now()
      const sent = loadNotified()
      const due = dueNotifications(events, now, sent)
      if (due.length === 0) return
      for (const item of due) sent[item.key] = now
      saveNotified(sent)
      for (const item of due) void presentNotification(item)
    }

    check()
    const timer = window.setInterval(check, TICK_MS)
    const onWake = () => check()
    window.addEventListener('focus', onWake)
    document.addEventListener('visibilitychange', onWake)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', onWake)
      document.removeEventListener('visibilitychange', onWake)
    }
  }, [events, enabled, permission])

  const request = useCallback(async () => {
    const result = await requestPermission()
    setPermission(result)
    return result
  }, [])

  return { permission, request, sendTest: sendTestNotification }
}
