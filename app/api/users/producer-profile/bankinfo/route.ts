// app/api/users/producer-profile/bankinfo/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { apiAuthMiddleware } from "@/lib/api-middleware"
import { Session } from "next-auth"

export const PATCH = apiAuthMiddleware(async (
  req: NextRequest,
  session: Session,
  context: { params: { [key: string]: string } }
) => {
  try {
    console.log("Début de la mise à jour des informations bancaires")
    console.log("Session utilisateur:", session.user.id)

    // Récupérer le producteur associé à l'utilisateur
    const producer = await prisma.producer.findUnique({
      where: { userId: session.user.id }
    })

    console.log("Producteur trouvé:", producer)

    if (!producer) {
      return new NextResponse("Producteur non trouvé", { status: 404 })
    }

    // Extraire les données bancaires de la requête
    const body = await req.json()
    console.log("Données reçues:", body)
    
    const { bankName, bankAccountName, iban, bic } = body

    // Validation
    if (!bankName || !bankName.trim()) {
      return new NextResponse("Le nom de la banque est requis", { status: 400 })
    }
    
    if (!bankAccountName || !bankAccountName.trim()) {
      return new NextResponse("Le nom du titulaire est requis", { status: 400 })
    }

    if (!iban || !iban.trim()) {
      return new NextResponse("L'IBAN est requis", { status: 400 })
    }

    // Nettoyer l'IBAN (supprimer les espaces)
    const cleanedIban = iban.replace(/\s+/g, '').toUpperCase()
    console.log("IBAN nettoyé:", cleanedIban)

    console.log("Tentative de mise à jour du producteur ID:", producer.id)
    
    // Mettre à jour le producteur
    try {
      const updatedProducer = await prisma.producer.update({
        where: { id: producer.id },
        data: {
          bankName,
          bankAccountName,
          iban: cleanedIban,
          bic: bic ? bic.trim().toUpperCase() : null
        }
      })
      
      console.log("Mise à jour réussie:", updatedProducer)
      
      return NextResponse.json({
        success: true,
        message: "Informations bancaires mises à jour avec succès"
      })
    } catch (updateError) {
      console.error("Erreur spécifique lors de la mise à jour:", updateError)
      // Correction de l'erreur TypeScript
      const errorMessage = updateError instanceof Error 
        ? updateError.message 
        : "Erreur inconnue lors de la mise à jour";
      return new NextResponse(`Erreur lors de la mise à jour: ${errorMessage}`, { status: 500 })
    }
  } catch (error) {
    console.error("Erreur lors de la mise à jour des informations bancaires:", error)
    // Correction de l'erreur TypeScript
    const errorMessage = error instanceof Error 
      ? error.message 
      : "Erreur serveur inconnue";
    return new NextResponse(`Erreur serveur: ${errorMessage}`, { status: 500 })
  }
}, ["PRODUCER"])