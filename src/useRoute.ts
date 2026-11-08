import { useSyncExternalStore } from 'react'

export type Route = 'home' | 'rebalancer'

/**
 * Hash-based routing (`#/rebalancer`), so the app works on any static host,
 * such as GitHub Pages, with no server rewrites. There are only two pages, so
 * this replaces a router library.
 */
const paths: Record<Route, string> = { home: '#/', rebalancer: '#/rebalancer' }

export const hrefFor = (route: Route) => paths[route]

/** Turns the current URL hash into a route. Anything unknown goes home. */
function read(): Route {
  return window.location.hash.startsWith('#/rebalancer') ? 'rebalancer' : 'home'
}

/** Tells React when the hash changes. Scrolls to the top like a normal page load. */
function subscribe(onChange: () => void) {
  const handle = () => {
    window.scrollTo(0, 0)
    onChange()
  }
  window.addEventListener('hashchange', handle)
  return () => window.removeEventListener('hashchange', handle)
}

/**
 * The current page. useSyncExternalStore keeps React in step with the URL;
 * the third argument is the value used when rendering without a browser.
 */
export function useRoute(): Route {
  return useSyncExternalStore(subscribe, read, () => 'home')
}

/** Goes to a page from code (links use `hrefFor` instead). */
export function navigate(route: Route) {
  window.location.hash = paths[route]
}
