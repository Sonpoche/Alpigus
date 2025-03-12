import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { apiAuthMiddleware } from "@/lib/api-middleware"
import { Session } from "next-auth"
import { ProductType } from "@prisma/client"
import { PRESET_IMAGES } from '@/types/images'
import fs from 'fs/promises'
import path from 'path'

export const GET = apiAuthMiddleware(async (
  req: NextRequest,
  session: Session,
  context: { params: { [key: string]: string } }
) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: context.params.id },
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
      }
    })

    if (!product) {
      return new NextResponse("Produit non trouvé", { status: 404 })
    }

    return NextResponse.json(product)
  } catch (error) {
    return new NextResponse("Erreur lors de la récupération du produit", { status: 500 })
  }
})

export const PATCH = apiAuthMiddleware(
  async (
    req: NextRequest,
    session: Session,
    context: { params: { [key: string]: string } }
  ) => {
    try {
      // Vérifier que le produit existe et appartient au producteur
      const product = await prisma.product.findUnique({
        where: { id: context.params.id },
        include: { producer: true }
      })

      if (!product) {
        return new NextResponse("Produit non trouvé", { status: 404 })
      }

      // Vérifier que le producteur est propriétaire du produit
      if (product.producer.userId !== session.user.id && session.user.role !== 'ADMIN') {
        return new NextResponse("Non autorisé", { status: 403 })
      }

      const body = await req.json()
      const { 
        name, 
        description, 
        price, 
        type, 
        unit, 
        categories, 
        available,
        stock,
        imagePreset
      } = body

      // Gérer l'image prédéfinie
      let imageUrl = undefined;
      if (imagePreset !== undefined) {
        if (imagePreset === null) {
          imageUrl = null;
        } else {
          const preset = PRESET_IMAGES.find(p => p.id === imagePreset);
          if (preset) {
            imageUrl = preset.src;
          } else {
            return new NextResponse("Image prédéfinie non valide", { status: 400 });
          }
        }
      }

      // Validation des catégories
      if (categories?.length > 0) {
        const existingCategories = await prisma.category.findMany({
          where: {
            id: {
              in: categories
            }
          }
        })

        if (existingCategories.length !== categories.length) {
          return new NextResponse(
            "Une ou plusieurs catégories n'existent pas",
            { status: 400 }
          )
        }
      }

      // Valider le type si fourni
      if (type && !Object.values(ProductType).includes(type)) {
        return new NextResponse("Type de produit invalide", { status: 400 })
      }

      // Mise à jour du produit avec gestion du stock
      const updatedProduct = await prisma.$transaction(async (tx) => {
        // Mise à jour du produit
        const updated = await tx.product.update({
          where: { id: context.params.id },
          data: {
            ...(name !== undefined && { name }),
            ...(description !== undefined && { description }),
            ...(price !== undefined && { price }),
            ...(type !== undefined && { type: type as ProductType }),
            ...(unit !== undefined && { unit }),
            ...(imageUrl !== undefined && { image: imageUrl }),
            ...(available !== undefined && { available }),
            ...(categories && {
              categories: {
                set: categories.map((id: string) => ({ id }))
              }
            })
          },
          include: {
            categories: true,
            stock: true,
            producer: true
          }
        })

        // Mise à jour du stock si nécessaire
        if (stock && typeof stock.quantity === 'number') {
          await tx.stock.upsert({
            where: { productId: context.params.id },
            create: {
              productId: context.params.id,
              quantity: stock.quantity
            },
            update: {
              quantity: stock.quantity
            }
          })
        }

        // Récupérer le produit mis à jour avec toutes les relations
        return tx.product.findUnique({
          where: { id: context.params.id },
          include: {
            categories: true,
            stock: true,
            producer: true
          }
        })
      })

      return NextResponse.json(updatedProduct)
    } catch (error) {
      console.error("Erreur mise à jour produit:", error)
      return new NextResponse("Erreur lors de la mise à jour du produit", { status: 500 })
    }
  },
  ["PRODUCER", "ADMIN"]
)

export const DELETE = apiAuthMiddleware(
  async (
    req: NextRequest,
    session: Session,
    context: { params: { [key: string]: string } }
  ) => {
    try {
      const product = await prisma.product.findUnique({
        where: { id: context.params.id },
        include: { producer: true }
      })

      if (!product) {
        return new NextResponse("Produit non trouvé", { status: 404 })
      }

      // Vérifier que le producteur est propriétaire du produit
      if (product.producer.userId !== session.user.id && session.user.role !== 'ADMIN') {
        return new NextResponse("Non autorisé", { status: 403 })
      }

      // Supprimer le dossier des images si ce n'est pas une image prédéfinie
      if (product.image && product.image.startsWith('/uploads/')) {
        const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'products', context.params.id)
        try {
          await fs.rm(uploadsDir, { recursive: true, force: true })
          console.log(`Dossier d'images supprimé: ${uploadsDir}`)
        } catch (error) {
          console.error('Erreur lors de la suppression du dossier d\'images:', error)
          // On continue même si la suppression du dossier échoue
        }
      }

      // Supprimer le produit (cela supprimera aussi automatiquement le stock grâce aux cascades dans Prisma)
      await prisma.product.delete({
        where: { id: context.params.id }
      })

      return new NextResponse(null, { status: 204 })
    } catch (error) {
      console.error("Erreur suppression produit:", error)
      return new NextResponse(
        "Erreur lors de la suppression du produit", 
        { status: 500 }
      )
    }
  },
  ["PRODUCER", "ADMIN"]
)