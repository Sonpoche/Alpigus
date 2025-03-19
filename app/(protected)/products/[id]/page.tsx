// app/(protected)/products/[id]/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useToast } from "@/hooks/use-toast"
import { ProductType } from '@prisma/client'
import { ShoppingCart, Truck, AlertCircle, ArrowLeft, Star, Box, Leaf, ShieldCheck, ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import ProductDeliveryCalendar from '@/components/client/product-delivery-calendar'
import { LoadingButton } from '@/components/ui/loading-button'
import { useCart } from '@/hooks/use-cart'
import { AddToCartAnimation } from '@/components/cart/add-to-cart-animation'
import { motion } from 'framer-motion'
import Link from 'next/link'
import RelatedProducts from '@/components/products/related-products'

export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const { addToCart } = useCart()
  const [product, setProduct] = useState<any>(null)
  const [producer, setProducer] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [quantity, setQuantity] = useState<string>("1")
  const [isAddingToCart, setIsAddingToCart] = useState(false)
  const [showDeliveryCalendar, setShowDeliveryCalendar] = useState(false)
  const [showAnimation, setShowAnimation] = useState(false)
  const [activeTab, setActiveTab] = useState<'description' | 'details' | 'reviews'>('description')
  
  const productId = params.id as string
  
  useEffect(() => {
    async function fetchProduct() {
      try {
        const response = await fetch(`/api/products/${productId}`)
        if (!response.ok) throw new Error('Erreur lors du chargement du produit')
        
        const data = await response.json()
        setProduct(data)
        setProducer(data.producer)
        
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
  }
  
  const getProductTypeIcon = () => {
    switch (product.type) {
      case ProductType.FRESH:
        return <Leaf className="h-5 w-5 mr-2 text-emerald-500" />
      case ProductType.DRIED:
        return <Box className="h-5 w-5 mr-2 text-amber-500" />
      case ProductType.SUBSTRATE:
        return <Box className="h-5 w-5 mr-2 text-blue-500" />
      case ProductType.WELLNESS:
        return <ShieldCheck className="h-5 w-5 mr-2 text-purple-500" />
      default:
        return <Box className="h-5 w-5 mr-2" />
    }
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
        {/* Breadcrumbs et navigation */}
        <div className="mb-6">
          <Link 
            href="/products" 
            className="flex items-center text-custom-text hover:text-custom-accent transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Retour au catalogue
          </Link>
        </div>
        
        <div className="bg-background border border-foreground/10 rounded-lg overflow-hidden shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6">
            {/* Image du produit */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="aspect-square bg-foreground/5 rounded-lg overflow-hidden"
            >
              {product.image ? (
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-6xl">🍄</span>
                </div>
              )}
            </motion.div>
            
            {/* Informations produit */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="space-y-6"
            >
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary" className="flex items-center">
                    {getProductTypeIcon()}
                    {product.type}
                  </Badge>
                  {product.available ? (
                    <Badge variant="success" className="bg-green-100 text-green-800 border-green-200">
                      En stock
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200">
                      Rupture de stock
                    </Badge>
                  )}
                </div>
                
                <h1 className="text-3xl font-bold text-custom-title">{product.name}</h1>
                
                <div className="flex items-center mt-2">
                  <div className="flex items-center text-amber-500">
                    <Star className="h-4 w-4 fill-amber-500" />
                    <Star className="h-4 w-4 fill-amber-500" />
                    <Star className="h-4 w-4 fill-amber-500" />
                    <Star className="h-4 w-4 fill-amber-500" />
                    <Star className="h-4 w-4 fill-amber-500 opacity-30" />
                  </div>
                  <span className="text-sm text-muted-foreground ml-2">4.5 (12 avis)</span>
                </div>
              </div>
              
              <div className="flex items-baseline">
                <span className="text-2xl font-semibold">{product.price.toFixed(2)} CHF</span>
                <span className="text-sm text-muted-foreground ml-2">/ {product.unit}</span>
              </div>
              
              {/* Catégories */}
              {product.categories && product.categories.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {product.categories.map((category: any) => (
                    <Badge 
                      key={category.id} 
                      variant="outline"
                    >
                      {category.name}
                    </Badge>
                  ))}
                </div>
              )}
              
              {/* Informations producteur */}
              {producer && (
                <div className="bg-foreground/5 p-4 rounded-lg">
                  <h3 className="font-medium mb-2">Producteur</h3>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-custom-accentLight rounded-full flex items-center justify-center text-custom-accent font-bold">
                      {producer.companyName ? producer.companyName.charAt(0) : 'P'}
                    </div>
                    <div>
                      <p className="font-medium">{producer.companyName || producer.user?.name}</p>
                      <p className="text-xs text-muted-foreground">{producer.address}</p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Stock */}
              {product.stock && (
                <div className="bg-foreground/5 p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-medium">Stock disponible</h3>
                    <span className="text-sm font-medium">{product.stock.quantity} {product.unit}</span>
                  </div>
                  <div className="h-2 w-full bg-foreground/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-custom-accent"
                      style={{ width: `${Math.min(100, (product.stock.quantity / 100) * 100)}%` }}
                    ></div>
                  </div>
                </div>
              )}
              
              {/* Actions */}
              {product.available && (
                <div className="space-y-4">
                  {!showDeliveryCalendar && product.type !== ProductType.FRESH && (
                    <div className="flex gap-4 items-end">
                      <div>
                        <label htmlFor="quantity" className="block text-sm font-medium mb-1">
                          Quantité ({product.unit})
                        </label>
                        <div className="flex items-center border border-foreground/10 rounded-md">
                          <button
                            onClick={() => setQuantity(Math.max(0.1, parseFloat(quantity) - 0.1).toString())}
                            className="w-10 h-10 flex items-center justify-center hover:bg-foreground/5 transition-colors"
                          >
                            -
                          </button>
                          <input
                            id="quantity"
                            type="number"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            min="0.1"
                            step="0.1"
                            className="w-16 h-10 text-center border-x border-foreground/10"
                          />
                          <button
                            onClick={() => setQuantity((parseFloat(quantity) + 0.1).toString())}
                            className="w-10 h-10 flex items-center justify-center hover:bg-foreground/5 transition-colors"
                          >
                            +
                          </button>
                        </div>
                      </div>
                      
                      <LoadingButton
                        onClick={handleAddToCart}
                        isLoading={isAddingToCart}
                        className="flex items-center gap-2 flex-grow"
                        size="lg"
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
                </div>
              )}
              
              {/* Caractéristiques */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2 p-3 bg-foreground/5 rounded-lg">
                  <Box className="h-5 w-5 text-custom-accent" />
                  <div>
                    <p className="text-xs text-muted-foreground">Type</p>
                    <p className="text-sm font-medium">{product.type}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 bg-foreground/5 rounded-lg">
                  <Leaf className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">Origine</p>
                    <p className="text-sm font-medium">Suisse</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
          
          {/* Onglets */}
          <div className="px-6 border-t border-foreground/10 mt-6">
            <div className="flex border-b border-foreground/10">
              <button 
                onClick={() => setActiveTab('description')}
                className={`px-4 py-3 font-medium text-sm relative ${
                  activeTab === 'description' 
                    ? 'text-custom-accent' 
                    : 'text-foreground/60 hover:text-foreground'
                }`}
              >
                Description
                {activeTab === 'description' && (
                  <motion.div 
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-custom-accent" 
                  />
                )}
              </button>
              <button 
                onClick={() => setActiveTab('details')}
                className={`px-4 py-3 font-medium text-sm relative ${
                  activeTab === 'details' 
                    ? 'text-custom-accent' 
                    : 'text-foreground/60 hover:text-foreground'
                }`}
              >
                Détails
                {activeTab === 'details' && (
                  <motion.div 
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-custom-accent" 
                  />
                )}
              </button>
              <button 
                onClick={() => setActiveTab('reviews')}
                className={`px-4 py-3 font-medium text-sm relative ${
                  activeTab === 'reviews' 
                    ? 'text-custom-accent' 
                    : 'text-foreground/60 hover:text-foreground'
                }`}
              >
                Avis
                {activeTab === 'reviews' && (
                  <motion.div 
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-custom-accent" 
                  />
                )}
              </button>
            </div>
            
            <div className="py-6">
              {activeTab === 'description' && (
                <div className="prose max-w-none text-custom-text">
                  {product.description ? (
                    <p>{product.description}</p>
                  ) : (
                    <p className="text-muted-foreground italic">Aucune description disponible pour ce produit.</p>
                  )}
                </div>
              )}
              
              {activeTab === 'details' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-foreground/5 p-4 rounded-lg">
                      <h3 className="font-medium mb-2">Caractéristiques</h3>
                      <ul className="space-y-2">
                        <li className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Type:</span>
                          <span className="text-sm font-medium">{product.type}</span>
                        </li>
                        <li className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Unité:</span>
                          <span className="text-sm font-medium">{product.unit}</span>
                        </li>
                        <li className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Prix unitaire:</span>
                          <span className="text-sm font-medium">{product.price.toFixed(2)} CHF</span>
                        </li>
                        <li className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Disponibilité:</span>
                          <span className={`text-sm font-medium ${product.available ? 'text-green-600' : 'text-red-600'}`}>
                            {product.available ? 'En stock' : 'Indisponible'}
                          </span>
                        </li>
                      </ul>
                    </div>
                    
                    <div className="bg-foreground/5 p-4 rounded-lg">
                      <h3 className="font-medium mb-2">Informations producteur</h3>
                      {producer ? (
                        <ul className="space-y-2">
                          <li className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Nom:</span>
                            <span className="text-sm font-medium">{producer.companyName || producer.user?.name}</span>
                          </li>
                          {producer.address && (
                            <li className="flex justify-between">
                              <span className="text-sm text-muted-foreground">Localisation:</span>
                              <span className="text-sm font-medium">{producer.address}</span>
                            </li>
                          )}
                          <li className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Contact:</span>
                            <span className="text-sm font-medium">{producer.user?.email}</span>
                          </li>
                        </ul>
                      ) : (
                        <p className="text-muted-foreground italic">Informations non disponibles</p>
                      )}
                    </div>
                  </div>
                  
                  {/* Catégories détaillées */}
                  {product.categories && product.categories.length > 0 && (
                    <div className="bg-foreground/5 p-4 rounded-lg">
                      <h3 className="font-medium mb-2">Catégories</h3>
                      <div className="flex flex-wrap gap-2">
                        {product.categories.map((category: any) => (
                          <Badge 
                            key={category.id} 
                            variant="secondary"
                            className="py-1.5"
                          >
                            {category.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {activeTab === 'reviews' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold">Avis clients</h3>
                    <button className="text-sm font-medium text-custom-accent hover:underline flex items-center">
                      Laisser un avis <ChevronRight className="h-4 w-4 ml-1" />
                    </button>
                  </div>
                  
                  <div className="bg-foreground/5 p-6 rounded-lg text-center">
                    <p className="text-muted-foreground">Aucun avis pour le moment.</p>
                    <button className="mt-4 text-sm font-medium text-custom-accent hover:underline">
                      Soyez le premier à donner votre avis
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Calendrier de réservation pour les produits frais */}
        {showDeliveryCalendar && product.type === ProductType.FRESH && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 bg-background border border-foreground/10 rounded-lg p-6 shadow-sm"
          >
            <h2 className="text-xl font-semibold mb-6">Réservation de livraison</h2>
            <ProductDeliveryCalendar 
              productId={productId} 
              onReservationComplete={handleReservationComplete}
            />
          </motion.div>
        )}
        
        {/* Produits apparentés */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold mb-6">Produits similaires</h2>
          {product.categories && product.categories.length > 0 && product.type && (
            <RelatedProducts 
              currentProductId={productId} 
              categoryId={product.categories[0].id}
              productType={product.type}
            />
          )}
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