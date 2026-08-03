'use client'

import { useSyncExternalStore } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

function subscribe(onChange: () => void): () => void {
  const list = window.matchMedia(QUERY)
  list.addEventListener('change', onChange)
  return () => list.removeEventListener('change', onChange)
}

function getSnapshot(): boolean {
  return window.matchMedia(QUERY).matches
}

/** The server can't know; assume motion is fine and correct on hydration. */
function getServerSnapshot(): boolean {
  return false
}

/**
 * Tailwind's `motion-reduce:` variants cover everything we style ourselves, but
 * dnd-kit writes its transition as an inline style, which a class cannot
 * override. This lets the caller drop that inline value instead.
 */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
