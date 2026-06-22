import { createFileRoute, Link } from '@tanstack/react-router'
import { useForm } from '@tanstack/react-form'
import { z } from 'zod'

export const Route = createFileRoute('/forgot-password')({ component: ForgotPasswordPage })

const forgotPasswordSchema = z.object({
  email: z.string().min(1, 'L\'email est requis').email('L\'adresse email n\'est pas valide'),
})

function ForgotPasswordPage() {
  const form = useForm({
    defaultValues: { email: '' },
    onSubmit: async ({ value }) => {
      console.log('Forgot password:', value)
    },
  })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        form.handleSubmit()
      }}
    >
      <form.Field
        name="email"
        validators={{
          onBlur: ({ value }) => {
            const result = forgotPasswordSchema.shape.email.safeParse(value)
            return result.success ? undefined : result.error.issues[0].message
          },
        }}
      >
        {(field) => (
          <div>
            <label htmlFor="email">Email <span style={{ color: 'red' }}>*</span></label>
            <br />
            <input
              id="email"
              type="email"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              style={field.state.meta.errors.length > 0 ? { outline: '2px solid red' } : undefined}
            />
            {field.state.meta.errors.length > 0 && (
              <p style={{ color: 'red', margin: '4px 0 0' }}>
                {field.state.meta.errors[0]}
              </p>
            )}
          </div>
        )}
      </form.Field>

      <button type="submit">Réinitialiser le mot de passe</button>

      <p>
        <Link to="/login">Retour à la connexion</Link>
      </p>
    </form>
  )
}
