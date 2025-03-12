import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { apiAuthMiddleware } from "@/lib/api-middleware"
import { Session } from "next-auth"
import sharp from 'sharp'
import path from 'path'
import fs from 'fs/promises'

async function optimizeAndSaveImage(file: File | Blob, productId: string): Promise<string> {
  // Lire le contenu du fichier
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Définir le chemin de sauvegarde
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'products', productId);
  await fs.mkdir(uploadsDir, { recursive: true });

  // Optimiser l'image
  const optimizedImageBuffer = await sharp(buffer)
    .resize(800, 800, {
      fit: 'cover',
      position: 'center'
    })
    .jpeg({ 
      quality: 85,
      mozjpeg: true
    })
    .toBuffer();

  // Sauvegarder l'image optimisée
  const filename = 'image.jpg';
  const imagePath = path.join(uploadsDir, filename);
  await fs.writeFile(imagePath, optimizedImageBuffer);

  // Retourner l'URL relative pour stockage en BDD
  return `/uploads/products/${productId}/${filename}`;
}

export const POST = apiAuthMiddleware(
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
      });

      if (!product) {
        return new NextResponse("Produit non trouvé", { status: 404 });
      }

      if (product.producer.userId !== session.user.id) {
        return new NextResponse("Non autorisé", { status: 403 });
      }

      const formData = await req.formData();
      const file = formData.get('image') as File;
      
      if (!file) {
        return new NextResponse("Aucune image fournie", { status: 400 });
      }

      // Vérifier le type de fichier
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        return new NextResponse(
          "Format d'image non supporté. Utilisez JPG, PNG ou WebP", 
          { status: 400 }
        );
      }

      // Vérifier la taille (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        return new NextResponse(
          "L'image ne doit pas dépasser 5MB",
          { status: 400 }
        );
      }

      // Optimiser et sauvegarder l'image
      const imageUrl = await optimizeAndSaveImage(file, context.params.id);

      // Supprimer l'ancienne image si elle existe
      if (product.image && product.image.startsWith('/uploads/')) {
        try {
          const oldImagePath = path.join(process.cwd(), 'public', product.image);
          await fs.unlink(oldImagePath);
        } catch (error) {
          console.error('Erreur lors de la suppression de l\'ancienne image:', error);
        }
      }

      // Mettre à jour l'URL de l'image dans la base de données
      const updatedProduct = await prisma.product.update({
        where: { id: context.params.id },
        data: { image: imageUrl }
      });

      return NextResponse.json(updatedProduct);
    } catch (error) {
      console.error("Erreur lors de la gestion de l'image:", error);
      return new NextResponse(
        "Erreur lors de la gestion de l'image", 
        { status: 500 }
      );
    }
  },
  ["PRODUCER"]
);