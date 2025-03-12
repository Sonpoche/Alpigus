// prisma/seed.ts
import { PrismaClient, UserRole } from '@prisma/client'
import { hash } from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  // Vérifier si l'admin existe déjà
  const existingAdmin = await prisma.user.findFirst({
    where: {
      email: 'admin@mushroom-marketplace.com',
      role: UserRole.ADMIN
    }
  })

  if (!existingAdmin) {
    // Créer l'administrateur
    const hashedPassword = await hash('Admin123!', 12)
    
    await prisma.user.create({
      data: {
        email: 'admin@mushroom-marketplace.com',
        name: 'Admin',
        password: hashedPassword,
        role: UserRole.ADMIN,
        phone: '+33000000000' // Numéro fictif
      }
    })

    console.log('✅ Compte administrateur créé')
  } else {
    console.log('ℹ️ Le compte administrateur existe déjà')
  }
}

main()
  .catch((e) => {
    console.error('❌ Erreur lors du seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })