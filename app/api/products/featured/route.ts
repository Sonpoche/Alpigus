// app/api/products/featured/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') ?? '6')
    
    // Récupérer un ensemble de produits disponibles (sans vérification d'authentification)
    const products = await prisma.product.findMany({
      where: {
        available: true
      },
      include: {
        producer: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
                phone: true,
              }
            }
          }
        },
        categories: true,
        stock: true,
      },
      take: limit,
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({
      products
    })
  } catch (error) {
    console.error("Erreur lors de la récupération des produits en vedette:", error)
    return new NextResponse(
      "Erreur lors de la récupération des produits en vedette", 
      { status: 500 }
    )
  }
}