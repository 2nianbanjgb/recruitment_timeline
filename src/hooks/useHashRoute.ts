import { useCallback, useEffect, useState } from 'react'

export type Route = 'dashboard' | 'calendar' | 'events' | 'todos' | 'settings'

export interface RouteState {
  route: Route
  params: URLSearchParams
}

export const ROUTE_HASH: Record<Route, string> = {
  dashboard: '#/',
  calendar: '#/calendar',
  events: '#/events',
  todos: '#/todos',
  settings: '#/settings',
}

function parseHash(hash: string): RouteState {
  const raw = hash.replace(/^#\/?/, '')
  const [path = '', query = ''] = raw.split('?')
  const route: Route =
    path === 'calendar' || path === 'events' || path === 'todos' || path === 'settings'
      ? path
      : 'dashboard'
  return { route, params: new URLSearchParams(query) }
}

export function useHashRoute(): RouteState & { navigate: (to: string) => void } {
  const [state, setState] = useState<RouteState>(() =>
    parseHash(typeof window === 'undefined' ? '' : window.location.hash),
  )

  useEffect(() => {
    const onHashChange = () => setState(parseHash(window.location.hash))
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const navigate = useCallback((to: string) => {
    if (window.location.hash === to) {
      setState(parseHash(to))
      return
    }
    window.location.hash = to
  }, [])

  return { route: state.route, params: state.params, navigate }
}
