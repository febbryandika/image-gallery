import type { Metadata } from 'next'
import { LoginForm } from '@/components/LoginForm'

export const metadata: Metadata = { title: 'Sign in' }

export default function LoginPage() {
  // Hiding the button is UX; the Server Action rejects signup again (SPEC §7).
  const allowRegistration = process.env.DEMO_MODE !== 'true'

  return (
    <div className="mx-auto max-w-sm space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="text-sm text-muted-foreground">
          {allowRegistration
            ? 'Sign in, or create an account with the same form.'
            : 'Registration is disabled on this instance.'}
        </p>
      </div>
      <LoginForm allowRegistration={allowRegistration} />
    </div>
  )
}
