// app/api/test/create-order/route.ts
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import fs from 'fs/promises';
import path from 'path';

// Fonction d'aide pour les logs de débogage
async function logDebug(message: string, data?: any): Promise<void> {
  try {
    const logMessage = `[${new Date().toISOString()}] [TEST] ${message} ${data ? JSON.stringify(data, null, 2) : ''}`;
    await fs.appendFile(
      path.join(process.cwd(), 'debug.log'), 
      logMessage + '\n'
    );
  } catch (error) {
    console.error('Erreur d\'écriture dans le fichier de log:', error);
  }
}

export async function GET() {
  try {
    await logDebug("Début création commande de test");
    
    // Récupérer un utilisateur client
    const user = await prisma.user.findFirst({
      where: { role: 'CLIENT' }
    });
    
    if (!user) {
      return NextResponse.json({ error: "Aucun utilisateur client trouvé" }, { status: 404 });
    }
    
    await logDebug("Utilisateur client trouvé", { userId: user.id });
    
    // Récupérer un produit
    const product = await prisma.product.findFirst({
      include: { producer: true }
    });
    
    if (!product) {
      return NextResponse.json({ error: "Aucun produit trouvé" }, { status: 404 });
    }
    
    await logDebug("Produit trouvé", { 
      productId: product.id, 
      producerId: product.producerId,
      producerUserId: product.producer?.userId
    });
    
    // Créer une commande de test avec ce produit
    const order = await prisma.order.create({
      data: {
        userId: user.id,
        status: "PENDING",
        total: product.price,
        items: {
          create: {
            productId: product.id,
            quantity: 1,
            price: product.price
          }
        }
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
        user: true
      }
    });
    
    await logDebug("Commande de test créée", { orderId: order.id });
    
    // Créer une notification pour le producteur
    const notification = await prisma.notification.create({
      data: {
        userId: product.producer.userId,
        type: "NEW_ORDER",
        title: "Nouvelle commande reçue",
        message: `Vous avez reçu une nouvelle commande de test (#${order.id.substring(0, 8)})`,
        link: `/producer/orders/${order.id}`,
        data: JSON.stringify({ orderId: order.id })
      }
    });
    
    await logDebug("Notification de test créée", { notificationId: notification.id });
    
    return NextResponse.json({ 
      success: true, 
      order,
      notification,
      message: "Commande et notification de test créées avec succès"
    });
  } catch (error) {
    console.error("Erreur test commande:", error);
    return NextResponse.json({ error: "Erreur lors de la création de la commande de test" }, { status: 500 });
  }
}