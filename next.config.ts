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
  images: {
    remotePatterns: r2RemotePatterns(),
    /**
     * Next refuses to optimize an image whose host resolves to a private IP —
     * SSRF protection worth keeping. The stand-in bucket a clone and CI use is
     * MinIO on localhost, which trips exactly that rule, so the exception is
     * scoped to the one signal that says a stand-in is in play. Production
     * never sets R2_ENDPOINT (see docs/deploy.md), so it keeps the protection.
     */
    dangerouslyAllowLocalIP: Boolean(process.env.R2_ENDPOINT),
  },
}

export default nextConfig
