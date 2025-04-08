// app/api/notifications/[id]/read/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { apiAuthMiddleware } from "@/lib/api-middleware"
import { Session } from "next-auth"

export const PATCH = apiAuthMiddleware(
  async (
    req: NextRequest,
    session: Session,
    context: { params: { [key: string]: string } }
  ) => {
    try {
      const notificationId = context.params.id

      // Vérifier si la notification existe et appartient à l'utilisateur
      const notification = await prisma.notification.findUnique({
        where: { id: notificationId }
      })

      if (!notification) {
        return new NextResponse("Notification non trouvée", { status: 404 })
      }

      if (notification.userId !== session.user.id) {
        return new NextResponse("Non autorisé", { status: 403 })
      }

      // Marquer comme lue
      const updatedNotification = await prisma.notification.update({
        where: { id: notificationId },
        data: { read: true }
      })

      return NextResponse.json(updatedNotification)
    } catch (error) {
      console.error("Erreur lors de la mise à jour de la notification:", error)
      return new NextResponse("Erreur lors de la mise à jour de la notification", { status: 500 })
    }
  }
)