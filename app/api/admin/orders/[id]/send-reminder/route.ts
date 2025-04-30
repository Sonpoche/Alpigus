// app/api/admin/orders/[id]/send-reminder/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { apiAuthMiddleware } from "@/lib/api-middleware"
import { Session } from "next-auth"
import { EmailService } from "@/lib/email-service"
import { NotificationService } from '@/lib/notification-service'
import { OrderStatus } from '@/types/order'

export const POST = apiAuthMiddleware(
  async (
    req: NextRequest,
    session: Session,
    context: { params: { [key: string]: string } }
  ) => {
    try {
      // Vérifier que l'utilisateur est admin
      if (session.user.role !== 'ADMIN') {
        return new NextResponse("Non autorisé", { status: 403 })
      }

      const orderId = context.params.id
      
      // Récupérer la commande avec les producteurs concernés
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          user: true,
          items: {
            include: {
              product: {
                include: {
                  producer: {
                    include: {
                      user: true
                    }
                  }
                }
              }
            }
          }
        }
      })

      if (!order) {
        return new NextResponse("Commande introuvable", { status: 404 })
    }

    // Récupérer les producteurs uniques impliqués dans cette commande
    const producers = Array.from(
      new Set(
        order.items.map(item => item.product.producer.id)
      )
    ).map(producerId => 
      order.items.find(item => 
        item.product.producer.id === producerId
      )?.product.producer
    ).filter(Boolean);

    // Envoyer des notifications aux producteurs
    await Promise.all(producers.map(async producer => {
      if (!producer) return;
      
      // Créer une notification pour le producteur
      await NotificationService.createNotification({
        userId: producer.userId,
        type: 'ORDER_REMINDER',
        title: 'Rappel de commande',
        message: `Un administrateur vous rappelle de traiter la commande #${order.id.substring(0, 8)}`,
        link: `/producer/orders/${order.id}`
      });
      
      // Envoyer un email au producteur
      await EmailService.sendOrderReminder(
        producer.user.email,
        producer.user.name || 'Producteur',
        order.id,
        'producteur'
      );
    }));
    
    // Créer une notification pour le client
    await NotificationService.createNotification({
      userId: order.user.id,
      type: 'ORDER_STATUS',
      title: 'Mise à jour de commande',
      message: `Un administrateur suit votre commande #${order.id.substring(0, 8)}`,
      link: `/orders/${order.id}`
    });
    
    // Si la commande est liée à une facture impayée, envoyer un rappel spécifique
    if (order.status === OrderStatus.INVOICE_PENDING as any || order.status === OrderStatus.INVOICE_OVERDUE as any) {
        await EmailService.sendInvoiceReminderEmail(
          order.user.email,
          order.user.name || 'Client',
          order.id,
          order.total,
          new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        );
      }
    
    // Enregistrer cette action dans les logs d'administration
    await prisma.adminLog.create({
      data: {
        action: 'SEND_REMINDER',
        entityType: 'ORDER',
        entityId: order.id,
        adminId: session.user.id,
        details: JSON.stringify({
          orderStatus: order.status,
          producerIds: producers.map(p => p?.id),
          userId: order.user.id
        })
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur lors de l'envoi du rappel:", error);
    return new NextResponse("Erreur lors de l'envoi du rappel", { status: 500 });
  }
},
["ADMIN"] // Seuls les admins peuvent accéder à cet endpoint
);