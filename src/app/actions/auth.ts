'use server'

import { APIError } from 'better-auth/api'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { flattenError } from 'zod'
import { auth } from '@/lib/auth'
import { credentialsSchema } from '@/lib/validation'

export type AuthFormState = {
  formError?: string
  fieldErrors?: {
    email?: string
    password?: string
  }
  // Echoed back so a failed attempt doesn't make the user retype it.
  // The password is deliberately never echoed.
  email?: string
}

// Same message for a wrong password and an unknown email, so the form is not a
// user-enumeration oracle.
const BAD_CREDENTIALS = 'Email or password is incorrect'

function isRegistrationDisabled(): boolean {
  return process.env.DEMO_MODE === 'true'
}

export async function authenticate(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const intent = formData.get('intent')
  const isSignUp = intent === 'signup'
  const submittedEmail = formData.get('email')
  const echo = typeof submittedEmail === 'string' ? submittedEmail : ''

  if (isSignUp && isRegistrationDisabled()) {
    return {
      email: echo,
      formError: 'Registration is disabled on the demo instance.',
    }
  }

  const parsed = credentialsSchema.safeParse({
    email: submittedEmail,
    password: formData.get('password'),
  })

  if (!parsed.success) {
    const { fieldErrors } = flattenError(parsed.error)
    return {
      email: echo,
      fieldErrors: {
        email: fieldErrors.email?.[0],
        password: fieldErrors.password?.[0],
      },
    }
  }

  const { email, password } = parsed.data

  try {
    if (isSignUp) {
      await auth.api.signUpEmail({
        // Better Auth requires a name; the email local-part avoids a third field.
        body: { email, password, name: email.split('@')[0] ?? email },
        headers: await headers(),
      })
    } else {
      await auth.api.signInEmail({
        body: { email, password },
        headers: await headers(),
      })
    }
  } catch (error) {
    if (error instanceof APIError) {
      return {
        email: echo,
        formError: isSignUp
          ? (error.body?.message ?? 'Could not create that account')
          : BAD_CREDENTIALS,
      }
    }
    throw error
  }

  redirect('/')
}

export async function signOutAction(): Promise<void> {
  await auth.api.signOut({ headers: await headers() })
  redirect('/login')
}
