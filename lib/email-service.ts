// lib/email-service.ts
import { renderAsync } from '@react-email/components';
import resend from '@/lib/resend';
import WelcomeEmail from '@/components/emails/welcome-email';
import ResetPasswordEmail from '@/components/emails/reset-password-email';
import { UserRole } from '@prisma/client';

type WelcomeEmailRole = 'CLIENT' | 'PRODUCER';

// Fonction utilitaire pour l'envoi d'emails
async function sendEmail(to: string, subject: string, htmlContent: string, from: string = 'Mushroom Marketplace <no-reply@resend.dev>') {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY non définie dans les variables d\'environnement');
  }

  try {
    await resend.emails.send({
      from,
      to,
      subject,
      html: htmlContent,
      headers: {
        'X-Entity-Ref-ID': `email_${new Date().getTime()}_${to}`,
      }
    });
    
    console.log('Email envoyé avec succès à:', to);
    return true;
  } catch (error) {
    console.error('Erreur lors de l\'envoi de l\'email:', {
      destinataire: to,
      sujet: subject,
      erreur: error,
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}

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

/**
  * Envoie un email de confirmation de commande au client
  */
static async sendOrderConfirmationEmail(email: string, name: string, orderId: string, orderDetails: any) {
  try {
    console.log('Préparation de l\'email de confirmation de commande', {
      destinataire: email,
      orderId
    });

    // Vous pouvez créer un composant React pour cet email, mais pour l'instant, utilisons du HTML simple
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #FF5A5F;">Confirmation de commande</h1>
        <p>Bonjour ${name},</p>
        <p>Nous avons bien reçu votre commande #${orderId.substring(0, 8)}. Merci pour votre achat !</p>
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3>Résumé de votre commande</h3>
          <p>Montant total: ${orderDetails.total.toFixed(2)} CHF</p>
          <p>Date de commande: ${new Date(orderDetails.createdAt).toLocaleDateString('fr-FR')}</p>
        </div>
        <p>Vous pouvez suivre l'état de votre commande dans votre espace client.</p>
        <p>À bientôt sur Mushroom Marketplace !</p>
        <p>L'équipe Mushroom Marketplace</p>
      </div>
    `;

    await resend.emails.send({
      from: 'Mushroom Marketplace <no-reply@resend.dev>',
      to: email,
      subject: `Confirmation de votre commande #${orderId.substring(0, 8)}`,
      html: html,
      headers: {
        'X-Entity-Ref-ID': `order_conf_${orderId}_${new Date().getTime()}`,
      },
      tags: [
        {
          name: 'type',
          value: 'order_confirmation'
        }
      ]
    });

    console.log('Email de confirmation de commande envoyé avec succès', {
      destinataire: email,
      orderId
    });
  } catch (error) {
    console.error('Erreur lors de l\'envoi de l\'email de confirmation de commande:', {
      destinataire: email,
      orderId,
      erreur: error,
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}

/**
 * Envoie un email de changement de statut de commande
 */
static async sendOrderStatusUpdateEmail(email: string, name: string, orderId: string, status: string) {
  try {
    console.log('Préparation de l\'email de mise à jour de commande', {
      destinataire: email,
      orderId,
      status
    });

    // Traduire le statut pour l'affichage
    const statusLabels: Record<string, string> = {
      'PENDING': 'En attente',
      'CONFIRMED': 'Confirmée',
      'SHIPPED': 'Expédiée',
      'DELIVERED': 'Livrée',
      'CANCELLED': 'Annulée',
      'INVOICE_PENDING': 'En attente de paiement',
      'INVOICE_PAID': 'Payée'
    };

    const statusLabel = statusLabels[status] || status;

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #FF5A5F;">Mise à jour de votre commande</h1>
        <p>Bonjour ${name},</p>
        <p>Le statut de votre commande #${orderId.substring(0, 8)} a été mis à jour.</p>
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3>Nouveau statut: ${statusLabel}</h3>
          <p>Date de mise à jour: ${new Date().toLocaleDateString('fr-FR')}</p>
        </div>
        <p>Vous pouvez suivre l'état de votre commande dans votre espace client.</p>
        <p>À bientôt sur Mushroom Marketplace !</p>
        <p>L'équipe Mushroom Marketplace</p>
      </div>
    `;

    await resend.emails.send({
      from: 'Mushroom Marketplace <no-reply@resend.dev>',
      to: email,
      subject: `Mise à jour de votre commande #${orderId.substring(0, 8)}`,
      html: html,
      headers: {
        'X-Entity-Ref-ID': `order_update_${orderId}_${new Date().getTime()}`,
      },
      tags: [
        {
          name: 'type',
          value: 'order_status_update'
        }
      ]
    });

    console.log('Email de mise à jour de commande envoyé avec succès', {
      destinataire: email,
      orderId,
      status
    });
  } catch (error) {
    console.error('Erreur lors de l\'envoi de l\'email de mise à jour de commande:', {
      destinataire: email,
      orderId,
      status,
      erreur: error,
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}

/**
 * Envoie un email de notification de nouvelle commande au producteur
 */
static async sendNewOrderNotificationEmail(email: string, name: string, orderId: string, orderDetails: any) {
  try {
    console.log('Préparation de l\'email de notification de commande', {
      destinataire: email,
      orderId
    });

    // Calculer le total pour ce producteur
    const total = orderDetails.items.reduce((sum: number, item: any) => {
      return sum + (item.quantity * item.price);
    }, 0);

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #FF5A5F;">Nouvelle commande reçue</h1>
        <p>Bonjour ${name},</p>
        <p>Vous avez reçu une nouvelle commande #${orderId.substring(0, 8)}.</p>
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3>Détails de la commande</h3>
          <p>Montant total: ${total.toFixed(2)} CHF</p>
          <p>Nombre d'articles: ${orderDetails.items.length}</p>
          <p>Date de commande: ${new Date(orderDetails.createdAt).toLocaleDateString('fr-FR')}</p>
        </div>
        <p>Veuillez vous connecter à votre espace producteur pour traiter cette commande.</p>
        <p>L'équipe Mushroom Marketplace</p>
      </div>
    `;

    await resend.emails.send({
      from: 'Mushroom Marketplace <no-reply@resend.dev>',
      to: email,
      subject: `Nouvelle commande #${orderId.substring(0, 8)}`,
      html: html,
      headers: {
        'X-Entity-Ref-ID': `new_order_notif_${orderId}_${new Date().getTime()}`,
      },
      tags: [
        {
          name: 'type',
          value: 'new_order_notification'
        }
      ]
    });

    console.log('Email de notification de nouvelle commande envoyé avec succès', {
      destinataire: email,
      orderId
    });
  } catch (error) {
    console.error('Erreur lors de l\'envoi de l\'email de notification de commande:', {
      destinataire: email,
      orderId,
      erreur: error,
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}

/**
 * Envoie une facture par email
 */
static async sendInvoiceEmail(email: string, name: string, orderId: string, invoiceId: string, amount: number, dueDate: Date) {
  try {
    console.log('Préparation de l\'email de facture', {
      destinataire: email,
      orderId,
      invoiceId
    });

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #FF5A5F;">Votre facture</h1>
        <p>Bonjour ${name},</p>
        <p>Voici votre facture pour la commande #${orderId.substring(0, 8)}.</p>
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3>Détails de la facture</h3>
          <p>Numéro de facture: ${invoiceId.substring(0, 8)}</p>
          <p>Montant: ${amount.toFixed(2)} CHF</p>
          <p>Date d'échéance: ${dueDate.toLocaleDateString('fr-FR')}</p>
        </div>
        <p>Vous pouvez régler cette facture en vous connectant à votre espace client.</p>
        <p>L'équipe Mushroom Marketplace</p>
      </div>
    `;

    await resend.emails.send({
      from: 'Mushroom Marketplace <no-reply@resend.dev>',
      to: email,
      subject: `Facture #${invoiceId.substring(0, 8)} pour votre commande`,
      html: html,
      headers: {
        'X-Entity-Ref-ID': `invoice_${invoiceId}_${new Date().getTime()}`,
      },
      tags: [
        {
          name: 'type',
          value: 'invoice'
        }
      ]
    });

    console.log('Email de facture envoyé avec succès', {
      destinataire: email,
      invoiceId
    });
  } catch (error) {
    console.error('Erreur lors de l\'envoi de l\'email de facture:', {
      destinataire: email,
      invoiceId,
      erreur: error,
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}

/**
 * Envoie un rappel de paiement de facture
 */
static async sendInvoiceReminderEmail(email: string, name: string, invoiceId: string, amount: number, dueDate: Date) {
  try {
    console.log('Préparation de l\'email de rappel de facture', {
      destinataire: email,
      invoiceId
    });

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #FF5A5F;">Rappel de paiement</h1>
        <p>Bonjour ${name},</p>
        <p>Nous vous rappelons que votre facture #${invoiceId.substring(0, 8)} est en attente de règlement.</p>
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3>Détails de la facture</h3>
          <p>Numéro de facture: ${invoiceId.substring(0, 8)}</p>
          <p>Montant: ${amount.toFixed(2)} CHF</p>
          <p>Date d'échéance: ${dueDate.toLocaleDateString('fr-FR')}</p>
        </div>
        <p>Veuillez effectuer le paiement dès que possible pour éviter tout retard dans le traitement de votre commande.</p>
        <p>L'équipe Mushroom Marketplace</p>
      </div>
    `;

    await resend.emails.send({
      from: 'Mushroom Marketplace <no-reply@resend.dev>',
      to: email,
      subject: `Rappel de paiement - Facture #${invoiceId.substring(0, 8)}`,
      html: html,
      headers: {
        'X-Entity-Ref-ID': `invoice_reminder_${invoiceId}_${new Date().getTime()}`,
      },
      tags: [
        {
          name: 'type',
          value: 'invoice_reminder'
        }
      ]
    });

    console.log('Email de rappel de facture envoyé avec succès', {
      destinataire: email,
      invoiceId
    });
  } catch (error) {
    console.error('Erreur lors de l\'envoi de l\'email de rappel de facture:', {
      destinataire: email,
      invoiceId,
      erreur: error,
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}

/**
 * Envoie un email de confirmation d'inscription au producteur
 */
static async sendProducerApprovalEmail(email: string, name: string) {
  try {
    console.log('Préparation de l\'email d\'approbation producteur', {
      destinataire: email
    });

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #FF5A5F;">Compte producteur approuvé</h1>
        <p>Bonjour ${name},</p>
        <p>Nous avons le plaisir de vous informer que votre compte producteur a été approuvé.</p>
        <p>Vous pouvez maintenant accéder à toutes les fonctionnalités producteur et commencer à vendre vos produits sur Mushroom Marketplace.</p>
        <div style="margin: 20px 0;">
          <a href="${process.env.NEXTAUTH_URL}/producer/dashboard" style="background-color: #FF5A5F; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            Accéder à mon espace producteur
          </a>
        </div>
        <p>Si vous avez des questions ou avez besoin d'aide, n'hésitez pas à contacter notre équipe de support.</p>
        <p>L'équipe Mushroom Marketplace</p>
      </div>
    `;

    await resend.emails.send({
      from: 'Mushroom Marketplace <no-reply@resend.dev>',
      to: email,
      subject: 'Votre compte producteur a été approuvé',
      html: html,
      headers: {
        'X-Entity-Ref-ID': `producer_approval_${new Date().getTime()}_${email}`,
      },
      tags: [
        {
          name: 'type',
          value: 'producer_approval'
        }
      ]
    });

    console.log('Email d\'approbation producteur envoyé avec succès', {
      destinataire: email
    });
  } catch (error) {
    console.error('Erreur lors de l\'envoi de l\'email d\'approbation producteur:', {
      destinataire: email,
      erreur: error,
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}

/**
 * Envoie un rappel concernant une commande
 */
static async sendOrderReminder(
  email: string,
  name: string,
  orderId: string,
  recipientType: 'producteur' | 'client'
): Promise<void> {
  try {
    console.log('Préparation de l\'email de rappel de commande', {
      destinataire: email,
      orderId,
      type: recipientType
    });

    const subject = recipientType === 'producteur' 
      ? 'Rappel concernant une commande à traiter'
      : 'Mise à jour sur votre commande';
    
    const html = recipientType === 'producteur'
      ? `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #FF5A5F;">Rappel - Commande à traiter</h1>
          <p>Bonjour ${name},</p>
          <p>Nous vous rappelons qu'une commande est en attente de traitement de votre part.</p>
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3>Détails de la commande</h3>
            <p>Numéro de commande: #${orderId.substring(0, 8)}</p>
          </div>
          <p>Merci de la traiter dès que possible pour assurer la satisfaction de nos clients.</p>
          <p>Vous pouvez accéder à cette commande depuis votre espace producteur.</p>
          <p>L'équipe Mushroom Marketplace</p>
        </div>
      `
      : `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #FF5A5F;">Mise à jour sur votre commande</h1>
          <p>Bonjour ${name},</p>
          <p>Nous vous informons que votre commande est suivie par notre équipe.</p>
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3>Détails de la commande</h3>
            <p>Numéro de commande: #${orderId.substring(0, 8)}</p>
          </div>
          <p>Vous recevrez prochainement une mise à jour de son statut.</p>
          <p>L'équipe Mushroom Marketplace</p>
        </div>
      `;

    await resend.emails.send({
      from: 'Mushroom Marketplace <no-reply@resend.dev>',
      to: email,
      subject,
      html,
      headers: {
        'X-Entity-Ref-ID': `order_reminder_${orderId}_${new Date().getTime()}`,
      },
      tags: [
        {
          name: 'type',
          value: 'order_reminder'
        }
      ]
    });

    console.log('Email de rappel de commande envoyé avec succès', {
      destinataire: email,
      orderId,
      type: recipientType
    });
  } catch (error) {
    console.error('Erreur lors de l\'envoi de l\'email de rappel de commande:', {
      destinataire: email,
      orderId,
      type: recipientType,
      erreur: error,
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}

/**
 * Envoie un email de notification d'alerte de stock bas
 */
static async sendLowStockAlertEmail(email: string, name: string, productId: string, productName: string, currentStock: number, unit: string) {
  try {
    console.log('Préparation de l\'email d\'alerte de stock bas', {
      destinataire: email,
      productId,
      productName
    });

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #FF5A5F;">Alerte - Stock bas</h1>
        <p>Bonjour ${name},</p>
        <p>Nous vous informons que le stock du produit suivant est bas :</p>
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3>${productName}</h3>
          <p>Stock actuel: ${currentStock} ${unit}</p>
        </div>
        <p>Pensez à réapprovisionner votre stock pour éviter les ruptures.</p>
        <div style="margin: 20px 0;">
          <a href="${process.env.NEXTAUTH_URL}/producer/products/${productId}" style="background-color: #FF5A5F; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            Gérer le produit
          </a>
        </div>
        <p>L'équipe Mushroom Marketplace</p>
      </div>
    `;

    await resend.emails.send({
      from: 'Mushroom Marketplace <no-reply@resend.dev>',
      to: email,
      subject: `Alerte - Stock bas pour ${productName}`,
      html: html,
      headers: {
        'X-Entity-Ref-ID': `low_stock_${productId}_${new Date().getTime()}`,
      },
      tags: [
        {
          name: 'type',
          value: 'low_stock_alert'
        }
      ]
    });

    console.log('Email d\'alerte de stock bas envoyé avec succès', {
      destinataire: email,
      productId,
      productName
    });
  } catch (error) {
    console.error('Erreur lors de l\'envoi de l\'email d\'alerte de stock bas:', {
      destinataire: email,
      productId,
      productName,
      erreur: error,
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}

/**
 * Envoie un email administratif
 */
static async sendAdminEmail(email: string, subject: string, content: string) {
  try {
    console.log('Préparation de l\'email administratif', {
      destinataire: email,
      sujet: subject
    });

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #FF5A5F;">Communication Mushroom Marketplace</h1>
        ${content}
        <p style="margin-top: 20px;">L'équipe Mushroom Marketplace</p>
      </div>
    `;

    await resend.emails.send({
      from: 'Mushroom Marketplace Admin <admin@resend.dev>',
      to: email,
      subject: subject,
      html: html,
      headers: {
        'X-Entity-Ref-ID': `admin_email_${new Date().getTime()}_${email}`,
      },
      tags: [
        {
          name: 'type',
          value: 'admin_communication'
        }
      ]
    });

    console.log('Email administratif envoyé avec succès', {
      destinataire: email,
      sujet: subject
    });
  } catch (error) {
    console.error('Erreur lors de l\'envoi de l\'email administratif:', {
      destinataire: email,
      sujet: subject,
      erreur: error,
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}
}