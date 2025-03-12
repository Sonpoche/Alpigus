// app/api/auth/register/route.ts
import { hash } from 'bcrypt'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { isValidPhoneNumber } from 'libphonenumber-js'
import { EmailService } from '@/lib/email-service'

export async function POST(req: Request) {
  try {
    const { email, password, name, phone, role, companyName } = await req.json()

    // Validation des champs requis
    if (!email || !password || !name || !phone || !role) {
      return new NextResponse(
        'Les champs email, password, name, phone et role sont requis', 
        { status: 400 }
      )
    }

    // Validation du format email
    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return new NextResponse('Format d\'email invalide', { status: 400 })
    }

    // Validation du numéro de téléphone
    try {
      const cleanPhone = phone.replace(/\s+/g, '').replace(/[-()]/g, '')
      if (!isValidPhoneNumber(cleanPhone)) {
        return new NextResponse(
          'Format de téléphone invalide (exemple: +33612345678)', 
          { status: 400 }
        )
      }
    } catch (e) {
      return new NextResponse(
        'Format de téléphone invalide (exemple: +33612345678)', 
        { status: 400 }
      )
    }

    // Validation de la longueur du mot de passe
    if (password.length < 8) {
      return new NextResponse(
        'Le mot de passe doit contenir au moins 8 caractères', 
        { status: 400 }
      )
    }

    // Validation du nom
    if (name.length < 2 || name.length > 50) {
      return new NextResponse(
        'Le nom doit contenir entre 2 et 50 caractères', 
        { status: 400 }
      )
    }

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return new NextResponse('Un compte existe déjà avec cet email', { status: 400 })
    }

    // Hasher le mot de passe
    const hashedPassword = await hash(password, 12)

    // Créer l'utilisateur avec un producer si nécessaire
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        phone,
        role,
        // Si c'est un producteur, créer aussi l'entrée dans la table Producer
        ...(role === 'PRODUCER' && {
          producer: {
            create: {
              companyName: companyName || '',
              description: '',
              address: ''
            }
          }
        })
      },
      // Inclure les données du producer dans la réponse
      include: {
        producer: role === 'PRODUCER'
      }
    })

    // Envoyer l'email de bienvenue
    try {
      await EmailService.sendWelcomeEmail(email, name, role);
      console.log('Email de bienvenue envoyé avec succès');
    } catch (emailError) {
      // Log l'erreur mais ne pas bloquer l'inscription
      console.error('Erreur lors de l\'envoi de l\'email de bienvenue:', emailError);
    }

    // Ne pas renvoyer le mot de passe
    const { password: _, ...userWithoutPassword } = user

    return NextResponse.json(userWithoutPassword)
  } catch (error) {
    console.error('Erreur d\'inscription:', error)
    return new NextResponse('Erreur lors de la création du compte', { status: 500 })
  }
}