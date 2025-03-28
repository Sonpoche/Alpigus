// app/api/products/[id]/stats/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { apiAuthMiddleware } from "@/lib/api-middleware"
import { Session } from "next-auth"

export const GET = apiAuthMiddleware(
  async (
    req: NextRequest,
    session: Session,
    context: { params: { [key: string]: string } }
  ) => {
    try {
      const productId = context.params.id;
      
      // Vérifier que le produit existe
      const product = await prisma.product.findUnique({
        where: { id: productId },
        include: {
          producer: true,
          orderItems: true,
          deliverySlots: {
            include: {
              bookings: true
            }
          }
        }
      })

      if (!product) {
        return new NextResponse("Produit non trouvé", { status: 404 })
      }

      // Pour les producteurs, vérifier qu'ils sont propriétaires du produit
      if (session.user.role === 'PRODUCER' && product.producer.userId !== session.user.id) {
        return new NextResponse("Non autorisé", { status: 403 })
      }

      // Calculer les statistiques du produit
      const totalOrderItems = product.orderItems.length;
      const totalQuantitySold = product.orderItems.reduce(
        (sum, item) => sum + item.quantity, 
        0
      );
      
      const totalRevenue = product.orderItems.reduce(
        (sum, item) => sum + (item.price * item.quantity), 
        0
      );

      // Stats des livraisons
      const totalDeliverySlots = product.deliverySlots.length;
      
      const upcomingDeliverySlots = product.deliverySlots.filter(
        slot => new Date(slot.date) > new Date()
      ).length;
      
      const totalBookings = product.deliverySlots.reduce(
        (sum, slot) => sum + slot.bookings.length, 
        0
      );

      // Répartition des ventes par mois (6 derniers mois)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      const ordersByMonth = await prisma.orderItem.findMany({
        where: {
          productId,
          order: {
            createdAt: {
              gte: sixMonthsAgo
            }
          }
        },
        include: {
          order: true
        }
      });

      // Agréger les ventes par mois
      const salesByMonth: { [key: string]: { orders: number, quantity: number, revenue: number } } = {};
      
      ordersByMonth.forEach(item => {
        const month = item.order.createdAt.toISOString().slice(0, 7); // Format "YYYY-MM"
        
        if (!salesByMonth[month]) {
          salesByMonth[month] = { 
            orders: 0, 
            quantity: 0, 
            revenue: 0 
          };
        }
        
        salesByMonth[month].orders += 1;
        salesByMonth[month].quantity += item.quantity;
        salesByMonth[month].revenue += item.price * item.quantity;
      });

      return NextResponse.json({
        totalOrders: totalOrderItems,
        totalQuantitySold,
        totalRevenue,
        avgOrderValue: totalOrderItems > 0 ? totalRevenue / totalOrderItems : 0,
        deliveryStats: {
          totalSlots: totalDeliverySlots,
          upcomingSlots: upcomingDeliverySlots,
          totalBookings
        },
        salesByMonth
      })
    } catch (error) {
      console.error("Erreur lors de la récupération des statistiques:", error)
      return new NextResponse(
        "Erreur lors de la récupération des statistiques", 
        { status: 500 }
      )
    }
  },
  ["ADMIN", "PRODUCER"] // Seuls les admins et les producteurs concernés peuvent accéder aux stats
)