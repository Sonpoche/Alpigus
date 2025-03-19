// components/products/product-catalog.tsx
'use client'

import { useState, useEffect } from 'react'
import { ProductType } from '@prisma/client'
import { Search, Filter, SlidersHorizontal } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { ProductCard } from './product-card'

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
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}