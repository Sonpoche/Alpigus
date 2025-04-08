// app/api/orders/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { apiAuthMiddleware } from "@/lib/api-middleware"
import { Session } from "next-auth"
import { OrderStatus, ProductType, Prisma } from "@prisma/client"
import { NotificationService } from '@/lib/notification-service'

interface OrderItem {
 productId: string
 quantity: number
 price: number
}

interface DeliveryBooking {
 slotId: string
 quantity: number
}

interface CreateOrderBody {
 items: {
   productId: string
   quantity: number
   slotId?: string
 }[]
}

export const GET = apiAuthMiddleware(async (req: NextRequest, session: Session) => {
 try {
   const { searchParams } = new URL(req.url)
   const statusParam = searchParams.get('status') as OrderStatus | null
   const page = parseInt(searchParams.get('page') ?? '1')
   const limit = parseInt(searchParams.get('limit') ?? '10')

   // Base de la requête
   const baseWhere: any = {
     ...(session.user.role === 'CLIENT' && {
       userId: session.user.id
     })
   }

   // Ajouter le filtre de statut s'il est spécifié
   if (statusParam) {
     baseWhere.status = statusParam
   }

   // Récupérer les commandes avec pagination
   const [orders, total] = await Promise.all([
     prisma.order.findMany({
       where: baseWhere,
       include: {
         user: {
           select: {
             name: true,
             email: true,
             phone: true,
           }
         },
         items: {
           include: {
             product: true
           }
         },
         bookings: {
           include: {
             deliverySlot: {
               include: {
                 product: true
               }
             }
           }
         }
       },
       orderBy: {
         createdAt: 'desc'
       },
       skip: (page - 1) * limit,
       take: limit
     }),
     prisma.order.count({
       where: baseWhere
     })
   ])

   return NextResponse.json(orders)
 } catch (error) {
   console.error("Erreur lors de la récupération des commandes:", error)
   return new NextResponse("Erreur lors de la récupération des commandes", { status: 500 })
 }
})

export const POST = apiAuthMiddleware(async (req: NextRequest, session: Session) => {
  try {
    const body = await req.json()
    
    // Créer une commande vide ou avec les items fournis
    const order = await prisma.order.create({
      data: {
        userId: session.user.id,
        total: 0,
        status: "PENDING",
        // Si des items sont fournis, les ajouter
        ...(body.items && body.items.length > 0 && {
          items: {
            create: body.items.map((item: any) => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.price || 0
            }))
          }
        })
      },
      include: {
        items: {
          include: {
            product: {
              include: {
                producer: true
              }
            }
          }
        },
        bookings: {
          include: {
            deliverySlot: {
              include: {
                product: {
                  include: {
                    producer: true
                  }
                }
              }
            }
          }
        },
        user: {
          select: {
            name: true,
            email: true,
            phone: true
          }
        }
      }
    })

    // Si la commande contient des items, envoyer une notification
    if ((order.items && order.items.length > 0) || (order.bookings && order.bookings.length > 0)) {
      await NotificationService.sendNewOrderNotification(order)
    }

    return NextResponse.json(order)
  } catch (error) {
    console.error("Erreur création commande:", error)
    return new NextResponse("Erreur lors de la création de la commande", { status: 500 })
  }
})