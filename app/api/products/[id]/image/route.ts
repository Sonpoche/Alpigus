// app/api/products/[id]/image/route.ts
import { NextRequest, NextResponse } from "next/server"
import { withAuthSecurity, validateData, commonSchemas } from "@/lib/api-security"
import { handleError, createError } from "@/lib/error-handler"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

// Schémas de validation
const paramsSchema = z.object({
  id: commonSchemas.id
})

// Configuration des limites d'upload
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

// Fonction pour optimiser et sauvegarder l'image
async function optimizeAndSaveImage(file: File, productId: string): Promise<string> {
  // Import dynamique des modules Node.js
  const sharp = await import('sharp')
  const fs = await import('fs/promises')
  const path = await import('path')

  // Lire le contenu du fichier
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  // Définir le chemin de sauvegarde
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'products', productId)
  await fs.mkdir(uploadsDir, { recursive: true })

  // Optimiser l'image avec Sharp
  const optimizedImageBuffer = await sharp.default(buffer)
    .resize(800, 800, {
      fit: 'cover',
      position: 'center'
    })
    .jpeg({ 
      quality: 85,
      mozjpeg: true
    })
    .toBuffer()

  // Sauvegarder l'image optimisée
  const filename = `image-${Date.now()}.jpg`
  const imagePath = path.join(uploadsDir, filename)
  await fs.writeFile(imagePath, optimizedImageBuffer)

  // Retourner l'URL relative pour stockage en BDD
  return `/uploads/products/${productId}/${filename}`
}

