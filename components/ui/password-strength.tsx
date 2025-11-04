// Chemin du fichier: components/ui/password-strength.tsx
'use client'

import { cn } from '@/lib/utils'

interface PasswordStrengthProps {
  password: string;
}

export function PasswordStrength({ password }: PasswordStrengthProps) {
  const getPasswordStrength = (password: string) => {
    if (!password) return 0;
    
    let score = 0;
    
    if (password.length >= 8) score++;
    if (password.match(/[A-Z]/)) score++;
    if (password.match(/[a-z]/)) score++;
    if (password.match(/[0-9]/)) score++;
    if (password.match(/[^A-Za-z0-9]/)) score++;

    return score;
  }

  const strength = getPasswordStrength(password);
  const strengthText = ['Très faible', 'Faible', 'Moyen', 'Fort', 'Très fort','Parfait'][strength] || '';
  
  // Nuances de noir/gris pour la force
  const strengthColors = [
    'bg-gray-300',    // 0 - Très faible
    'bg-gray-400',    // 1 - Faible
    'bg-gray-500',    // 2 - Moyen
    'bg-gray-700',    // 3 - Fort
    'bg-black'        // 4-5 - Très fort
  ];

  // Ne rien afficher si le mot de passe est vide
  if (!password) return null;

  return (
    <div className="space-y-2 mt-2">
      <div className="flex h-2 gap-1">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-full w-full rounded-full transition-all duration-300",
              i < strength ? strengthColors[Math.min(strength, 4)] : "bg-gray-100 border border-gray-200"
            )}
          />
        ))}
      </div>
      <p className="text-xs text-gray-600">
        Force du mot de passe : <span className="font-bold text-black">{strengthText}</span>
      </p>
      
      {/* Critères de validation */}
      <div className="text-xs space-y-1 pt-1">
        <div className={cn(
          "flex items-center gap-2",
          password.length >= 8 ? "text-black font-medium" : "text-gray-400"
        )}>
          <div className={cn(
            "w-1.5 h-1.5 rounded-full",
            password.length >= 8 ? "bg-black" : "bg-gray-300"
          )} />
          Au moins 8 caractères
        </div>
        <div className={cn(
          "flex items-center gap-2",
          password.match(/[A-Z]/) ? "text-black font-medium" : "text-gray-400"
        )}>
          <div className={cn(
            "w-1.5 h-1.5 rounded-full",
            password.match(/[A-Z]/) ? "bg-black" : "bg-gray-300"
          )} />
          Une majuscule
        </div>
        <div className={cn(
          "flex items-center gap-2",
          password.match(/[0-9]/) ? "text-black font-medium" : "text-gray-400"
        )}>
          <div className={cn(
            "w-1.5 h-1.5 rounded-full",
            password.match(/[0-9]/) ? "bg-black" : "bg-gray-300"
          )} />
          Un chiffre
        </div>
      </div>
    </div>
  );
}