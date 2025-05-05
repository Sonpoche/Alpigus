// app/api/orders/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { apiAuthMiddleware } from "@/lib/api-middleware"
import { Session } from "next-auth"
import { OrderStatus, Prisma } from "@prisma/client"

export const GET = apiAuthMiddleware(async (req: NextRequest, session: Session) => {
  try {
    const { searchParams } = new URL(req.url)
    const statusParam = searchParams.get('status') as OrderStatus | null
    const page = parseInt(searchParams.get('page') ?? '1')
    const limit = parseInt(searchParams.get('limit') ?? '10')

    // Base de la requête
    const baseWhere: Prisma.OrderWhereInput = {}

    // Ajouter le filtre de statut s'il est spécifié
    if (statusParam) {
      baseWhere.status = statusParam
    }

    // Ajouter le filtre par utilisateur pour les clients
    if (session.user.role === 'CLIENT') {
      baseWhere.userId = session.user.id
    }

    // Pour les producteurs, on utilise une approche différente
    if (session.user.role === 'PRODUCER') {
      // Rediriger vers l'endpoint spécifique pour les producteurs
      return NextResponse.redirect(new URL('/api/orders/producer', req.url))
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

    return NextResponse.json({
      orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error("Erreur lors de la récupération des commandes:", error)
    return new NextResponse("Erreur lors de la récupération des commandes", { status: 500 })
  }
})

export const POST = apiAuthMiddleware(async (req: NextRequest, session: Session) => {
  try {
    const body = await req.json()
    
    // Vérifier s'il y a des items dans le panier
    let cartItems: {
      productId: string;
      quantity: number;
      price: number;
    }[] = [];
    
    try {
      // Récupérer les items du panier actuel de l'utilisateur
      const cart = await prisma.order.findFirst({
        where: {
          userId: session.user.id,
          status: "PENDING"
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
        cartItems = cart.items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price
        }));
      }
    } catch (e) {
      console.error("Erreur lors de la récupération du panier:", e);
    }
    
    // Utiliser les items du body ou du panier existant
    const itemsToCreate = (body.items && body.items.length > 0) ? body.items : cartItems;
    
    // Créer une commande vide ou avec les items fournis
    const order = await prisma.order.create({
      data: {
        userId: session.user.id,
        total: 0,
        status: "PENDING",
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

    return NextResponse.json(order)
  } catch (error) {
    console.error("Erreur création commande:", error)
    return new NextResponse("Erreur lors de la création de la commande", { status: 500 })
  }
})