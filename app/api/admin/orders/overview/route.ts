// app/api/admin/orders/overview/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { apiAuthMiddleware } from "@/lib/api-middleware"
import { Session } from "next-auth"
import { Prisma } from "@prisma/client"

export const GET = apiAuthMiddleware(
  async (
    req: NextRequest,
    session: Session
  ) => {
    try {
      // Vérifier que l'utilisateur est admin
      if (session.user.role !== 'ADMIN') {
        return new NextResponse("Non autorisé", { status: 403 })
      }
      
      // Période à analyser (30 derniers jours par défaut)
      const searchParams = new URL(req.url).searchParams
      const days = parseInt(searchParams.get('days') || '30')
      const page = parseInt(searchParams.get('page') || '1')
      const limit = parseInt(searchParams.get('limit') || '10')
      const search = searchParams.get('search') || ''
      
      const dateLimit = new Date()
      dateLimit.setDate(dateLimit.getDate() - days)
      
      console.log("Début du traitement de l'API orders/overview");
      
      // ÉTAPE 1: Statistiques de base sur les commandes
      console.log("Récupération des statistiques de base des commandes");
      // Données globales des commandes
      const totalOrders = await prisma.order.count();
      console.log(`Total des commandes: ${totalOrders}`);
      
      // Commandes par statut
      const ordersByStatus = await prisma.order.groupBy({
        by: ['status'],
        _count: {
          id: true
        }
      });
      console.log("Commandes par statut récupérées:", ordersByStatus);
      
      // Préparation de la recherche avec des filtres Prisma valides
      let whereClause: Prisma.OrderWhereInput = {
        createdAt: {
          gte: dateLimit
        }
      };
      
      // Ajouter un filtre de recherche si un terme est fourni
      if (search) {
        whereClause = {
          ...whereClause,
          OR: [
            { 
              id: {
                contains: search
              }
            },
            {
              user: {
                OR: [
                  { name: { contains: search } },
                  { email: { contains: search } }
                ]
              }
            }
          ]
        };
      }
      
      // Commandes récentes avec pagination et recherche
      console.log("Récupération des commandes avec pagination et recherche");
      const skip = (page - 1) * limit;
      
      const orders = await prisma.order.findMany({
        where: whereClause,
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              name: true,
              email: true
            }
          },
          items: true
        }
      });
      
      // Nombre total de commandes correspondant à la recherche
      const totalFilteredOrders = await prisma.order.count({
        where: whereClause
      });
      
      // Nombre total de pages
      const totalPages = Math.ceil(totalFilteredOrders / limit);
      
      console.log(`${orders.length} commandes récupérées sur ${totalFilteredOrders} au total`);
      
      // ÉTAPE 2: Commandes nécessitant attention
      console.log("Récupération des commandes nécessitant attention");
      const ordersNeedingAttention = await prisma.order.findMany({
        where: {
          OR: [
            { 
              status: 'PENDING', 
              createdAt: { 
                lte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) 
              } 
            }
            // Nous retirons temporairement la condition INVOICE_OVERDUE
            // Nous l'ajouterons plus tard si tout fonctionne
          ]
        },
        include: {
          user: {
            select: {
              name: true,
              email: true
            }
          }
        },
        orderBy: {
          createdAt: 'asc'
        },
        take: 10
      });
      console.log(`${ordersNeedingAttention.length} commandes nécessitant attention récupérées`);
      
      // Préparation de la réponse
      console.log("Préparation de la réponse");
      return NextResponse.json({
        overview: {
          totalOrders,
          ordersByStatus
        },
        orders: orders.map(order => ({
          id: order.id,
          createdAt: order.createdAt,
          status: order.status,
          total: order.total,
          customer: order.user ? {
            name: order.user.name,
            email: order.user.email
          } : null,
          items: order.items.length
        })),
        pagination: {
          page,
          limit,
          total: totalFilteredOrders,
          pages: totalPages
        },
        ordersNeedingAttention: ordersNeedingAttention.map(order => ({
          id: order.id,
          createdAt: order.createdAt,
          status: order.status,
          total: order.total,
          customer: order.user ? {
            name: order.user.name,
            email: order.user.email
          } : null,
          issueType: 'Commande en attente depuis longtemps'
        }))
      });
    } catch (error) {
      // Log détaillé de l'erreur
      console.error("Erreur détaillée lors de la récupération de l'aperçu des commandes:", error);
      console.error("Stack trace:", error instanceof Error ? error.stack : "No stack trace available");
      
      return new NextResponse("Erreur lors de la récupération de l'aperçu des commandes", { 
        status: 500 
      });
    }
  },
  ["ADMIN"] // Seuls les admins peuvent accéder à cet endpoint
);