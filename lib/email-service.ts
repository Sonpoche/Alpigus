// lib/email-service.ts
import { renderAsync } from '@react-email/components';
import resend from '@/lib/resend';
import WelcomeEmail from '@/components/emails/welcome-email';
import ResetPasswordEmail from '@/components/emails/reset-password-email';
import { UserRole } from '@prisma/client';

type WelcomeEmailRole = 'CLIENT' | 'PRODUCER';

export class EmailService {
  static async sendWelcomeEmail(email: string, name: string, role?: UserRole | null) {
    try {
      console.log('Début de la préparation de l\'email de bienvenue', {
        destinataire: email,
        nom: name,
        role: role
      });

      let welcomeRole: WelcomeEmailRole | undefined;
      if (role === UserRole.CLIENT) welcomeRole = 'CLIENT';
      if (role === UserRole.PRODUCER) welcomeRole = 'PRODUCER';

      const html = await renderAsync(
        WelcomeEmail({ name, role: welcomeRole })
      );

      console.log('Email HTML généré avec succès');

      if (!process.env.RESEND_API_KEY) {
        throw new Error('RESEND_API_KEY non définie dans les variables d\'environnement');
      }

      await resend.emails.send({
        from: 'Mushroom Marketplace <no-reply@resend.dev>',
        to: email,
        subject: 'Bienvenue sur Mushroom Marketplace !',
        html: html,
        headers: {
          'X-Entity-Ref-ID': `welcome_${new Date().getTime()}_${email}`,
        },
        tags: [
          {
            name: 'type',
            value: 'welcome_email'
          },
          {
            name: 'provider',
            value: role ? 'credentials' : 'google'
          }
        ]
      });

      console.log('Email de bienvenue envoyé avec succès', {
        destinataire: email
      });

    } catch (error) {
      console.error('Erreur lors de l\'envoi de l\'email de bienvenue:', {
        destinataire: email,
        erreur: error,
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }

  static async sendPasswordResetEmail(email: string, name: string, resetLink: string) {
    try {
      console.log('Début de la préparation de l\'email de réinitialisation', {
        destinataire: email
      });

      const html = await renderAsync(
        ResetPasswordEmail({ name, resetLink })
      );

      await resend.emails.send({
        from: 'Mushroom Marketplace <no-reply@resend.dev>',
        to: email,
        subject: 'Réinitialisation de votre mot de passe',
        html: html,
        headers: {
          'X-Entity-Ref-ID': `reset_${new Date().getTime()}_${email}`,
        },
        tags: [
          {
            name: 'type',
            value: 'reset_password'
          }
        ]
      });

      console.log('Email de réinitialisation envoyé avec succès', {
        destinataire: email
      });

    } catch (error) {
      console.error('Erreur lors de l\'envoi de l\'email de réinitialisation:', {
        destinataire: email,
        erreur: error,
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }
}