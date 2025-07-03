// app/api/wishlist/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"

// GET - Récupérer tous les favoris de l'utilisateur
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return new NextResponse("Non authentifié", { status: 401 })
    }

    const wishlistItems = await prisma.wishlist.findMany({
      where: {
        userId: session.user.id
      },
      include: {
        product: {
          include: {
            producer: {
              select: {
                companyName: true,
                id: true
              }
            },
            stock: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(wishlistItems)
  } catch (error) {
    console.error('Erreur lors de la récupération des favoris:', error)
    return new NextResponse("Erreur serveur", { status: 500 })
  }
}

// POST - Ajouter un produit aux favoris
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return new NextResponse("Non authentifié", { status: 401 })
    }

    const { productId } = await req.json()

    if (!productId) {
      return new NextResponse("ID du produit requis", { status: 400 })
    }

    // Vérifier si le produit existe
    const product = await prisma.product.findUnique({
      where: { id: productId }
    })

    if (!product) {
      return new NextResponse("Produit non trouvé", { status: 404 })
    }

    // Vérifier si le produit n'est pas déjà dans les favoris
    const existingWishlistItem = await prisma.wishlist.findUnique({
      where: {
        userId_productId: {
          userId: session.user.id,
          productId: productId
        }
      }
    })

    if (existingWishlistItem) {
      return new NextResponse("Produit déjà dans les favoris", { status: 409 })
    }

    // Ajouter aux favoris
    const wishlistItem = await prisma.wishlist.create({
      data: {
        userId: session.user.id,
        productId: productId
      },
      include: {
        product: {
          include: {
            producer: {
              select: {
                companyName: true,
                id: true
              }
            }
          }
        }
      }
    })

    return NextResponse.json(wishlistItem)
  } catch (error) {
    console.error('Erreur lors de l\'ajout aux favoris:', error)
    return new NextResponse("Erreur serveur", { status: 500 })
  }
}