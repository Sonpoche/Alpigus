// app/(protected)/wishlist/page.tsx
import { Suspense } from 'react'
import { WishlistContent } from '@/components/wishlist/wishlist-content'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Heart } from 'lucide-react'

export default function WishlistPage() {
  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-red-50 rounded-lg">
          <Heart className="h-6 w-6 text-red-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-title">Mes Favoris</h1>
          <p className="text-muted-foreground">
            Retrouvez tous vos produits préférés en un seul endroit
          </p>
        </div>
      </div>

      {/* Contenu */}
      <Suspense fallback={
        <div className="flex justify-center py-12">
          <LoadingSpinner className="mx-auto" />
        </div>
      }>
        <WishlistContent />
      </Suspense>
    </div>
  )
}