// POST - Upload d'image pour un produit
export const POST = withAuthSecurity(async (request: NextRequest, session) => {
  try {
    // 1. Extraction et validation de l'ID
    const url = new URL(request.url)
    const pathSegments = url.pathname.split('/')
    const productId = pathSegments[pathSegments.indexOf('products') + 1]

    const { id } = validateData(paramsSchema, { id: productId })

    console.log(`📸 Upload image produit ${id} par ${session.user.role} ${session.user.id}`)

    // 2. Vérification d'autorisation
    const product = await prisma.product.findUnique({
      where: { id },
      include: { 
        producer: {
          select: {
            userId: true,
            companyName: true
          }
        }
      }
    })

    if (!product) {
      throw createError.notFound("Produit non trouvé")
    }

    if (session.user.role !== 'ADMIN' && product.producer.userId !== session.user.id) {
      throw createError.forbidden("Vous ne pouvez modifier que les images de vos propres produits")
    }

    // 3. Extraction et validation du fichier
    const formData = await request.formData()
    const file = formData.get('image') as File

    if (!file) {
      throw createError.validation("Aucune image fournie")
    }

    // Vérification du type de fichier
    if (!ALLOWED_TYPES.includes(file.type)) {
      throw createError.validation(
        "Format d'image non supporté. Utilisez JPG, PNG ou WebP"
      )
    }

    // Vérification de la taille
    if (file.size > MAX_FILE_SIZE) {
      throw createError.validation(
        "L'image ne doit pas dépasser 5MB"
      )
    }

    // 4. Suppression de l'ancienne image si elle existe
    if (product.image && product.image.startsWith('/uploads/')) {
      try {
        const fs = await import('fs/promises')
        const path = await import('path')
        
        const oldImagePath = path.join(process.cwd(), 'public', product.image)
        await fs.unlink(oldImagePath)
        console.log(`Ancienne image supprimée: ${product.image}`)
      } catch (error) {
        console.error('Erreur lors de la suppression de l\'ancienne image:', error)
        // On continue même si la suppression échoue
      }
    }

    // 5. Optimisation et sauvegarde de la nouvelle image
    const imageUrl = await optimizeAndSaveImage(file, id)

    // 6. Mise à jour sécurisée du produit
    const updatedProduct = await prisma.product.update({
      where: { id },
      data: { image: imageUrl },
      select: {
        id: true,
        name: true,
        image: true,
        updatedAt: true,
        producer: {
          select: {
            companyName: true
          }
        }
      }
    })

    // 7. Log d'audit sécurisé
    console.log(`📋 Audit - Image produit uploadée:`, {
      productId: id,
      uploadedBy: session.user.id,
      role: session.user.role,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      imageUrl,
      timestamp: new Date().toISOString()
    })

    console.log(`✅ Image uploadée avec succès: ${imageUrl}`)

    // 8. Réponse sécurisée
    const response = {
      id: updatedProduct.id,
      name: updatedProduct.name,
      image: updatedProduct.image,
      updatedAt: updatedProduct.updatedAt,
      producer: {
        companyName: updatedProduct.producer.companyName
      },
      upload: {
        originalFileName: file.name,
        originalSize: file.size,
        optimizedUrl: imageUrl,
        uploadedAt: new Date().toISOString()
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error("❌ Erreur upload image:", error)
    return handleError(error, request.url)
  }
}, {
  requireAuth: true,
  allowedRoles: ['PRODUCER', 'ADMIN'], // Seuls producteurs et admins
  allowedMethods: ['POST'],
  rateLimit: {
    requests: 10, // Uploads très limités
    window: 60
  }
})

// DELETE - Supprimer l'image d'un produit
export const DELETE = withAuthSecurity(async (request: NextRequest, session) => {
  try {
    // 1. Extraction et validation de l'ID
    const url = new URL(request.url)
    const pathSegments = url.pathname.split('/')
    const productId = pathSegments[pathSegments.indexOf('products') + 1]

    const { id } = validateData(paramsSchema, { id: productId })

    console.log(`🗑️ Suppression image produit ${id} par ${session.user.role} ${session.user.id}`)

    // 2. Vérification d'autorisation
    const product = await prisma.product.findUnique({
      where: { id },
      include: { 
        producer: {
          select: {
            userId: true,
            companyName: true
          }
        }
      }
    })

    if (!product) {
      throw createError.notFound("Produit non trouvé")
    }

    if (session.user.role !== 'ADMIN' && product.producer.userId !== session.user.id) {
      throw createError.forbidden("Vous ne pouvez supprimer que les images de vos propres produits")
    }

    if (!product.image) {
      throw createError.validation("Ce produit n'a pas d'image à supprimer")
    }

    if (!product.image.startsWith('/uploads/')) {
      throw createError.validation("Impossible de supprimer une image prédéfinie")
    }

    // 3. Suppression du fichier physique
    try {
      const fs = await import('fs/promises')
      const path = await import('path')
      
      const imagePath = path.join(process.cwd(), 'public', product.image)
      await fs.unlink(imagePath)
      console.log(`Image supprimée: ${product.image}`)
    } catch (error) {
      console.error('Erreur lors de la suppression du fichier image:', error)
      // On continue pour supprimer la référence en BDD même si le fichier n'existe plus
    }

    // 4. Mise à jour sécurisée du produit
    const updatedProduct = await prisma.product.update({
      where: { id },
      data: { image: null },
      select: {
        id: true,
        name: true,
        image: true,
        updatedAt: true
      }
    })

    // 5. Log d'audit sécurisé
    console.log(`📋 Audit - Image produit supprimée:`, {
      productId: id,
      deletedBy: session.user.id,
      role: session.user.role,
      oldImageUrl: product.image,
      timestamp: new Date().toISOString()
    })

    console.log(`✅ Image supprimée avec succès`)

    return NextResponse.json({
      id: updatedProduct.id,
      name: updatedProduct.name,
      image: updatedProduct.image,
      updatedAt: updatedProduct.updatedAt,
      message: 'Image supprimée avec succès'
    })

  } catch (error) {
    console.error("❌ Erreur suppression image:", error)
    return handleError(error, request.url)
  }
}, {
  requireAuth: true,
  allowedRoles: ['PRODUCER', 'ADMIN'],
  allowedMethods: ['DELETE'],
  rateLimit: {
    requests: 10,
    window: 60
  }
})