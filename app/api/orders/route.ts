// app/api/orders/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { apiAuthMiddleware } from "@/lib/api-middleware"
import { Session } from "next-auth"
import { ProductType, Prisma } from "@prisma/client"

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
   const orders = await prisma.order.findMany({
     where: {
       ...(session.user.role === 'CLIENT' && {
         userId: session.user.id
       })
     },
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
       }
     }
   })

   return NextResponse.json(orders)
 } catch (error) {
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
      }
    })

    return NextResponse.json(order)
  } catch (error) {
    console.error("Erreur création commande:", error)
    return new NextResponse("Erreur lors de la création de la commande", { status: 500 })
  }
})