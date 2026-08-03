'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { authenticate, type AuthFormState } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const INITIAL_STATE: AuthFormState = {}

type LoginFormProps = {
  allowRegistration: boolean
}

export function LoginForm({ allowRegistration }: LoginFormProps) {
  const [state, formAction] = useActionState(authenticate, INITIAL_STATE)

  return (
    <form action={formAction} className="space-y-6" noValidate>
      {state.formError ? (
        <p
          role="alert"
          className="rounded-md border border-destructive/50 px-3 py-2 text-sm text-destructive"
        >
          {state.formError}
        </p>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          // Survives a failed attempt; keyed so React remounts with the new value.
          key={state.email}
          defaultValue={state.email}
          aria-invalid={state.fieldErrors?.email ? true : undefined}
          aria-describedby={
            state.fieldErrors?.email ? 'email-error' : undefined
          }
        />
        {state.fieldErrors?.email ? (
          <p id="email-error" className="text-sm text-destructive">
            {state.fieldErrors.email}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={state.fieldErrors?.password ? true : undefined}
          aria-describedby={
            state.fieldErrors?.password ? 'password-error' : 'password-hint'
          }
        />
        {state.fieldErrors?.password ? (
          <p id="password-error" className="text-sm text-destructive">
            {state.fieldErrors.password}
          </p>
        ) : (
          <p id="password-hint" className="text-sm text-muted-foreground">
            At least 8 characters.
          </p>
        )}
      </div>

      <FormButtons allowRegistration={allowRegistration} />
    </form>
  )
}

// Separate component so useFormStatus can read the parent form's pending state.
function FormButtons({ allowRegistration }: LoginFormProps) {
  const { pending } = useFormStatus()

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <Button type="submit" name="intent" value="signin" disabled={pending}>
        Sign in
      </Button>
      {allowRegistration ? (
        <Button
          type="submit"
          name="intent"
          value="signup"
          variant="outline"
          disabled={pending}
        >
          Create account
        </Button>
      ) : null}
    </div>
  )
}
