import { useSyncExternalStore } from 'react'

export type Route = 'home' | 'rebalancer'

/** Hash-based routing, so the app works on any static host with no server rewrites. */
const paths: Record<Route, string> = { home: '#/', rebalancer: '#/rebalancer' }

export const hrefFor = (route: Route) => paths[route]

function read(): Route {
  return window.location.hash.startsWith('#/rebalancer') ? 'rebalancer' : 'home'
}

function subscribe(onChange: () => void) {
  const handle = () => {
    window.scrollTo(0, 0)
    onChange()
  }
  window.addEventListener('hashchange', handle)
  return () => window.removeEventListener('hashchange', handle)
}

export function useRoute(): Route {
  return useSyncExternalStore(subscribe, read, () => 'home')
}

export function navigate(route: Route) {
  window.location.hash = paths[route]
}
