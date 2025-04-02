// components/orders/empty-orders-view.tsx
import { ShoppingBag } from 'lucide-react'
import Link from 'next/link'

interface EmptyOrdersViewProps {
  searchTerm?: string
  activeStatus?: string | null
}

export default function EmptyOrdersView({ searchTerm, activeStatus }: EmptyOrdersViewProps) {
  return (
    <div className="bg-background border border-foreground/10 rounded-lg p-12 text-center">
      <ShoppingBag className="h-20 w-20 mx-auto text-muted-foreground mb-6 opacity-20" />
      <h2 className="text-2xl font-medium mb-4">Aucune commande trouvée</h2>
      <p className="text-muted-foreground mb-8 max-w-md mx-auto">
        {searchTerm || activeStatus
          ? "Aucune commande ne correspond à vos critères de recherche."
          : "Vous n'avez pas encore reçu de commandes."}
      </p>
      <Link 
        href="/producer" 
        className="bg-custom-accent text-white px-6 py-3 rounded-md hover:opacity-90 transition-opacity font-medium"
      >
        Gérer mes produits
      </Link>
    </div>
  );
}