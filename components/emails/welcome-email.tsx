// components/emails/welcome-email.tsx
import EmailLayout, { EmailButton } from '@/components/layout/email';
import { Section, Text } from '@react-email/components';

interface WelcomeEmailProps {
  name: string;
  role?: 'CLIENT' | 'PRODUCER' | null;
}

export default function WelcomeEmail({ name, role }: WelcomeEmailProps) {
  const dashboardLink = process.env.NEXTAUTH_URL || 'http://localhost:3000';

  return (
    <EmailLayout previewText={`Bienvenue sur Mushroom Marketplace, ${name}!`}>
      <Section>
        <Text className="text-2xl font-bold mb-4">
          Bienvenue {name} !
        </Text>
        
        <Text className="text-gray-600 mb-4">
          Nous sommes ravis de vous accueillir sur Mushroom Marketplace, votre plateforme B2B dédiée aux champignons.
        </Text>

        {role ? (
          role === 'PRODUCER' ? (
            <Text className="text-gray-600 mb-4">
              En tant que producteur, vous pouvez dès maintenant :
              <ul className="list-disc list-inside my-4">
                <li>Gérer vos produits</li>
                <li>Suivre vos commandes</li>
                <li>Organiser vos livraisons</li>
                <li>Gérer votre profil producteur</li>
              </ul>
            </Text>
          ) : (
            <Text className="text-gray-600 mb-4">
              En tant que client, vous pouvez dès maintenant :
              <ul className="list-disc list-inside my-4">
                <li>Parcourir notre catalogue</li>
                <li>Commander auprès de nos producteurs</li>
                <li>Gérer vos réservations</li>
                <li>Suivre vos commandes</li>
              </ul>
            </Text>
          )
        ) : (
          <Text className="text-gray-600 mb-4">
            Pour finaliser votre inscription, vous devez compléter votre profil en choisissant votre type de compte. 
            <ul className="list-disc list-inside my-4">
              <li>Client : Pour acheter des produits</li>
              <li>Producteur : Pour vendre vos produits</li>
            </ul>
          </Text>
        )}

        <EmailButton href={`${dashboardLink}${role ? '/dashboard' : '/profile/complete'}`}>
          {role ? 'Accéder à mon espace' : 'Compléter mon profil'}
        </EmailButton>

        <Text className="text-gray-600 mt-8">
          Si vous avez des questions, n'hésitez pas à nous contacter.
        </Text>
      </Section>
    </EmailLayout>
  );
}