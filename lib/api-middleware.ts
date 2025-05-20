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
    try {
      // Utiliser la session de test si elle existe, sinon obtenir une vraie session
      const session = context.session || await getServerSession(authOptions)

      if (!session || !session.user) {
        return new NextResponse("Non authentifié", { status: 401 })
      }

      // Vérifier les rôles si nécessaire
      if (allowedRoles && allowedRoles.length > 0) {
        const userRole = session.user.role as UserRole;
        if (!userRole || !allowedRoles.includes(userRole)) {
          return new NextResponse("Accès interdit - rôle non autorisé", { status: 403 })
        }
      }

      // Tout est correct, appeler le handler
      return handler(req, session, context)
    } catch (error) {
      console.error("Erreur dans le middleware d'API:", error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : "Erreur serveur inconnue";
      return new NextResponse(`Erreur serveur: ${errorMessage}`, { status: 500 });
    }
  }
}