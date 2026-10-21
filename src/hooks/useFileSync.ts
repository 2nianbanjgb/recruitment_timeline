import { useCallback, useEffect, useRef, useState } from 'react'
import type { RecruitEvent, Settings, TodoItem } from '../types'
import {
  applySnapshotToLocal,
  diffState,
  fetchRemoteState,
  pushSnapshot,
  writeSyncedAt,
  type Snapshot,
} from '../lib/sync'

export interface FileSyncState {
  connected: boolean
  dataDir: string | null
  lastSavedAt: string | null
  error: string | null
}

export interface FileSyncControls extends FileSyncState {
  syncNow: () => void
  reloadFromFile: () => void
}

/** 把每次数据变化合并后写进本地文件：JSON 快照 + 追加日志。 */
export function useFileSync(
  events: RecruitEvent[],
  todos: TodoItem[],
  settings: Settings,
): FileSyncControls {
  const [state, setState] = useState<FileSyncState>({
    connected: false,
    dataDir: null,
    lastSavedAt: null,
    error: null,
  })
  const currentRef = useRef<Snapshot>({ events, todos, settings })
  const lastRef = useRef<Snapshot | null>(null)
  const connectedRef = useRef(false)

  const push = useCallback(async (force = false) => {
    if (!connectedRef.current) return
    const next = currentRef.current
    const changes = diffState(lastRef.current, next)
    if (!force && lastRef.current !== null && changes.length === 0) return

    const result = await pushSnapshot(next, changes)
    if (!result) {
      connectedRef.current = false
      setState(previous => ({
        ...previous,
        connected: false,
        error: '写入本地文件失败，检查服务是否还开着',
      }))
      return
    }

    lastRef.current = next
    writeSyncedAt(result.savedAt)
    setState(previous => ({
      ...previous,
      connected: true,
      lastSavedAt: result.savedAt,
      error: null,
    }))
  }, [])

  // 启动时探一次服务；文件里已有数据就把它当作基线，避免重复覆盖。
  useEffect(() => {
    let cancelled = false
    void (async () => {
      const remote = await fetchRemoteState()
      if (cancelled) return
      if (!remote) {
        setState({ connected: false, dataDir: null, lastSavedAt: null, error: null })
        return
      }
      connectedRef.current = true
      lastRef.current = remote.data
      setState({
        connected: true,
        dataDir: remote.dataDir ?? null,
        lastSavedAt: remote.savedAt,
        error: null,
      })
      if (!remote.data) void push(true)
    })()
    return () => {
      cancelled = true
    }
  }, [push])

  // 数据变化后合并写入，连点也只落一次盘。
  useEffect(() => {
    currentRef.current = { events, todos, settings }
    if (!connectedRef.current) return
    const timer = window.setTimeout(() => {
      void push()
    }, 400)
    return () => window.clearTimeout(timer)
  }, [events, todos, settings, push])

  const syncNow = useCallback(() => {
    void push(true)
  }, [push])

  const reloadFromFile = useCallback(async () => {
    const remote = await fetchRemoteState()
    if (!remote?.data || !remote.savedAt) {
      setState(previous => ({ ...previous, error: '本地文件里还没有数据' }))
      return
    }
    applySnapshotToLocal(remote.data)
    writeSyncedAt(remote.savedAt)
    window.location.reload()
  }, [])

  return { ...state, syncNow, reloadFromFile }
}
