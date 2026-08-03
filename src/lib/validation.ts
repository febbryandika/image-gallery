import { z } from 'zod'

/**
 * Shared by the login form and the auth Server Action. The client parse is
 * convenience; the server parses again and never trusts the first result.
 */
export const credentialsSchema = z.object({
  email: z.email('Enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be under 128 characters'),
})

export type Credentials = z.infer<typeof credentialsSchema>
