// app/api/orders/route.ts - CORRECTION pour exclure les DRAFT de façon cohérente
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

   // ✅ CORRECTION: Base de la requête avec exclusion systématique des DRAFT
   const baseWhere: any = {
     ...(session.user.role === 'CLIENT' && {
       userId: session.user.id
     }),
     // Toujours exclure les DRAFT sauf si explicitement demandé
     ...(statusParam !== OrderStatus.DRAFT && {
       status: statusParam ? statusParam : { not: OrderStatus.DRAFT }
     }),
     // Si on demande explicitement les DRAFT, les inclure
     ...(statusParam === OrderStatus.DRAFT && {
       status: OrderStatus.DRAFT
     })
   }

   console.log("Filtres appliqués pour les commandes:", baseWhere)

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
    
    // Créer la nouvelle commande
    let totalAmount = 0;
    
    // Calculer le montant total des items
    for (const item of itemsToCreate) {
      totalAmount += item.price * item.quantity;
    }
    
    // Créer la commande
    const order = await prisma.order.create({
      data: {
        userId: session.user.id,
        total: totalAmount,
        status: OrderStatus.DRAFT
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
    
    await logDebug("Commande créée avec ID:", order.id);
    
    // Créer les items de commande
    for (const item of itemsToCreate) {
      await prisma.orderItem.create({
        data: {
          orderId: order.id,
          productId: item.productId,
          quantity: item.quantity,
          price: item.price
        }
      });
    }
    
    // Récupérer la commande mise à jour avec les items
    const updatedOrder = await prisma.order.findUnique({
      where: { id: order.id },
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
    
    await logDebug("Contenu de l'objet order.items:", updatedOrder?.items);
    
    // Vérifier que la commande a été créée correctement
    const verifyItems = await prisma.orderItem.findMany({
      where: { orderId: order.id }
    });
    
    await logDebug("Vérification des items dans la base de données:", verifyItems);
    
    await logDebug("Commande créée", {
      id: order.id,
      itemsCount: verifyItems.length,
      bookingsCount: updatedOrder?.bookings.length || 0
    });
    
    // Si la commande a des items, envoyer une notification
    if (verifyItems.length > 0) {
      try {
        await NotificationService.sendNewOrderNotification(updatedOrder!);
      } catch (notificationError) {
        await logDebug("Erreur lors de l'envoi de notification:", notificationError);
        // Ne pas faire échouer la création de commande pour une erreur de notification
      }
    } else {
      await logDebug("Aucun item dans la commande - pas de notification à créer");
    }

    return NextResponse.json(updatedOrder);
  } catch (error) {
    await logDebug("Erreur lors de la création de commande:", error);
    console.error("Erreur lors de la création de la commande:", error)
    return new NextResponse("Erreur lors de la création de la commande", { status: 500 })
  }
})