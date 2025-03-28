// app/api/admin/products/[id]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { apiAuthMiddleware } from "@/lib/api-middleware"
import { Session } from "next-auth"
import { ProductType } from "@prisma/client"
import { PRESET_IMAGES } from '@/types/images'

export const PATCH = apiAuthMiddleware(
  async (
    req: NextRequest,
    session: Session,
    context: { params: { [key: string]: string } }
  ) => {
    try {
      // S'assurer que l'utilisateur est un admin
      if (session.user.role !== 'ADMIN') {
        return new NextResponse("Non autorisé", { status: 403 })
      }

      const productId = context.params.id;
      
      // Vérifier que le produit existe
      const product = await prisma.product.findUnique({
        where: { id: productId }
      })

      if (!product) {
        return new NextResponse("Produit non trouvé", { status: 404 })
      }

      const body = await req.json()
      const { 
        name, 
        description, 
        price, 
        type, 
        unit, 
        producerId,
        categories, 
        stock,
        available,
        imagePreset
      } = body

      // Validations
      if (price !== undefined && price < 0) {
        return new NextResponse("Le prix ne peut pas être négatif", { status: 400 })
      }

      if (type && !Object.values(ProductType).includes(type)) {
        return new NextResponse("Type de produit invalide", { status: 400 })
      }

      // Vérifier si le producteur existe (si fourni)
      if (producerId) {
        const producer = await prisma.producer.findUnique({
          where: { id: producerId }
        })

        if (!producer) {
          return new NextResponse("Producteur non trouvé", { status: 404 })
        }
      }

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

      // Mise à jour du produit avec gestion du stock
      const updatedProduct = await prisma.$transaction(async (tx) => {
        // Mise à jour du produit
        const updated = await tx.product.update({
          where: { id: productId },
          data: {
            ...(name !== undefined && { name }),
            ...(description !== undefined && { description }),
            ...(price !== undefined && { price }),
            ...(type !== undefined && { type: type as ProductType }),
            ...(unit !== undefined && { unit }),
            ...(producerId !== undefined && { producerId }),
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
            where: { productId },
            create: {
              productId,
              quantity: stock.quantity
            },
            update: {
              quantity: stock.quantity
            }
          })
        }

        // Récupérer le produit mis à jour avec toutes les relations
        return tx.product.findUnique({
          where: { id: productId },
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
  ["ADMIN"] // Seuls les administrateurs peuvent utiliser cet endpoint
)