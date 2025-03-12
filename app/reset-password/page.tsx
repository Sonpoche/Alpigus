// app/reset-password/page.tsx
import { ResetPasswordForm } from '@/components/auth/reset-password-form'

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full space-y-8 p-6 bg-background border border-foreground/10 rounded-lg shadow-lg">
        <div>
          <h2 className="text-center text-3xl font-bold font-montserrat text-title">
            Mot de passe oublié
          </h2>
          <p className="mt-2 text-center text-sm font-roboto text-foreground/60">
            Entrez votre email pour réinitialiser votre mot de passe
          </p>
        </div>
        <ResetPasswordForm />
      </div>
    </div>
  )
}