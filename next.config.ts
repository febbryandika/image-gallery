import type { NextConfig } from 'next'

// Derived from R2_PUBLIC_URL rather than hardcoded, so the bucket hostname
// still lives in exactly one place (SPEC §9). Unset or unparseable contributes
// no pattern, which keeps a credential-free clone building.
function r2RemotePatterns(): NonNullable<
  NonNullable<NextConfig['images']>['remotePatterns']
> {
  const raw = process.env.R2_PUBLIC_URL
  if (!raw) return []

  try {
    const { protocol, hostname, port } = new URL(raw)
    return [
      {
        protocol: protocol === 'http:' ? 'http' : 'https',
        hostname,
        // Without this a public URL on a non-default port is silently rejected.
        ...(port ? { port } : {}),
        pathname: '/**',
      },
    ]
  } catch {
    return []
  }
}

const nextConfig: NextConfig = {
  images: { remotePatterns: r2RemotePatterns() },
}

export default nextConfig
