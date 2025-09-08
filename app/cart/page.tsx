// Chemin du fichier: app/cart/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useLocalCart, CartItem } from '@/hooks/use-local-cart'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Trash2, ShoppingBag, Plus, Minus } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import Image from 'next/image'

export default function CartPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  const [mounted, setMounted] = useState(false)
  
  // Récupérer toutes les fonctions du store
  const items = useLocalCart((state) => state.items)
  const updateQuantity = useLocalCart((state) => state.updateQuantity)
  const removeItem = useLocalCart((state) => state.removeItem)
  const clearCart = useLocalCart((state) => state.clearCart)
  const getTotalPrice = useLocalCart((state) => state.getTotalPrice)

  // Hydrater le store après le montage
  useEffect(() => {
    useLocalCart.persist.rehydrate()
    setMounted(true)
  }, [])

  // Si pas encore monté, afficher un loader
  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
      </div>
    )
  }

  const handleCheckout = async () => {
    if (status === 'loading') return

    if (!session) {
      // Sauvegarder le panier et rediriger vers login
      toast({
        title: "Connexion requise",
        description: "Veuillez vous connecter pour finaliser votre commande"
      })
      router.push('/login?redirect=/cart')
    } else {
      // Si connecté, synchroniser le panier avec le backend
      try {
        const response = await fetch('/api/cart/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items })
        })

        if (response.ok) {
          router.push('/checkout')
        } else {
          throw new Error('Erreur de synchronisation')
        }
      } catch (error) {
        toast({
          title: "Erreur",
          description: "Impossible de synchroniser le panier",
          variant: "destructive"
        })
      }
    }
  }

  const handleQuantityChange = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItem(productId)
      toast({
        title: "Produit retiré",
        description: "Le produit a été retiré du panier"
      })
    } else {
      updateQuantity(productId, newQuantity)
    }
  }

  const handleRemoveItem = (productId: string, productName: string) => {
    removeItem(productId)
    toast({
      title: "Produit retiré",
      description: `${productName} a été retiré du panier`
    })
  }

  const totalPrice = getTotalPrice()

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <ShoppingBag className="h-20 w-20 mx-auto text-gray-300 mb-6" />
          <h1 className="text-2xl font-light mb-4">Votre panier est vide</h1>
          <p className="text-gray-500 mb-8">
            Découvrez notre sélection de champignons frais et de qualité
          </p>
          <Link 
            href="/" 
            className="inline-block bg-black text-white px-8 py-3 rounded-xl hover:bg-gray-800 transition-colors"
          >
            Retour à la boutique
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-light mb-2">Panier</h1>
          <p className="text-gray-500">{items.length} article{items.length > 1 ? 's' : ''}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Liste des produits */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item: CartItem) => (
              <div key={item.productId} className="border border-black/10 rounded-2xl p-6">
                <div className="flex gap-4">
                  {/* Image */}
                  <div className="w-24 h-24 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0">
                    {item.image ? (
                      <Image
                        src={item.image}
                        alt={item.productName}
                        width={96}
                        height={96}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-3xl opacity-50">🍄</span>
                      </div>
                    )}
                  </div>

                  {/* Infos produit */}
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium text-lg">{item.productName}</h3>
                      <button
                        onClick={() => handleRemoveItem(item.productId, item.productName)}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                    
                    <p className="text-gray-500 text-sm mb-4">
                      {item.price.toFixed(2)} CHF / {item.unit}
                    </p>

                    {/* Contrôles de quantité */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleQuantityChange(item.productId, item.quantity - 1)}
                          className="w-8 h-8 border border-black/20 rounded-lg hover:border-black transition-colors flex items-center justify-center"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        
                        <span className="w-16 text-center font-medium">
                          {item.quantity} {item.unit}
                        </span>
                        
                        <button
                          onClick={() => handleQuantityChange(item.productId, item.quantity + 1)}
                          className="w-8 h-8 border border-black/20 rounded-lg hover:border-black transition-colors flex items-center justify-center"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="font-medium">
                        {(item.quantity * item.price).toFixed(2)} CHF
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Bouton vider le panier */}
            <button
              onClick={() => {
                clearCart()
                toast({
                  title: "Panier vidé",
                  description: "Tous les articles ont été retirés"
                })
              }}
              className="text-sm text-gray-500 hover:text-black transition-colors"
            >
              Vider le panier
            </button>
          </div>

          {/* Résumé de la commande */}
          <div className="lg:col-span-1">
            <div className="border border-black/10 rounded-2xl p-6 sticky top-24">
              <h2 className="text-lg font-medium mb-6">Résumé de la commande</h2>
              
              {/* Détails */}
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Sous-total</span>
                  <span>{totalPrice.toFixed(2)} CHF</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Livraison</span>
                  <span className="text-green-600">Calculée à l'étape suivante</span>
                </div>
              </div>

              {/* Total */}
              <div className="border-t border-black/10 pt-4 mb-6">
                <div className="flex justify-between font-medium text-lg">
                  <span>Total</span>
                  <span>{totalPrice.toFixed(2)} CHF</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">TVA incluse</p>
              </div>

              {/* Bouton checkout */}
              <button
                onClick={handleCheckout}
                className="w-full bg-black text-white py-3 rounded-xl hover:bg-gray-800 transition-colors font-medium"
              >
                {session ? 'Passer à la commande' : 'Se connecter pour commander'}
              </button>

              {/* Lien continuer les achats */}
              <Link 
                href="/"
                className="block text-center text-sm text-gray-500 hover:text-black mt-4 transition-colors"
              >
                Continuer mes achats
              </Link>

              {/* Info sécurité */}
              <div className="mt-6 pt-6 border-t border-black/10">
                <p className="text-xs text-gray-500 text-center">
                  <span className="inline-flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Paiement sécurisé • Livraison rapide
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}