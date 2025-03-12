// components/emails/reset-password-email.tsx
import EmailLayout, { EmailButton } from '@/components/layout/email';
import { Section, Text } from '@react-email/components';

interface ResetPasswordEmailProps {
  name: string;
  resetLink: string;
}

export default function ResetPasswordEmail({ name, resetLink }: ResetPasswordEmailProps) {
  return (
    <EmailLayout previewText="Réinitialisation de votre mot de passe Mushroom Marketplace">
      <Section>
        <Text className="text-2xl font-bold mb-4">
          Bonjour {name}
        </Text>
        
        <Text className="text-gray-600 mb-4">
          Vous avez demandé la réinitialisation de votre mot de passe sur Mushroom Marketplace.
        </Text>

        <Text className="text-gray-600 mb-4">
          Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe :
        </Text>

        <EmailButton href={resetLink}>
          Réinitialiser mon mot de passe
        </EmailButton>

        <Text className="text-gray-600 mt-8">
          Ce lien est valable pendant 1 heure. Si vous n'avez pas demandé cette réinitialisation, 
          vous pouvez ignorer cet email.
        </Text>

        <Text className="text-gray-600 mt-4">
          Pour des raisons de sécurité, nous vous conseillons de ne pas partager ce lien.
        </Text>
      </Section>
    </EmailLayout>
  );
}