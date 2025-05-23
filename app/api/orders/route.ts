// app/api/orders/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { apiAuthMiddleware } from "@/lib/api-middleware"
import { Session } from "next-auth"
import { OrderStatus, ProductType, Prisma } from "@prisma/client"
import { NotificationService } from '@/lib/notification-service'
import fs from 'fs/promises';
import path from 'path';

// Fonction d'aide pour les logs de débogage
async function logDebug(message: string, data?: any): Promise<void> {
  try {
    const logMessage = `[${new Date().toISOString()}] ${message} ${data ? JSON.stringify(data, null, 2) : ''}`;
    await fs.appendFile(
      path.join(process.cwd(), 'debug.log'), 
      logMessage + '\n'
    );
  } catch (error) {
    console.error('Erreur d\'écriture dans le fichier de log:', error);
  }
}

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
   } else {
     // Par défaut, n'inclure que les commandes réellement validées
     // Exclure à la fois DRAFT (paniers) et PENDING (en attente de paiement)
     baseWhere.status = {
       notIn: [OrderStatus.DRAFT, OrderStatus.PENDING]
     }
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
         },
         invoice: true
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

   // Retourner directement le tableau d'ordres, comme attendu par le client
   return NextResponse.json(orders)
 } catch (error) {
   console.error("Erreur lors de la récupération des commandes:", error)
   return new NextResponse("Erreur lors de la récupération des commandes", { status: 500 })
 }
})

export const POST = apiAuthMiddleware(async (req: NextRequest, session: Session) => {
  try {
    const body = await req.json()
    await logDebug("Requête de création de commande reçue", body);
    
    // Si le body contient des items, les logger en détail
    if (body.items && body.items.length > 0) {
      await logDebug("Détails des items reçus dans la requête:", body.items);
    } else {
      await logDebug("ATTENTION: Requête reçue sans items");
    }
    
    // Vérifier s'il y a des items dans le panier
    let cartItems: {
      productId: string;
      quantity: number;
      price: number;
    }[] = [];
    try {
      // Récupérer les items du panier actuel de l'utilisateur (DRAFT)
      const cart = await prisma.order.findFirst({
        where: {
          userId: session.user.id,
          status: OrderStatus.DRAFT
        },
        include: {
          items: {
            include: {
              product: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
      
      if (cart && cart.items.length > 0) {
        await logDebug("Items trouvés dans le panier existant:", cart.items);
        cartItems = cart.items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price
        }));
      } else {
        await logDebug("Aucun panier existant avec des items trouvé");
      }
    } catch (e) {
      const error = e as Error;
      await logDebug("Erreur lors de la récupération du panier:", {
        error: error.message,
        stack: error.stack
      });
    }
    
    // Utiliser les items du body ou du panier existant
    const itemsToCreate = (body.items && body.items.length > 0) ? body.items : cartItems;
    
    await logDebug("Items qui seront utilisés pour créer la commande:", itemsToCreate);
    
    // Créer une commande vide ou avec les items fournis
    const order = await prisma.order.create({
      data: {
        userId: session.user.id,
        total: 0,
        status: OrderStatus.DRAFT,  // Toujours utiliser DRAFT pour les paniers
        // Si des items sont fournis, les ajouter
        ...(itemsToCreate.length > 0 && {
          items: {
            create: itemsToCreate.map((item: any) => ({
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
        user: {
          select: {
            name: true,
            email: true,
            phone: true
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
        }
      }
    });

    await logDebug("Panier créé avec ID:", order.id);
    await logDebug("Contenu de l'objet order.items:", order.items);
    
    // Vérification supplémentaire des items du panier dans la base de données
    const itemsInDb = await prisma.orderItem.findMany({
      where: { orderId: order.id },
      include: { product: true }
    });
    await logDebug("Vérification des items dans la base de données:", itemsInDb);

    await logDebug("Panier créé", { 
      id: order.id, 
      itemsCount: order.items?.length || 0,
      bookingsCount: order.bookings?.length || 0
    });

    // Ne pas envoyer de notifications car c'est juste un panier (DRAFT)

    return NextResponse.json(order)
  } catch (e) {
    // Correction pour TypeScript: erreur de type unknown
    const error = e as Error;
    await logDebug("Erreur création commande", { 
      error: error.message, 
      stack: error.stack 
    });
    console.error("Erreur création commande:", error)
    return new NextResponse("Erreur lors de la création de la commande", { status: 500 })
  }
})