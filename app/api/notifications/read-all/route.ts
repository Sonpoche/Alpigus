// app/api/notifications/read-all/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { apiAuthMiddleware } from "@/lib/api-middleware"
import { Session } from "next-auth"

export const POST = apiAuthMiddleware(async (
  req: NextRequest,
  session: Session
) => {
  try {
    // Marquer toutes les notifications de l'utilisateur comme lues
    await prisma.notification.updateMany({
      where: {
        userId: session.user.id,
        read: false
      },
      data: {
        read: true
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erreur lors de la mise à jour des notifications:", error)
    return new NextResponse("Erreur lors de la mise à jour des notifications", { status: 500 })
  }
})