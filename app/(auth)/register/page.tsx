// app/(auth)/register/page.tsx
import { RegisterForm } from '@/components/auth/register-form'
import Link from 'next/link'

export default function RegisterPage() {
 return (
   <main className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
     <div className="max-w-md w-full space-y-8 p-6 bg-background border border-foreground/10 rounded-lg shadow-lg">
       <div>
         <h2 className="text-center text-3xl font-bold font-montserrat text-title">
           Créer un compte
         </h2>
         <p className="mt-2 text-center text-sm font-roboto text-foreground/60">
           Rejoignez notre marketplace de champignons
         </p>
       </div>
       <RegisterForm />
       <div className="text-center text-sm font-roboto">
         <span className="text-custom-text">Vous avez déjà un compte ?</span>{' '}
         <Link 
           href="/login" 
           className="text-custom-accent hover:opacity-90 transition-opacity"
         >
           Se connecter
         </Link>
       </div>
     </div>
   </main>
 )
}