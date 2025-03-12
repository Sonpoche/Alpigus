// app/reset-password/[token]/page.tsx
import { NewPasswordForm } from '@/components/auth/new-password-form'

export default function ResetPasswordPage({
  params,
}: {
  params: { token: string }
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full space-y-8 p-6 bg-background border border-foreground/10 rounded-lg shadow-lg">
        <div>
          <h2 className="text-center text-3xl font-bold font-montserrat text-title">
            Nouveau mot de passe
          </h2>
          <p className="mt-2 text-center text-sm font-roboto text-foreground/60">
            Veuillez choisir un nouveau mot de passe
          </p>
        </div>
        <NewPasswordForm token={params.token} />
      </div>
    </div>
  )
}