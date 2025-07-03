// app/api/wishlist/[productId]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"

// DELETE - Supprimer un produit des favoris
export async function DELETE(
  req: NextRequest,
  { params }: { params: { productId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return new NextResponse("Non authentifié", { status: 401 })
    }

    const { productId } = params

    // Supprimer des favoris
    const deletedItem = await prisma.wishlist.delete({
      where: {
        userId_productId: {
          userId: session.user.id,
          productId: productId
        }
      }
    })

    return NextResponse.json({ success: true, deletedItem })
  } catch (error: any) {
    console.error('Erreur lors de la suppression des favoris:', error)
    if (error?.code === 'P2025') {
      return new NextResponse("Produit non trouvé dans les favoris", { status: 404 })
    }
    return new NextResponse("Erreur serveur", { status: 500 })
  }
}

// GET - Vérifier si un produit est dans les favoris
export async function GET(
  req: NextRequest,
  { params }: { params: { productId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ isFavorite: false })
    }

    const { productId } = params

    const wishlistItem = await prisma.wishlist.findUnique({
      where: {
        userId_productId: {
          userId: session.user.id,
          productId: productId
        }
      }
    })

    return NextResponse.json({ isFavorite: !!wishlistItem })
  } catch (error) {
    console.error('Erreur lors de la vérification des favoris:', error)
    return NextResponse.json({ isFavorite: false })
  }
}