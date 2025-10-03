// Chemin du fichier: components/shop/shop-homepage.tsx
'use client'

import { useState, useEffect } from 'react'
import { ProductType } from '@prisma/client'
import { X } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useLocalCart } from '@/hooks/use-local-cart'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import Image from 'next/image'

interface Product {
  id: string
  name: string
  description: string
  price: number
  type: ProductType
  unit: string
  available: boolean
  image: string | null
  stock?: { quantity: number } | null
  producer?: {
    companyName?: string | null
    user: {
      name: string | null
    }
  }
}

interface Filters {
  type: string
  minPrice: string
  maxPrice: string
  available: boolean | null
  sortBy: string
  producer: string
  organic: boolean | null
}

export default function ShopHomepage() {
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [filters, setFilters] = useState<Filters>({
    type: '',
    minPrice: '',
    maxPrice: '',
    available: null,
    sortBy: 'newest',
    producer: '',
    organic: null
  })
  const [isLoading, setIsLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [gridSize, setGridSize] = useState<'small' | 'large'>('small')
  const { toast } = useToast()

  useEffect(() => {
    useLocalCart.persist.rehydrate()
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/public/products')
      if (!response.ok) throw new Error('Erreur')
      
      const data = await response.json()
      setProducts(data.products || [])
      setFilteredProducts(data.products || [])
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les produits",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Filtrage des produits
  useEffect(() => {
    let result = [...products]

    if (filters.type) {
      result = result.filter(p => p.type === filters.type)
    }
    if (filters.minPrice) {
      result = result.filter(p => p.price >= parseFloat(filters.minPrice))
    }
    if (filters.maxPrice) {
      result = result.filter(p => p.price <= parseFloat(filters.maxPrice))
    }
    if (filters.available !== null) {
      result = result.filter(p => p.available === filters.available)
    }
    if (filters.producer) {
      result = result.filter(p => 
        p.producer?.companyName?.toLowerCase().includes(filters.producer.toLowerCase()) ||
        p.producer?.user?.name?.toLowerCase().includes(filters.producer.toLowerCase())
      )
    }

    // Tri
    switch (filters.sortBy) {
      case 'price_asc':
        result.sort((a, b) => a.price - b.price)
        break
      case 'price_desc':
        result.sort((a, b) => b.price - a.price)
        break
      case 'name':
        result.sort((a, b) => a.name.localeCompare(b.name))
        break
    }

    setFilteredProducts(result)
  }, [products, filters])

  const resetFilters = () => {
    setFilters({
      type: '',
      minPrice: '',
      maxPrice: '',
      available: null,
      sortBy: 'newest',
      producer: '',
      organic: null
    })
  }

  const activeFiltersCount = () => {
    let count = 0
    if (filters.type) count++
    if (filters.minPrice) count++
    if (filters.maxPrice) count++
    if (filters.available !== null) count++
    if (filters.producer) count++
    if (filters.organic !== null) count++
    return count
  }

  return (
    <div className="w-full min-h-screen bg-white">
      {/* Sidebar de filtres */}
      <AnimatePresence>
        {showFilters && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 z-40"
              onClick={() => setShowFilters(false)}
            />
            
            <motion.div
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              exit={{ x: -320 }}
              transition={{ type: "spring", damping: 25 }}
              className="fixed left-0 top-0 h-full w-80 bg-white z-50 shadow-xl overflow-y-auto"
            >
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="font-medium text-black">Filtres</h2>
                <button
                  onClick={() => setShowFilters(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-4 w-4 text-black" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Type de produit */}
                <div>
                  <h3 className="text-sm font-medium mb-3 text-black">Type de produit</h3>
                  <div className="space-y-2">
                    {[
                      { value: '', label: 'Tous' },
                      { value: ProductType.FRESH, label: 'Frais' },
                      { value: ProductType.DRIED, label: 'Séchés' },
                      { value: ProductType.SUBSTRATE, label: 'Substrats' },
                      { value: ProductType.WELLNESS, label: 'Bien-être' }
                    ].map((option) => (
                      <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="type"
                          checked={filters.type === option.value}
                          onChange={() => setFilters({...filters, type: option.value})}
                          className="w-4 h-4 text-black focus:ring-0"
                        />
                        <span className="text-sm text-black">{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Prix */}
                <div>
                  <h3 className="text-sm font-medium mb-3 text-black">Prix (CHF)</h3>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Min"
                      value={filters.minPrice}
                      onChange={(e) => setFilters({...filters, minPrice: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-black bg-white text-black"
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      value={filters.maxPrice}
                      onChange={(e) => setFilters({...filters, maxPrice: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-black bg-white text-black"
                    />
                  </div>
                </div>

                {/* Disponibilité */}
                <div>
                  <h3 className="text-sm font-medium mb-3 text-black">Disponibilité</h3>
                  <div className="space-y-2">
                    {[
                      { value: null, label: 'Tous' },
                      { value: true, label: 'En stock' },
                      { value: false, label: 'Rupture de stock' }
                    ].map((option, idx) => (
                      <label key={idx} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="available"
                          checked={filters.available === option.value}
                          onChange={() => setFilters({...filters, available: option.value})}
                          className="w-4 h-4 text-black focus:ring-0"
                        />
                        <span className="text-sm text-black">{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Producteur */}
                <div>
                  <h3 className="text-sm font-medium mb-3 text-black">Producteur</h3>
                  <input
                    type="text"
                    placeholder="Rechercher un producteur"
                    value={filters.producer}
                    onChange={(e) => setFilters({...filters, producer: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-black bg-white text-black placeholder:text-gray-500"
                  />
                </div>

                {/* Tri */}
                <div>
                  <h3 className="text-sm font-medium mb-3 text-black">Trier par</h3>
                  <select
                    value={filters.sortBy}
                    onChange={(e) => setFilters({...filters, sortBy: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-black bg-white text-black"
                  >
                    <option value="newest">Plus récents</option>
                    <option value="name">Nom (A-Z)</option>
                    <option value="price_asc">Prix croissant</option>
                    <option value="price_desc">Prix décroissant</option>
                  </select>
                </div>

                <div className="pt-4 space-y-2">
                  <button
                    onClick={resetFilters}
                    className="w-full py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors text-black"
                  >
                    Réinitialiser les filtres
                  </button>
                  <button
                    onClick={() => setShowFilters(false)}
                    className="w-full py-2 bg-black text-white rounded-lg text-sm hover:bg-gray-800 transition-colors"
                  >
                    Appliquer ({filteredProducts.length} produits)
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Contrôles principaux */}
      <div className="max-w-7xl mx-auto px-8 pt-8 pb-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 text-sm text-black hover:opacity-60 transition-opacity"
          >
            <div className="flex flex-col gap-0.5">
              <div className="w-4 h-0.5 bg-black"></div>
              <div className="w-3 h-0.5 bg-black"></div>
              <div className="w-3.5 h-0.5 bg-black"></div>
            </div>
            <span>Filtres</span>
            {activeFiltersCount() > 0 && (
              <span className="bg-black text-white text-xs px-2 py-0.5 rounded-full">
                {activeFiltersCount()}
              </span>
            )}
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setGridSize('large')}
              className={cn(
                "p-2 transition-opacity",
                gridSize === 'large' ? "opacity-100" : "opacity-40 hover:opacity-60"
              )}
            >
              <div className="grid grid-cols-2 gap-0.5 w-4 h-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="w-1.5 h-1.5 bg-black" />
                ))}
              </div>
            </button>
            <button
              onClick={() => setGridSize('small')}
              className={cn(
                "p-2 transition-opacity",
                gridSize === 'small' ? "opacity-100" : "opacity-40 hover:opacity-60"
              )}
            >
              <div className="grid grid-cols-3 gap-0.5 w-4 h-4">
                {[...Array(9)].map((_, i) => (
                  <div key={i} className="w-1 h-1 bg-black" />
                ))}
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Grille de produits */}
      <div className="max-w-7xl mx-auto px-8 pb-16">
        {isLoading ? (
          <LoadingSkeleton gridSize={gridSize} />
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-500 text-lg mb-4">Aucun produit trouvé</p>
            <button
              onClick={resetFilters}
              className="text-sm text-black underline hover:no-underline"
            >
              Réinitialiser les filtres
            </button>
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className={cn(
              "grid gap-6",
              gridSize === 'small' 
                ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
                : "grid-cols-1 lg:grid-cols-3"
            )}
          >
            {filteredProducts.map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
              >
                <ProductCard product={product} size={gridSize} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      {/* Section CTA d'inscription */}
      <div className="bg-gray-50 border-y border-gray-200">
        <div className="max-w-4xl mx-auto px-8 py-20 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h3 className="text-3xl md:text-4xl font-light text-black mb-6 tracking-tight">
              Rejoignez notre communauté
            </h3>
            <p className="text-lg text-gray-600 mb-10 font-light max-w-2xl mx-auto leading-relaxed">
              Créez votre compte pour accéder à des fonctionnalités exclusives, 
              suivre vos commandes et découvrir de nouveaux producteurs locaux.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-sm mx-auto mb-8">
              <Link 
                href="/inscription"
                className="flex-1 bg-black text-white px-8 py-4 rounded-xl hover:bg-gray-800 transition-all duration-300 font-light text-center hover:shadow-lg hover:-translate-y-0.5"
              >
                Créer un compte
              </Link>
              <Link 
                href="/connexion"
                className="flex-1 border border-gray-300 text-black px-8 py-4 rounded-xl hover:bg-gray-50 hover:shadow-md transition-all duration-300 font-light text-center"
              >
                Se connecter
              </Link>
            </div>
            
            <p className="text-sm text-gray-500 font-light">
              Déjà membre ? Connectez-vous pour profiter de votre expérience personnalisée.
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

// Carte produit
function ProductCard({ product, size }: { product: Product; size: 'small' | 'large' }) {
  const [quantity, setQuantity] = useState(1)
  const { toast } = useToast()
  const addItem = useLocalCart((state) => state.addItem)

  const handleAddToCart = () => {
    addItem({
      productId: product.id,
      productName: product.name,
      price: product.price,
      quantity,
      unit: product.unit,
      image: product.image || undefined,
      type: product.type
    })

    toast({
      title: "Ajouté au panier",
      description: `${quantity} ${product.unit} de ${product.name}`
    })
    
    setQuantity(1)
  }

  return (
    <div className="group border border-gray-200 rounded-2xl overflow-hidden bg-white hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
      <Link href={`/products/${product.id}`}>
        <div className={cn(
          "relative bg-gray-50",
          size === 'small' ? "aspect-[4/3]" : "aspect-[3/2]"
        )}>
          {product.image ? (
            <Image
              src={product.image}
              alt={product.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-gray-400">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          )}
          {!product.available && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center">
              <span className="text-black text-sm font-light border border-gray-300 px-3 py-1 rounded-full bg-white/90">
                Indisponible
              </span>
            </div>
          )}
          
          {/* Badge type de produit */}
          <div className="absolute top-3 left-3">
            <span className="bg-white/90 backdrop-blur-sm text-xs px-2 py-1 rounded-full text-black font-light">
              {product.type === ProductType.FRESH && 'Frais'}
              {product.type === ProductType.DRIED && 'Séché'}
              {product.type === ProductType.SUBSTRATE && 'Substrat'}
              {product.type === ProductType.WELLNESS && 'Bien-être'}
            </span>
          </div>
        </div>
      </Link>

      <div className="p-4">
        <Link href={`/products/${product.id}`}>
          <h3 className="font-medium text-base mb-1 hover:opacity-60 transition-opacity leading-tight text-black">
            {product.name}
          </h3>
        </Link>
        
        {/* Producteur */}
        {product.producer && (
          <p className="text-xs text-gray-500 mb-2 font-light">
            {product.producer.companyName || product.producer.user.name}
          </p>
        )}
        
        <div className="border-t border-dashed border-gray-200 my-3"></div>
        
        {product.available ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-8 h-8 border border-gray-300 rounded-lg hover:border-black transition-colors flex items-center justify-center text-sm"
              >
                -
              </button>
              
              <div className="text-center">
                <div className="text-sm font-medium text-black">
                  {(product.price * quantity).toFixed(2)} CHF
                </div>
                <div className="text-xs text-gray-500">
                  {quantity} {product.unit} × {product.price.toFixed(2)} CHF
                </div>
              </div>
              
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="w-8 h-8 border border-gray-300 rounded-lg hover:border-black transition-colors flex items-center justify-center text-sm"
              >
                +
              </button>
            </div>
            
            <button
              onClick={handleAddToCart}
              className="w-full text-xs bg-black text-white py-2.5 px-3 rounded-lg hover:bg-gray-800 transition-colors font-light"
            >
              Ajouter au panier
            </button>
          </div>
        ) : (
          <div className="text-center py-3">
            <p className="text-xs text-gray-500 font-light">Produit indisponible</p>
          </div>
        )}
      </div>
    </div>
  )
}

// Skeleton de chargement
function LoadingSkeleton({ gridSize }: { gridSize: 'small' | 'large' }) {
  return (
    <div className={cn(
      "grid gap-6",
      gridSize === 'small' 
        ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
        : "grid-cols-1 lg:grid-cols-3"
    )}>
      {[...Array(8)].map((_, i) => (
        <div key={i} className="border border-gray-200 rounded-2xl overflow-hidden animate-pulse">
          <div className={cn(
            "bg-gray-200",
            gridSize === 'small' ? "aspect-[4/3]" : "aspect-[3/2]"
          )}></div>
          <div className="p-4">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2 mb-3"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
          </div>
        </div>
      ))}
    </div>
  )
}