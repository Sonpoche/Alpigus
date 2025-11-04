// Chemin du fichier: app/(protected)/admin/page.tsx
import { 
  Users, 
  Package, 
  Tags, 
  Wallet, 
  Gauge, 
  BarChart3 
} from 'lucide-react'
import Link from 'next/link'

export default function AdminPage() {
  const adminCards = [
    {
      title: 'Utilisateurs',
      description: 'Gérez les comptes utilisateurs et les permissions de la plateforme',
      href: '/admin/utilisateurs',
      icon: Users,
      color: 'bg-blue-50 text-blue-600 border-blue-200',
      stats: 'Gérer tous les comptes',
    },
    {
      title: 'Produits',
      description: 'Supervisez tous les produits disponibles sur la plateforme',
      href: '/admin/produits',
      icon: Package,
      color: 'bg-green-50 text-green-600 border-green-200',
      stats: 'Voir le catalogue',
    },
    {
      title: 'Catégories',
      description: 'Organisez et gérez les catégories de produits',
      href: '/admin/categories',
      icon: Tags,
      color: 'bg-purple-50 text-purple-600 border-purple-200',
      stats: 'Gérer les catégories',
    },
    {
      title: 'Portefeuilles',
      description: 'Gérez les portefeuilles producteurs et validez les retraits',
      href: '/admin/portefeuilles',
      icon: Wallet,
      color: 'bg-amber-50 text-amber-600 border-amber-200',
      stats: 'Gérer les paiements',
    },
    {
      title: 'Supervision',
      description: 'Suivez et gérez toutes les commandes en temps réel',
      href: '/admin/commandes/supervision',
      icon: Gauge,
      color: 'bg-red-50 text-red-600 border-red-200',
      stats: 'Surveiller les commandes',
    },
    {
      title: 'Statistiques',
      description: 'Consultez les statistiques et analyses détaillées',
      href: '/admin/stats',
      icon: BarChart3,
      color: 'bg-indigo-50 text-indigo-600 border-indigo-200',
      stats: 'Voir les rapports',
    },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-black">Administration</h1>
        <p className="mt-2 text-gray-600">
          Gérez tous les aspects de la plateforme Alpigus
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {adminCards.map((card) => {
          const Icon = card.icon
          return (
            <Link
              key={card.href}
              href={card.href}
              className="group relative bg-white border-2 border-black rounded-lg p-6 hover:shadow-lg transition-all duration-200 hover:-translate-y-1"
            >
              <div className={`inline-flex p-3 rounded-lg border-2 ${card.color} mb-4`}>
                <Icon className="h-6 w-6" />
              </div>
              
              <h2 className="text-xl font-semibold text-black mb-2 group-hover:text-gray-800">
                {card.title}
              </h2>
              
              <p className="text-gray-600 text-sm mb-4">
                {card.description}
              </p>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">{card.stats}</span>
                <div className="flex items-center text-black font-medium text-sm group-hover:gap-2 transition-all">
                  <span>Accéder</span>
                  <span className="ml-1 group-hover:ml-2 transition-all">→</span>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}