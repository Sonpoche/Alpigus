// components/products/product-catalog.tsx
'use client'

import { useState, useEffect } from 'react'
import { ProductType } from '@prisma/client'
import { Search, Filter, SlidersHorizontal, ShoppingCart, Info, Truck } from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/hooks/use-toast'
import { LoadingButton } from '@/components/ui/loading-button'

interface Category {
  id: string
  name: string
}

interface Product {
  id: string
  name: string
  description: string
  price: number
  type: ProductType
  unit: string
  available: boolean
  image: string | null
  categories: Category[]
  stock?: {
    quantity: number
  } | null
}

interface FilterState {
  search: string
  type: ProductType | ''
  category: string
  minPrice: string
  maxPrice: string
  available: boolean | null
  sortBy: 'price_asc' | 'price_desc' | 'newest' | 'popular'
}

const initialFilters: FilterState = {
  search: '',
  type: '',
  category: '',
  minPrice: '',
  maxPrice: '',
  available: null,
  sortBy: 'newest'
}

export default function ProductCatalog() {
  // États
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [filters, setFilters] = useState<FilterState>(initialFilters)
  const [isLoading, setIsLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [loadingProductId, setLoadingProductId] = useState<string | null>(null)
  const { toast } = useToast()

  // Charger les données initiales
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Charger les catégories
        const categoriesResponse = await fetch('/api/categories')
        if (!categoriesResponse.ok) throw new Error('Erreur lors du chargement des catégories')
        const categoriesData = await categoriesResponse.json()
        setCategories(categoriesData)

        // Charger les produits
        const productsResponse = await fetch('/api/products')
        if (!productsResponse.ok) throw new Error('Erreur lors du chargement des produits')
        const productsData = await productsResponse.json()
        setProducts(productsData.products)
      } catch (error) {
        console.error('Erreur:', error)
        toast({
          title: "Erreur",
          description: "Impossible de charger les produits",
          variant: "destructive"
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [toast])

  // Fonction pour ajouter rapidement au panier
  const handleQuickAddToCart = async (productId: string) => {
    setLoadingProductId(productId)
    try {
      const product = products.find(p => p.id === productId)
      if (!product) throw new Error("Produit non trouvé")
      
      if (product.type === ProductType.FRESH) {
        // Rediriger vers la page de détail pour les produits frais
        window.location.href = `/products/${productId}`
        return
      }
      
      // Vérifier si une commande en cours existe
      const storedOrderId = localStorage.getItem('currentOrderId')
      let finalOrderId: string;
      
      if (!storedOrderId) {
        const orderResponse = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: [] })
        })
        
        if (!orderResponse.ok) throw new Error("Erreur lors de la création de la commande")
        
        const orderData = await orderResponse.json()
        finalOrderId = orderData.id
        localStorage.setItem('currentOrderId', finalOrderId)
      } else {
        finalOrderId = storedOrderId
      }
      
      // Ajouter l'article au panier (quantité par défaut = 1)
      const response = await fetch('/api/orders/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: finalOrderId,
          productId: productId,
          quantity: 1
        })
      })
      
      if (!response.ok) throw new Error('Erreur lors de l\'ajout au panier')
      
      toast({
        title: "Produit ajouté",
        description: `1 ${product.unit} de ${product.name} ajouté au panier`
      })
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'ajouter au panier",
        variant: "destructive"
      })
    } finally {
      setLoadingProductId(null)
    }
  }

  // Appliquer les filtres
  const filteredProducts = products.filter(product => {
    // Recherche textuelle
    if (filters.search && !product.name.toLowerCase().includes(filters.search.toLowerCase())) {
      return false
    }

    // Filtre par type
    if (filters.type && product.type !== filters.type) {
      return false
    }

    // Filtre par catégorie
    if (filters.category && !product.categories.some(cat => cat.id === filters.category)) {
      return false
    }

    // Filtre par prix min
    if (filters.minPrice && product.price < parseFloat(filters.minPrice)) {
      return false
    }

    // Filtre par prix max
    if (filters.maxPrice && product.price > parseFloat(filters.maxPrice)) {
      return false
    }

    // Filtre par disponibilité
    if (filters.available !== null && product.available !== filters.available) {
      return false
    }

    return true
  }).sort((a, b) => {
    // Tri
    switch (filters.sortBy) {
      case 'price_asc':
        return a.price - b.price
      case 'price_desc':
        return b.price - a.price
      case 'newest':
        return 0 // À implémenter avec createdAt
      case 'popular':
        return 0 // À implémenter avec les stats de vente
      default:
        return 0
    }
  })

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-custom-accent" />
      </div>
    )
  }

  return (
    <div className="flex gap-6">
      {/* Barre latérale des filtres */}
      <div className={`w-64 shrink-0 space-y-6 ${showFilters ? 'block' : 'hidden lg:block'}`}>
        <div className="bg-background border border-foreground/10 rounded-lg p-4">
          <h2 className="font-montserrat font-semibold text-lg mb-4">Filtres</h2>

          {/* Recherche */}
          <div className="space-y-4">
            <div className="relative">
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                placeholder="Rechercher..."
                className="w-full pl-9 pr-3 py-2 bg-background border border-foreground/10 rounded-md"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/60" />
            </div>

            {/* Type de produit */}
            <div>
              <label className="block text-sm font-medium mb-2">Type</label>
              <select
                value={filters.type}
                onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value as ProductType | '' }))}
                className="w-full px-3 py-2 bg-background border border-foreground/10 rounded-md"
              >
                <option value="">Tous les types</option>
                {Object.values(ProductType).map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            {/* Catégories */}
            <div>
              <label className="block text-sm font-medium mb-2">Catégorie</label>
              <select
                value={filters.category}
                onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                className="w-full px-3 py-2 bg-background border border-foreground/10 rounded-md"
              >
                <option value="">Toutes les catégories</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </div>

            {/* Prix */}
            <div>
              <label className="block text-sm font-medium mb-2">Prix (CHF)</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  value={filters.minPrice}
                  onChange={(e) => setFilters(prev => ({ ...prev, minPrice: e.target.value }))}
                  placeholder="Min"
                  className="w-full px-3 py-2 bg-background border border-foreground/10 rounded-md"
                />
                <input
                  type="number"
                  value={filters.maxPrice}
                  onChange={(e) => setFilters(prev => ({ ...prev, maxPrice: e.target.value }))}
                  placeholder="Max"
                  className="w-full px-3 py-2 bg-background border border-foreground/10 rounded-md"
                />
              </div>
            </div>

            {/* Disponibilité */}
            <div>
              <label className="block text-sm font-medium mb-2">Disponibilité</label>
              <select
                value={filters.available === null ? '' : filters.available.toString()}
                onChange={(e) => {
                  const value = e.target.value
                  setFilters(prev => ({
                    ...prev,
                    available: value === '' ? null : value === 'true'
                  }))
                }}
                className="w-full px-3 py-2 bg-background border border-foreground/10 rounded-md"
              >
                <option value="">Tous</option>
                <option value="true">Disponible</option>
                <option value="false">Indisponible</option>
              </select>
            </div>

            {/* Tri */}
            <div>
              <label className="block text-sm font-medium mb-2">Trier par</label>
              <select
                value={filters.sortBy}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  sortBy: e.target.value as FilterState['sortBy']
                }))}
                className="w-full px-3 py-2 bg-background border border-foreground/10 rounded-md"
              >
                <option value="newest">Plus récents</option>
                <option value="price_asc">Prix croissant</option>
                <option value="price_desc">Prix décroissant</option>
                <option value="popular">Popularité</option>
              </select>
            </div>

            {/* Réinitialiser les filtres */}
            <button
              onClick={() => setFilters(initialFilters)}
              className="w-full py-2 text-sm text-custom-accent hover:opacity-80"
            >
              Réinitialiser les filtres
            </button>
          </div>
        </div>
      </div>

      {/* Liste des produits */}
      <div className="flex-1">
        {/* En-tête avec stats et contrôles */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold font-montserrat text-title">Catalogue</h1>
            <p className="text-sm text-muted-foreground">
              {filteredProducts.length} produit{filteredProducts.length > 1 ? 's' : ''} trouvé{filteredProducts.length > 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="lg:hidden p-2 hover:bg-foreground/5 rounded-md transition-colors"
          >
            <Filter className="h-5 w-5" />
          </button>
        </div>

        {/* Grille de produits */}
        {filteredProducts.length === 0 ? (
          <div className="text-center py-12 bg-background border border-foreground/10 rounded-lg">
            <SlidersHorizontal className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-custom-text">Aucun produit ne correspond à vos critères</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map(product => (
              <div
                key={product.id}
                className="bg-background border border-foreground/10 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Image avec lien vers détail */}
                <Link href={`/products/${product.id}`}>
                  <div className="aspect-square bg-foreground/5">
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
                </Link>

                {/* Infos */}
                <div className="p-4">
                  <Link href={`/products/${product.id}`}>
                    <h3 className="font-semibold text-custom-title mb-1 hover:text-custom-accent">
                      {product.name}
                    </h3>
                  </Link>
                  <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{product.description}</p>
                  
                  {/* Prix et disponibilité */}
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-lg">{product.price.toFixed(2)} CHF</span>
                    <span className={`text-sm ${product.available ? 'text-green-600' : 'text-red-600'}`}>
                      {product.available ? 'Disponible' : 'Indisponible'}
                    </span>
                  </div>

                  {/* Tags */}
                  <div className="mt-2 flex flex-wrap gap-1 mb-3">
                    <span className="text-xs px-2 py-1 bg-foreground/5 rounded-full">
                      {product.type}
                    </span>
                    {product.categories.map(cat => (
                      <span
                        key={cat.id}
                        className="text-xs px-2 py-1 bg-custom-accent/10 text-custom-accent rounded-full"
                      >
                        {cat.name}
                      </span>
                    ))}
                  </div>
                  
                  {/* Boutons d'action */}
                  {product.available && (
                    <div className="flex gap-2 mt-3">
                      <Link 
                        href={`/products/${product.id}`}
                        className="flex-1 flex items-center justify-center gap-2 py-2 border border-foreground/10 rounded-md hover:bg-foreground/5 transition-colors text-sm font-medium"
                      >
                        <Info className="h-4 w-4" />
                        Détails
                      </Link>
                      
                      {product.type === ProductType.FRESH ? (
                        <Link 
                          href={`/products/${product.id}`}
                          className="flex-1 flex items-center justify-center gap-2 py-2 bg-custom-accent text-white rounded-md hover:opacity-90 transition-opacity text-sm font-medium"
                        >
                          <Truck className="h-4 w-4" />
                          Réserver
                        </Link>
                      ) : (
                        <LoadingButton
                          onClick={() => handleQuickAddToCart(product.id)}
                          isLoading={loadingProductId === product.id}
                          className="flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium"
                        >
                          <ShoppingCart className="h-4 w-4" />
                          Ajouter
                        </LoadingButton>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}