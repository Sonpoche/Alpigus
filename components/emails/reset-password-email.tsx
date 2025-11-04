// Chemin du fichier: components/emails/reset-password-email.tsx
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

interface ResetPasswordEmailProps {
  name: string;
  resetLink: string;
}

export default function ResetPasswordEmail({ name, resetLink }: ResetPasswordEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={{ backgroundColor: '#f3f4f6', fontFamily: 'Arial, sans-serif' }}>
        <Container style={{ margin: '0 auto', padding: '20px 0', maxWidth: '600px' }}>
          
          {/* Header */}
          <Section style={{ 
            backgroundColor: '#000', 
            padding: '24px',
            borderRadius: '8px 8px 0 0'
          }}>
            <Text style={{ 
              color: '#fff',
              fontSize: '24px',
              fontWeight: 'bold',
              margin: 0,
              textAlign: 'center' as const
            }}>
              Réinitialisation de mot de passe
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
              fontSize: '18px',
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
              marginBottom: '16px'
            }}>
              Vous avez demandé la réinitialisation de votre mot de passe sur Mushroom Marketplace.
            </Text>

            <Text style={{ 
              fontSize: '16px',
              color: '#4B5563',
              lineHeight: '24px',
              marginBottom: '24px'
            }}>
              Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe :
            </Text>

            {/* Bouton */}
            <Section style={{ textAlign: 'center' as const, margin: '32px 0' }}>
              <Link
                href={resetLink}
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
                Réinitialiser mon mot de passe
              </Link>
            </Section>

            <Hr style={{ 
              borderColor: '#E5E7EB',
              margin: '24px 0'
            }} />

            {/* Avertissement */}
            <Section style={{
              backgroundColor: '#FEF3C7',
              border: '2px solid #F59E0B',
              borderRadius: '6px',
              padding: '16px',
              marginBottom: '16px'
            }}>
              <Text style={{ 
                fontSize: '14px',
                color: '#92400E',
                margin: 0,
                fontWeight: '600'
              }}>
                IMPORTANT : Ce lien est valable pendant 1 heure.
              </Text>
            </Section>

            <Text style={{ 
              fontSize: '14px',
              color: '#6B7280',
              lineHeight: '20px',
              marginBottom: '12px'
            }}>
              Si vous n&apos;avez pas demandé cette réinitialisation, vous pouvez ignorer cet email en toute sécurité.
            </Text>

            <Text style={{ 
              fontSize: '14px',
              color: '#6B7280',
              lineHeight: '20px',
              marginBottom: '0'
            }}>
              Pour des raisons de sécurité, nous vous conseillons de ne pas partager ce lien avec qui que ce soit.
            </Text>
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