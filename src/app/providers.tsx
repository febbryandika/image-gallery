'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

/**
 * TanStack Query is here for exactly one job: the optimistic reorder in
 * SortableGrid (and upload progress). Reads are Server Components querying
 * Drizzle directly — do not turn this into the app's data layer (SPEC §5).
 */
export function Providers({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // A factory, so a re-render never swaps the client out from under the tree.
  const [queryClient] = useState(() => new QueryClient())

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}
