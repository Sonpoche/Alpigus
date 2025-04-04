// app/api/bookings/cleanup/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { apiAuthMiddleware } from "@/lib/api-middleware"
import { Session } from "next-auth"

export const POST = apiAuthMiddleware(async (
  req: NextRequest,
  session: Session
) => {
  try {
    // Recherche des réservations expirées
    const expiredBookings = await prisma.booking.findMany({
      where: {
        status: "TEMPORARY",
        expiresAt: {
          lt: new Date() // Réservations dont la date d'expiration est dépassée
        }
      },
      include: {
        deliverySlot: {
          include: {
            product: {
              include: {
                stock: true // S'assurer d'inclure la relation stock
              }
            }
          }
        }
      }
    });

    if (expiredBookings.length === 0) {
      return NextResponse.json({
        message: "Aucune réservation expirée à nettoyer",
        cleaned: 0
      });
    }

    // Pour chaque réservation expirée, effectuer une transaction
    const results = await Promise.all(
      expiredBookings.map(booking => 
        prisma.$transaction(async (tx) => {
          // 1. Mettre à jour la réservation comme annulée
          await tx.booking.update({
            where: { id: booking.id },
            data: { status: "CANCELLED" }
          });

          // 2. Libérer le créneau de livraison
          await tx.deliverySlot.update({
            where: { id: booking.slotId },
            data: {
              reserved: {
                decrement: booking.quantity
              }
            }
          });

          // 3. Retourner la quantité au stock si nécessaire
          if (booking.deliverySlot.product.stock) {
            await tx.stock.update({
              where: { productId: booking.deliverySlot.product.id },
              data: {
                quantity: {
                  increment: booking.quantity
                }
              }
            });
          }

          return booking.id;
        })
      )
    );

    // S'assurer que toutes les mises à jour sont persistées
    await prisma.$disconnect();

    return NextResponse.json({
      message: `${results.length} réservations expirées ont été nettoyées`,
      cleaned: results.length,
      bookingIds: results
    });
  } catch (error) {
    console.error("Erreur lors du nettoyage des réservations:", error);
    
    // Essayer de se déconnecter proprement en cas d'erreur
    try {
      await prisma.$disconnect();
    } catch (disconnectError) {
      console.error("Erreur lors de la déconnexion de Prisma:", disconnectError);
    }
    
    return new NextResponse(
      "Erreur lors du nettoyage des réservations expirées", 
      { status: 500 }
    );
  }
});