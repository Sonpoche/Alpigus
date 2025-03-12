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
  const strengthColor = [
    'bg-destructive',
    'bg-red-500',
    'bg-yellow-500',
    'bg-green-500',
    'bg-green-600'
  ][strength];

  return (
    <div className="space-y-2 mt-2">
      <div className="flex h-2 gap-1">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-full w-full rounded-full transition-colors",
              i < strength ? strengthColor : "bg-foreground/10"
            )}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Force du mot de passe : {strengthText}
      </p>
    </div>
  );
}