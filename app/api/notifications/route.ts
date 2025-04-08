// app/api/notifications/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { apiAuthMiddleware } from "@/lib/api-middleware"
import { Session } from "next-auth"
import { NotificationType } from "@/types/notification"

export const GET = apiAuthMiddleware(async (req: NextRequest, session: Session) => {
  try {
    const { searchParams } = new URL(req.url)
    const unreadOnly = searchParams.get('unread') === 'true'
    const limit = parseInt(searchParams.get('limit') ?? '50')

    // Base query
    const baseQuery = {
      where: { 
        userId: session.user.id,
        ...(unreadOnly && { read: false })
      },
      orderBy: { createdAt: 'desc' as const },
      take: limit
    }

    const [notifications, count] = await Promise.all([
      prisma.notification.findMany(baseQuery),
      prisma.notification.count({ where: baseQuery.where })
    ])

    // Count unread notifications
    const unreadCount = unreadOnly 
      ? count 
      : await prisma.notification.count({
          where: {
            userId: session.user.id,
            read: false
          }
        })

    return NextResponse.json({ 
      notifications, 
      count,
      unreadCount
    })
  } catch (error) {
    console.error("Erreur lors de la récupération des notifications:", error)
    return new NextResponse("Erreur lors de la récupération des notifications", { status: 500 })
  }
})

export const POST = apiAuthMiddleware(
  async (req: NextRequest, session: Session) => {
    try {
      const { userId, type, title, message, link, data } = await req.json()

      // Vérifier si l'utilisateur a le droit de créer des notifications
      if (session.user.role !== 'ADMIN') {
        return new NextResponse("Non autorisé", { status: 403 })
      }

      const notification = await prisma.notification.create({
        data: {
          userId,
          type: type as NotificationType,
          title,
          message,
          link,
          data,
          read: false
        }
      })

      return NextResponse.json(notification)
    } catch (error) {
      console.error("Erreur lors de la création de la notification:", error)
      return new NextResponse("Erreur lors de la création de la notification", { status: 500 })
    }
  },
  ["ADMIN"]
)