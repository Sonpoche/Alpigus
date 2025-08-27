// components/ui/password-strength.tsx
'use client'

import { cn } from '@/lib/utils'

interface PasswordStrengthProps {
  password: string;
}

export function PasswordStrength({ password }: PasswordStrengthProps) {
  const getPasswordStrength = (password: string) => {
    let score = 0;
    
    if (password.length >= 8) score++;
    if (password.match(/[A-Z]/)) score++;
    if (password.match(/[a-z]/)) score++;
    if (password.match(/[0-9]/)) score++;
    if (password.match(/[^A-Za-z0-9]/)) score++;

    return score;
  }

  const strength = getPasswordStrength(password);
  const strengthText = ['Très faible', 'Faible', 'Moyen', 'Fort', 'Très fort'][strength];
  
  // Nuances de gris pour la force (du plus clair au plus foncé)
  const strengthColors = [
    'bg-border',           // 0 - Très faible (gris très clair)
    'bg-muted',            // 1 - Faible (gris clair)
    'bg-muted-foreground/30', // 2 - Moyen (gris moyen)
    'bg-muted-foreground/70', // 3 - Fort (gris foncé)
    'bg-foreground'        // 4 - Très fort (noir/blanc selon mode)
  ];

  return (
    <div className="space-y-2 mt-2">
      <div className="flex h-2 gap-1">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-full w-full rounded-full transition-all duration-300",
              i < strength ? strengthColors[strength] : "bg-border"
            )}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Force du mot de passe : <span className="font-medium">{strengthText}</span>
      </p>
      
      {/* Critères de validation */}
      {password && (
        <div className="text-xs text-muted-foreground space-y-1">
          <div className={cn(
            "flex items-center gap-2",
            password.length >= 8 ? "text-foreground" : "text-muted-foreground"
          )}>
            <div className={cn(
              "w-1 h-1 rounded-full",
              password.length >= 8 ? "bg-foreground" : "bg-border"
            )} />
            Au moins 8 caractères
          </div>
          <div className={cn(
            "flex items-center gap-2",
            password.match(/[A-Z]/) ? "text-foreground" : "text-muted-foreground"
          )}>
            <div className={cn(
              "w-1 h-1 rounded-full",
              password.match(/[A-Z]/) ? "bg-foreground" : "bg-border"
            )} />
            Une majuscule
          </div>
          <div className={cn(
            "flex items-center gap-2",
            password.match(/[0-9]/) ? "text-foreground" : "text-muted-foreground"
          )}>
            <div className={cn(
              "w-1 h-1 rounded-full",
              password.match(/[0-9]/) ? "bg-foreground" : "bg-border"
            )} />
            Un chiffre
          </div>
        </div>
      )}
    </div>
  );
}