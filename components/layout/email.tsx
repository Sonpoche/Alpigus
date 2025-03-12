// components/layout/email.tsx
import {
    Html,
    Head,
    Body,
    Container,
    Section,
    Text,
    Link,
    Preview,
    Tailwind
  } from '@react-email/components';
  import * as React from 'react';
  
  interface EmailLayoutProps {
    children: React.ReactNode;
    previewText?: string;
  }
  
  interface EmailButtonProps {
    href: string;
    children: React.ReactNode;
  }
  
  // Composant réutilisable pour les boutons d'action
  export const EmailButton = ({ href, children }: EmailButtonProps) => (
    <Link
      href={href}
      className="bg-custom-accent text-white px-6 py-3 rounded-md font-medium no-underline text-center block w-full max-w-xs mx-auto"
      style={{
        backgroundColor: '#FF5A5F',
        color: '#fff',
        textDecoration: 'none',
      }}
    >
      {children}
    </Link>
  );
  
  // Composant réutilisable pour les sections de contenu
  export const EmailSection = ({ children }: { children: React.ReactNode }) => (
    <Section className="my-8">{children}</Section>
  );
  
  export default function EmailLayout({ children, previewText = '' }: EmailLayoutProps) {
    return (
      <Html>
        <Head />
        {previewText && <Preview>{previewText + ' '}</Preview>}
        <Tailwind>
          <Body className="bg-gray-100 my-auto mx-auto font-sans">
            <Container className="bg-white border border-solid border-gray-200 rounded-lg my-8 mx-auto p-8 max-w-xl">
              {/* Header */}
              <Section className="mt-4 text-center">
                <Text className="text-3xl font-bold m-0" style={{ color: '#FF5A5F' }}>
                  🍄 Mushroom Marketplace
                </Text>
              </Section>
              
              {/* Contenu principal */}
              <Section className="mt-6">
                {children}
              </Section>
  
              {/* Footer */}
              <Section className="mt-8 pt-8 border-t border-gray-200">
                <Text className="text-gray-500 text-sm text-center m-0">
                  © {new Date().getFullYear()} Mushroom Marketplace. Tous droits réservés.
                </Text>
                <Text className="text-gray-400 text-xs text-center mt-2">
                  Cet email a été envoyé automatiquement, merci de ne pas y répondre.
                </Text>
              </Section>
            </Container>
          </Body>
        </Tailwind>
      </Html>
    );
  }
  
  // Types d'export pour réutilisation
  export type { EmailLayoutProps, EmailButtonProps };