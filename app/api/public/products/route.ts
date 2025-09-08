// Chemin du fichier: app/api/public/products/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ProductType } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type') as ProductType | null
    const limit = parseInt(searchParams.get('limit') || '100')
    
    const where: any = { available: true }
    if (type) where.type = type

    const products = await prisma.product.findMany({
      where,
      include: {
        stock: true,
        producer: {
          select: {
            companyName: true,
            user: { select: { name: true } }
          }
        }
      },
      take: limit,
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ products })
  } catch (error) {
    console.error('Erreur API:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}