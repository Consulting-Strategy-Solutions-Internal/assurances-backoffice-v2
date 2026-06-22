import { createFileRoute, Link } from '@tanstack/react-router'
import { useForm } from '@tanstack/react-form'
import { z } from 'zod'

export const Route = createFileRoute('/login')({ component: LoginPage })

const loginSchema = z.object({
  email: z.string().min(1, 'L\'email est requis').email('L\'adresse email n\'est pas valide'),
  password: z.string().min(1, 'Le mot de passe est requis').min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
})

function LoginPage() {
  const form = useForm({
    defaultValues: { email: '', password: '' },
    onSubmit: async ({ value }) => {
      console.log('Login:', value)
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
            const result = loginSchema.shape.email.safeParse(value)
            return result.success ? undefined : result.error.issues[0].message
          },
        }}
      >
        {(field) => (
          <div>
            <label htmlFor="email">Email</label>
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

      <form.Field
        name="password"
        validators={{
          onBlur: ({ value }) => {
            const result = loginSchema.shape.password.safeParse(value)
            return result.success ? undefined : result.error.issues[0].message
          },
        }}
      >
        {(field) => (
          <div>
            <label htmlFor="password">Mot de passe</label>
            <br />
            <input
              id="password"
              type="password"
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

      <button type="submit">Se connecter</button>

      <p>
        <Link to="/forgot-password">Mot de passe oublié ?</Link>
      </p>
    </form>
  )
}
