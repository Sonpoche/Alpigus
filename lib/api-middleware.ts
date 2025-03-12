// lib/api-middleware.ts
import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { NextRequest } from "next/server"
import { Session } from "next-auth"
import { UserRole } from "@prisma/client"

type HandlerFunction = (
  req: NextRequest,
  session: Session,
  context: { params: { [key: string]: string } }
) => Promise<NextResponse>

type RequestContext = {
  params: { [key: string]: string };
  session?: Session;  // Session optionnelle pour les tests
}

export function apiAuthMiddleware(handler: HandlerFunction, allowedRoles?: UserRole[]) {
  return async function (req: NextRequest, context: RequestContext) {
    // Utiliser la session de test si elle existe, sinon obtenir une vraie session
    const session = context.session || await getServerSession(authOptions)

    if (!session) {
      return new NextResponse("Non autorisé", { status: 401 })
    }

    // Vérifier les rôles si nécessaire
    if (allowedRoles && session.user.role) {
      if (!allowedRoles.includes(session.user.role)) {
        return new NextResponse("Accès interdit", { status: 403 })
      }
    }

    return handler(req, session, context)
  }
}