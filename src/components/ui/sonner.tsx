import { Toaster as Sonner, type ToasterProps } from 'sonner'

/**
 * App is light-only, so the toaster is pinned to the light theme (no next-themes
 * provider needed). Toast visuals are themed to the NSIA dark pill via styles.css.
 */
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      position="bottom-center"
      className="toaster group"
      {...props}
    />
  )
}

export { Toaster }
