// Chemin du fichier: components/emails/welcome-email.tsx
import { 
  Html, 
  Head, 
  Body, 
  Container, 
  Section, 
  Text, 
  Link, 
  Hr 
} from '@react-email/components';

interface WelcomeEmailProps {
  name: string;
  role?: 'CLIENT' | 'PRODUCER' | null;
}

export default function WelcomeEmail({ name, role }: WelcomeEmailProps) {
  const dashboardLink = process.env.NEXTAUTH_URL || 'http://localhost:3000';

  return (
    <Html>
      <Head />
      <Body style={{ backgroundColor: '#f3f4f6', fontFamily: 'Arial, sans-serif' }}>
        <Container style={{ margin: '0 auto', padding: '20px 0', maxWidth: '600px' }}>
          
          {/* Header */}
          <Section style={{ 
            backgroundColor: '#000', 
            padding: '32px',
            borderRadius: '8px 8px 0 0',
            textAlign: 'center' as const
          }}>
            <Text style={{ 
              color: '#fff',
              fontSize: '32px',
              fontWeight: 'bold',
              margin: '0 0 8px 0'
            }}>
              Bienvenue sur Mushroom Marketplace
            </Text>
            <Text style={{ 
              color: '#E5E7EB',
              fontSize: '16px',
              margin: 0
            }}>
              Votre plateforme B2B dédiée aux champignons
            </Text>
          </Section>

          {/* Corps */}
          <Section style={{ 
            padding: '32px',
            backgroundColor: '#fff',
            border: '2px solid #000',
            borderTop: 'none',
            borderRadius: '0 0 8px 8px'
          }}>
            <Text style={{ 
              fontSize: '20px',
              fontWeight: 'bold',
              color: '#000',
              marginBottom: '16px'
            }}>
              Bonjour {name},
            </Text>
            
            <Text style={{ 
              fontSize: '16px',
              color: '#4B5563',
              lineHeight: '24px',
              marginBottom: '24px'
            }}>
              Nous sommes ravis de vous accueillir sur Mushroom Marketplace. Votre compte a été créé avec succès et vous pouvez dès maintenant accéder à tous nos services.
            </Text>

            {/* Section rôle producteur */}
            {role === 'PRODUCER' && (
              <Section style={{
                backgroundColor: '#DBEAFE',
                border: '2px solid #3B82F6',
                borderRadius: '8px',
                padding: '24px',
                marginBottom: '24px'
              }}>
                <Text style={{ 
                  fontSize: '16px',
                  fontWeight: 'bold',
                  color: '#000',
                  marginBottom: '16px'
                }}>
                  Votre espace producteur
                </Text>
                
                <Text style={{ 
                  fontSize: '15px',
                  color: '#1F2937',
                  lineHeight: '22px',
                  marginBottom: '12px'
                }}>
                  En tant que producteur, vous avez accès aux fonctionnalités suivantes :
                </Text>
                
                <Text style={{ fontSize: '14px', color: '#1F2937', marginBottom: '8px' }}>
                  • Gestion complète de vos produits
                </Text>
                <Text style={{ fontSize: '14px', color: '#1F2937', marginBottom: '8px' }}>
                  • Suivi en temps réel de vos commandes
                </Text>
                <Text style={{ fontSize: '14px', color: '#1F2937', marginBottom: '8px' }}>
                  • Organisation et planification des livraisons
                </Text>
                <Text style={{ fontSize: '14px', color: '#1F2937', marginBottom: '8px' }}>
                  • Gestion de votre profil et informations entreprise
                </Text>
                <Text style={{ fontSize: '14px', color: '#1F2937', marginBottom: '0' }}>
                  • Statistiques et rapports de ventes
                </Text>
              </Section>
            )}

            {/* Section rôle client */}
            {role === 'CLIENT' && (
              <Section style={{
                backgroundColor: '#D1FAE5',
                border: '2px solid #10B981',
                borderRadius: '8px',
                padding: '24px',
                marginBottom: '24px'
              }}>
                <Text style={{ 
                  fontSize: '16px',
                  fontWeight: 'bold',
                  color: '#000',
                  marginBottom: '16px'
                }}>
                  Votre espace client
                </Text>
                
                <Text style={{ 
                  fontSize: '15px',
                  color: '#1F2937',
                  lineHeight: '22px',
                  marginBottom: '12px'
                }}>
                  En tant que client, vous avez accès aux fonctionnalités suivantes :
                </Text>
                
                <Text style={{ fontSize: '14px', color: '#1F2937', marginBottom: '8px' }}>
                  • Navigation dans notre catalogue complet
                </Text>
                <Text style={{ fontSize: '14px', color: '#1F2937', marginBottom: '8px' }}>
                  • Commandes directes auprès de nos producteurs
                </Text>
                <Text style={{ fontSize: '14px', color: '#1F2937', marginBottom: '8px' }}>
                  • Gestion de vos réservations
                </Text>
                <Text style={{ fontSize: '14px', color: '#1F2937', marginBottom: '8px' }}>
                  • Suivi détaillé de vos commandes
                </Text>
                <Text style={{ fontSize: '14px', color: '#1F2937', marginBottom: '0' }}>
                  • Historique complet de vos achats
                </Text>
              </Section>
            )}

            {/* Section pas de rôle */}
            {!role && (
              <Section style={{
                backgroundColor: '#FEF3C7',
                border: '2px solid #F59E0B',
                borderRadius: '8px',
                padding: '24px',
                marginBottom: '24px'
              }}>
                <Text style={{ 
                  fontSize: '16px',
                  fontWeight: 'bold',
                  color: '#92400E',
                  marginBottom: '12px'
                }}>
                  Action requise : Complétez votre profil
                </Text>
                <Text style={{ 
                  fontSize: '15px',
                  color: '#78350F',
                  lineHeight: '22px',
                  marginBottom: '16px'
                }}>
                  Pour finaliser votre inscription et accéder à toutes les fonctionnalités, veuillez compléter votre profil en choisissant votre type de compte :
                </Text>
                <Text style={{ fontSize: '14px', color: '#78350F', marginBottom: '8px', fontWeight: 'bold' }}>
                  Client - Accédez au catalogue et commandez des produits
                </Text>
                <Text style={{ fontSize: '14px', color: '#78350F', marginBottom: '0', fontWeight: 'bold' }}>
                  Producteur - Vendez vos produits et gérez vos commandes
                </Text>
              </Section>
            )}

            {/* Bouton CTA */}
            <Section style={{ textAlign: 'center' as const, margin: '32px 0' }}>
              <Link
                href={`${dashboardLink}${role ? '/dashboard' : '/profile/complete'}`}
                style={{
                  backgroundColor: '#000',
                  color: '#fff',
                  padding: '14px 32px',
                  textDecoration: 'none',
                  borderRadius: '6px',
                  fontWeight: 'bold',
                  fontSize: '16px',
                  display: 'inline-block'
                }}
              >
                {role ? 'Accéder à mon espace' : 'Compléter mon profil'}
              </Link>
            </Section>

            <Hr style={{ 
              borderColor: '#E5E7EB',
              margin: '24px 0'
            }} />

            <Section style={{
              backgroundColor: '#F3F4F6',
              border: '1px solid #E5E7EB',
              borderRadius: '6px',
              padding: '16px',
              marginBottom: '0'
            }}>
              <Text style={{ 
                fontSize: '14px',
                color: '#6B7280',
                lineHeight: '20px',
                textAlign: 'center' as const,
                margin: '0 0 8px 0'
              }}>
                Besoin d&apos;aide pour démarrer ?
              </Text>
              <Text style={{ 
                fontSize: '13px',
                color: '#9CA3AF',
                lineHeight: '18px',
                textAlign: 'center' as const,
                margin: 0
              }}>
                Notre équipe est à votre disposition pour répondre à toutes vos questions.
              </Text>
            </Section>
          </Section>

          {/* Footer */}
          <Section style={{ 
            padding: '24px',
            backgroundColor: '#F9FAFB',
            borderRadius: '8px',
            marginTop: '16px',
            textAlign: 'center' as const,
            border: '1px solid #E5E7EB'
          }}>
            <Text style={{ 
              fontSize: '12px',
              color: '#6B7280',
              margin: '0 0 8px 0'
            }}>
              Mushroom Marketplace - Plateforme B2B de champignons
            </Text>
            <Text style={{ 
              fontSize: '12px',
              color: '#9CA3AF',
              margin: 0
            }}>
              © 2025 Mushroom Marketplace. Tous droits réservés.
            </Text>
          </Section>

        </Container>
      </Body>
    </Html>
  );
}