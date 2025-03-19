// app/(protected)/products/[id]/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useToast } from "@/hooks/use-toast"
import { ProductType } from '@prisma/client'
import { ShoppingCart, Truck, AlertCircle } from 'lucide-react'
import ProductDeliveryCalendar from '@/components/client/product-delivery-calendar'
import { LoadingButton } from '@/components/ui/loading-button'
import { useCart } from '@/hooks/use-cart'
import { AddToCartAnimation } from '@/components/cart/add-to-cart-animation'

export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const { addToCart } = useCart()
  const [product, setProduct] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [quantity, setQuantity] = useState<string>("1")
  const [isAddingToCart, setIsAddingToCart] = useState(false)
  const [showDeliveryCalendar, setShowDeliveryCalendar] = useState(false)
  const [showAnimation, setShowAnimation] = useState(false)
  
  const productId = params.id as string
  
  useEffect(() => {
    async function fetchProduct() {
      try {
        const response = await fetch(`/api/products/${productId}`)
        if (!response.ok) throw new Error('Erreur lors du chargement du produit')
        
        const data = await response.json()
        setProduct(data)
        
        // Montrer automatiquement le calendrier pour les produits frais
        if (data.type === ProductType.FRESH) {
          setShowDeliveryCalendar(true)
        }
      } catch (error) {
        toast({
          title: "Erreur",
          description: "Impossible de charger les données du produit",
          variant: "destructive"
        })
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchProduct()
  }, [productId, toast])
  
  const handleAddToCart = async () => {
    // Pour les produits frais, on utilise le calendrier de livraison
    if (product.type === ProductType.FRESH) {
      setShowDeliveryCalendar(true)
      return
    }
    
    // Pour les autres types de produits, on ajoute directement au panier
    setIsAddingToCart(true)
    try {
      const qtyNum = parseFloat(quantity)
      if (isNaN(qtyNum) || qtyNum <= 0) {
        throw new Error('Quantité invalide')
      }
      
      const success = await addToCart(product, qtyNum)
      
      if (success) {
        setShowAnimation(true)
        
        toast({
          title: "Produit ajouté",
          description: `${quantity} ${product.unit} de ${product.name} ajouté(s) au panier`
        })
      } else {
        throw new Error('Erreur lors de l\'ajout au panier')
      }
      
      // Optionnel: rediriger vers le panier ou rester sur la page
      // router.push('/cart')
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'ajouter au panier",
        variant: "destructive"
      })
    } finally {
      setIsAddingToCart(false)
    }
  }
  
  const handleReservationComplete = (slotId: string, quantity: number) => {
    toast({
      title: "Réservation confirmée",
      description: `${quantity} ${product.unit} de ${product.name} réservé(s) pour livraison`
    })
    setShowDeliveryCalendar(false)
    
    // Déclencher l'événement de mise à jour du panier
    window.dispatchEvent(new CustomEvent('cart:updated'))
    
    // Optionnel: rediriger vers le panier après réservation
    // router.push('/cart')
  }
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-custom-accent" />
      </div>
    )
  }
  
  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h1 className="text-2xl font-bold mb-2">Produit non trouvé</h1>
        <p className="text-muted-foreground">Ce produit n'existe pas ou a été supprimé.</p>
      </div>
    )
  }
  
  return (
    <>
      <div className="container mx-auto p-4 py-8">
        <div className="bg-background border border-foreground/10 rounded-lg overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6">
            {/* Image du produit */}
            <div className="aspect-square bg-foreground/5 rounded-lg overflow-hidden">
              {product.image ? (
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-4xl">🍄</span>
                </div>
              )}
            </div>
            
            {/* Informations produit */}
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-bold text-custom-title">{product.name}</h1>
                <p className="text-sm text-muted-foreground">{product.type}</p>
              </div>
              
              <p className="text-lg font-semibold">{product.price.toFixed(2)} CHF / {product.unit}</p>
              
              <div className="prose text-custom-text">
                <p>{product.description}</p>
              </div>
              
              {/* Catégories */}
              {product.categories && product.categories.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {product.categories.map((category: any) => (
                    <span 
                      key={category.id} 
                      className="text-xs px-2 py-1 bg-custom-accent/10 text-custom-accent rounded-full"
                    >
                      {category.name}
                    </span>
                  ))}
                </div>
              )}
              
              {/* Disponibilité */}
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${product.available ? "bg-green-500" : "bg-red-500"}`}></div>
                <span>{product.available ? "Disponible" : "Indisponible"}</span>
                {product.stock && (
                  <span className="text-sm text-muted-foreground ml-2">
                    (Stock: {product.stock.quantity} {product.unit})
                  </span>
                )}
              </div>
              
              {/* Actions */}
              {product.available && (
                <div className="space-y-4">
                  {!showDeliveryCalendar && product.type !== ProductType.FRESH && (
                    <div className="flex gap-4 items-end">
                      <div>
                        <label htmlFor="quantity" className="block text-sm font-medium mb-1">
                          Quantité ({product.unit})
                        </label>
                        <div className="flex items-center">
                          <input
                            id="quantity"
                            type="number"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            min="0.1"
                            step="0.1"
                            className="w-24 rounded-md border border-foreground/10 bg-background px-3 py-2"
                          />
                        </div>
                      </div>
                      
                      <LoadingButton
                        onClick={handleAddToCart}
                        isLoading={isAddingToCart}
                        className="flex items-center gap-2"
                      >
                        <ShoppingCart className="h-5 w-5" />
                        Ajouter au panier
                      </LoadingButton>
                    </div>
                  )}
                  
                  {product.type === ProductType.FRESH && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg flex items-start gap-3">
                      <Truck className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
                          Produit frais avec livraison
                        </p>
                        <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                          Ce produit nécessite de réserver un créneau de livraison.
                        </p>
                        {!showDeliveryCalendar && (
                          <button
                            onClick={() => setShowDeliveryCalendar(true)}
                            className="mt-2 text-xs font-medium text-blue-600 dark:text-blue-300 hover:underline"
                          >
                            Réserver maintenant
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Calendrier de réservation pour les produits frais */}
                  {showDeliveryCalendar && product.type === ProductType.FRESH && (
                    <div className="mt-8">
                      <ProductDeliveryCalendar 
                        productId={productId} 
                        onReservationComplete={handleReservationComplete}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <AddToCartAnimation
        isOpen={showAnimation}
        onClose={() => setShowAnimation(false)}
        productName={product.name}
        productImage={product.image}
      />
    </>
  )
}