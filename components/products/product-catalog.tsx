// components/products/product-catalog.tsx
'use client'

import { useState, useEffect } from 'react'
import { ProductType } from '@prisma/client'
import { 
  Search, 
  Filter, 
  GridIcon, 
  List, 
  SlidersHorizontal, 
  X, 
  ChevronDown, 
  Tag, 
  ArrowRight,
  ArrowLeft
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { ProductCard } from './product-card'
import { ProductListItem } from './product-list-item'
import { Badge } from '@/components/ui/badge'
import { motion, AnimatePresence } from 'framer-motion'
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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showFilters, setShowFilters] = useState(false)
  const [showMobileFilters, setShowMobileFilters] = useState(false)
  const [activeFilters, setActiveFilters] = useState<string[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
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
        fetchProducts()
      } catch (error) {
        console.error('Erreur:', error)
        toast({
          title: "Erreur",
          description: "Impossible de charger les données",
          variant: "destructive"
        })
        setIsLoading(false)
      }
    }

    fetchData()
  }, [toast])
  
  // Mise à jour des filtres actifs
  useEffect(() => {
    const newActiveFilters: string[] = []
    
    if (filters.type) {
      newActiveFilters.push(`Type: ${filters.type}`)
    }
    
    if (filters.category) {
      const categoryName = categories.find(c => c.id === filters.category)?.name
      if (categoryName) {
        newActiveFilters.push(`Catégorie: ${categoryName}`)
      }
    }
    
    if (filters.minPrice) {
      newActiveFilters.push(`Prix min: ${filters.minPrice} CHF`)
    }
    
    if (filters.maxPrice) {
      newActiveFilters.push(`Prix max: ${filters.maxPrice} CHF`)
    }
    
    if (filters.available !== null) {
      newActiveFilters.push(`Disponibilité: ${filters.available ? 'Disponible' : 'Indisponible'}`)
    }
    
    setActiveFilters(newActiveFilters)
  }, [filters, categories])
  
  // Fonction pour récupérer les produits
  const fetchProducts = async (pageNum = 1) => {
    setIsLoading(true)
    
    try {
      // Construire l'URL avec les filtres
      const url = new URL('/api/products', window.location.origin)
      url.searchParams.append('page', pageNum.toString())
      url.searchParams.append('limit', '12')
      
      if (filters.search) url.searchParams.append('search', filters.search)
      if (filters.type) url.searchParams.append('type', filters.type)
      if (filters.category) url.searchParams.append('category', filters.category)
      if (filters.minPrice) url.searchParams.append('minPrice', filters.minPrice)
      if (filters.maxPrice) url.searchParams.append('maxPrice', filters.maxPrice)
      if (filters.available !== null) url.searchParams.append('available', filters.available.toString())
      if (filters.sortBy) url.searchParams.append('sortBy', filters.sortBy)
      
      const response = await fetch(url.toString())
      if (!response.ok) throw new Error('Erreur lors du chargement des produits')
      
      const data = await response.json()
      setProducts(data.products)
      setTotalPages(data.pagination.pages)
      setPage(pageNum)
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
  
  // Appliquer les filtres
  const applyFilters = () => {
    fetchProducts(1)
    setShowMobileFilters(false)
  }
  
  // Réinitialiser les filtres
  const resetFilters = () => {
    setFilters(initialFilters)
    fetchProducts(1)
    setShowMobileFilters(false)
  }
  
  // Supprimer un filtre actif
  const removeFilter = (filter: string) => {
    const [type, value] = filter.split(': ')
    
    switch (type) {
      case 'Type':
        setFilters(prev => ({ ...prev, type: '' }))
        break
      case 'Catégorie':
        setFilters(prev => ({ ...prev, category: '' }))
        break
      case 'Prix min':
        setFilters(prev => ({ ...prev, minPrice: '' }))
        break
      case 'Prix max':
        setFilters(prev => ({ ...prev, maxPrice: '' }))
        break
      case 'Disponibilité':
        setFilters(prev => ({ ...prev, available: null }))
        break
      default:
        break
    }
    
    fetchProducts(1)
  }

  // Rendu du squelette de chargement
  const renderSkeletons = () => {
    if (viewMode === 'grid') {
      return [...Array(12)].map((_, index) => (
        <div key={index} className="card animate-pulse">
          <div className="aspect-square bg-foreground/10 rounded-t-lg"></div>
          <div className="card-body">
            <div className="h-6 w-2/3 bg-foreground/10 rounded mb-2"></div>
            <div className="h-4 w-full bg-foreground/10 rounded mb-2"></div>
            <div className="h-4 w-4/5 bg-foreground/10 rounded mb-4"></div>
            <div className="flex justify-between mb-3">
              <div className="h-6 w-1/4 bg-foreground/10 rounded"></div>
              <div className="h-6 w-1/4 bg-foreground/10 rounded"></div>
            </div>
            <div className="flex gap-2">
              <div className="h-10 w-1/2 bg-foreground/10 rounded"></div>
              <div className="h-10 w-1/2 bg-foreground/10 rounded"></div>
            </div>
          </div>
        </div>
      ))
    } else {
      return [...Array(8)].map((_, index) => (
        <div key={index} className="card animate-pulse p-4 flex">
          <div className="w-24 h-24 bg-foreground/10 rounded-lg mr-4 flex-shrink-0"></div>
          <div className="flex-1">
            <div className="h-6 w-1/2 bg-foreground/10 rounded mb-2"></div>
            <div className="h-4 w-3/4 bg-foreground/10 rounded mb-2"></div>
            <div className="h-4 w-1/2 bg-foreground/10 rounded mb-4"></div>
            <div className="flex justify-between">
              <div className="h-6 w-1/4 bg-foreground/10 rounded"></div>
              <div className="flex gap-2">
                <div className="h-8 w-20 bg-foreground/10 rounded"></div>
                <div className="h-8 w-20 bg-foreground/10 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      ))
    }
  }

  return (
    <div className="relative">
      {/* Overlay des filtres mobiles */}
      {showMobileFilters && (
        <div 
          className="fixed inset-0 bg-foreground/50 z-40 lg:hidden"
          onClick={() => setShowMobileFilters(false)}
        />
      )}
      
      <div className="flex gap-6 relative">
        {/* Barre latérale des filtres (desktop) */}
        <div className={`w-64 shrink-0 space-y-6 hidden lg:block sticky top-4 self-start h-screen max-h-[calc(100vh-2rem)] overflow-y-auto pb-20`}>
          <AnimatePresence initial={false}>
            <motion.div
              key="sidebar"
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="bg-background border border-foreground/10 rounded-lg p-4"
            >
              <h2 className="font-montserrat font-semibold text-lg mb-4 flex items-center">
                <Filter className="h-5 w-5 mr-2" />
                Filtres
              </h2>

              {/* Recherche */}
              <div className="space-y-6">
                <div className="relative">
                  <input
                    type="text"
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    placeholder="Rechercher..."
                    className="w-full pl-9 pr-3 py-2 bg-background border border-foreground/10 rounded-md"
                  />
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/60" />
                  {filters.search && (
                    <button
                      onClick={() => setFilters(prev => ({ ...prev, search: '' }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/60 hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Type de produit */}
                <div>
                  <label className="block text-sm font-medium mb-2 flex items-center">
                    <Tag className="h-4 w-4 mr-2" />
                    Type
                  </label>
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
                  <label className="block text-sm font-medium mb-2">Prix (CHF par unité)</label>
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

                {/* Boutons d'action */}
                <div className="flex gap-2">
                  <button
                    onClick={applyFilters}
                    className="flex-1 bg-custom-accent text-white py-2 px-2 rounded-md hover:bg-custom-accentHover transition-colors text-sm"
                  >
                    Appliquer
                  </button>
                  <button
                    onClick={resetFilters}
                    className="flex-1 border border-foreground/10 py-2 px-2 rounded-md hover:bg-foreground/5 transition-colors text-sm"
                  >
                    Réinitialiser
                  </button>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Filtres mobiles */}
        <AnimatePresence>
          {showMobileFilters && (
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="fixed inset-y-0 left-0 z-50 w-80 bg-background shadow-xl p-4 overflow-y-auto lg:hidden"
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-montserrat font-semibold text-lg">Filtres</h2>
                <button
                  onClick={() => setShowMobileFilters(false)}
                  className="p-2 rounded-full hover:bg-foreground/5 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              {/* Recherche mobile */}
              <div className="space-y-6">
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

                {/* Type de produit mobile */}
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

                {/* Autres filtres identiques à la version desktop */}
                {/* ... */}
                
                {/* Catégories mobile */}
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

                {/* Prix mobile */}
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

                {/* Disponibilité mobile */}
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

                {/* Tri mobile */}
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

                {/* Boutons d'action mobile */}
                <div className="grid grid-cols-2 gap-2 mt-8">
                  <button
                    onClick={() => {
                      resetFilters()
                      setShowMobileFilters(false)
                    }}
                    className="py-2 border border-foreground/10 rounded-md hover:bg-foreground/5 transition-colors text-sm"
                  >
                    Réinitialiser
                  </button>
                  <button
                    onClick={() => {
                      applyFilters()
                      setShowMobileFilters(false)
                    }}
                    className="py-2 bg-custom-accent text-white rounded-md hover:bg-custom-accentHover transition-colors text-sm"
                  >
                    Voir résultats
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Liste des produits */}
        <div className="flex-1">
          {/* En-tête avec stats et contrôles */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <div>
              <h1 className="text-2xl font-bold font-montserrat text-title">Catalogue</h1>
              <p className="text-sm text-muted-foreground">
                {!isLoading && `${products.length} produit${products.length > 1 ? 's' : ''} trouvé${products.length > 1 ? 's' : ''}`}
              </p>
            </div>
            
            <div className="flex items-center gap-2 self-end sm:self-auto">
              {/* Vue toggle */}
              <div className="flex border border-foreground/10 rounded-md overflow-hidden">
                <button 
                  onClick={() => setViewMode('grid')}
                  className={`p-2 ${viewMode === 'grid' 
                    ? 'bg-custom-accent text-white' 
                    : 'bg-background hover:bg-foreground/5'} transition-colors`}
                  aria-label="Vue en grille"
                >
                  <GridIcon className="h-5 w-5" />
                </button>
                <button 
                  onClick={() => setViewMode('list')}
                  className={`p-2 ${viewMode === 'list' 
                    ? 'bg-custom-accent text-white' 
                    : 'bg-background hover:bg-foreground/5'} transition-colors`}
                  aria-label="Vue en liste"
                >
                  <List className="h-5 w-5" />
                </button>
              </div>
              
              {/* Bouton des filtres mobiles */}
              <button
                onClick={() => setShowMobileFilters(true)}
                className="lg:hidden p-2 border border-foreground/10 rounded-md hover:bg-foreground/5 transition-colors"
              >
                <Filter className="h-5 w-5" />
              </button>
              
              {/* Tri rapide */}
              <div className="relative hidden sm:block">
              <select
                value={filters.sortBy}
                onChange={(e) => {
                  setFilters(prev => ({
                    ...prev,
                    sortBy: e.target.value as FilterState['sortBy']
                  }))
                  applyFilters()
                }}
                className="pl-3 pr-10 py-2 bg-background border border-foreground/10 rounded-md appearance-none"
              >
                <option value="newest">Plus récents</option>
                <option value="price_asc">Prix (par unité) croissant</option>
                <option value="price_desc">Prix (par unité) décroissant</option>
                <option value="popular">Popularité</option>
              </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Filtres actifs */}
          {activeFilters.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {activeFilters.map((filter) => (
                <Badge
                  key={filter}
                  variant="outline"
                  className="flex items-center gap-1 px-3 py-1 hover:bg-foreground/5 transition-colors cursor-pointer"
                  onClick={() => removeFilter(filter)}
                >
                  {filter}
                  <X className="h-3 w-3 ml-1" />
                </Badge>
              ))}
              <button
                onClick={resetFilters}
                className="text-sm text-custom-accent hover:underline"
              >
                Effacer tous les filtres
              </button>
            </div>
          )}

          {/* Grille/Liste de produits */}
          {isLoading ? (
            // Skeleton loader
            <div className={viewMode === 'grid' 
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" 
              : "space-y-4"
            }>
              {renderSkeletons()}
            </div>
          ) : products.length === 0 ? (
            // Message quand aucun produit ne correspond
            <div className="text-center py-12 bg-background border border-foreground/10 rounded-lg">
              <SlidersHorizontal className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Aucun produit trouvé</h3>
              <p className="text-custom-text">Aucun produit ne correspond à vos critères de recherche.</p>
              <button 
                onClick={resetFilters}
                className="mt-4 px-4 py-2 bg-custom-accent text-white rounded-md hover:bg-custom-accentHover transition-colors"
              >
                Réinitialiser les filtres
              </button>
            </div>
          ) : (
            // Affichage des produits
            <div>
              <AnimatePresence mode="wait">
                <motion.div
                  key={viewMode}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className={viewMode === 'grid' 
                    ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" 
                    : "space-y-4"
                  }
                >
                  {products.map((product) => (
                    <motion.div
                      key={product.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className="hover-lift"
                    >
                      {viewMode === 'grid' ? (
                        <ProductCard product={product} />
                      ) : (
                        <ProductListItem product={product} />
                      )}
                    </motion.div>
                  ))}
                </motion.div>
              </AnimatePresence>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center mt-8">
                  <div className="flex gap-2">
                    <button
                      onClick={() => fetchProducts(page - 1)}
                      disabled={page === 1}
                      className="p-2 border border-foreground/10 rounded-md hover:bg-foreground/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                    
                    {[...Array(totalPages)].map((_, i) => (
                      <button
                        key={i}
                        onClick={() => fetchProducts(i + 1)}
                        className={`w-10 h-10 rounded-md ${
                          i + 1 === page 
                            ? 'bg-custom-accent text-white' 
                            : 'border border-foreground/10 hover:bg-foreground/5'
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                    
                    <button
                      onClick={() => fetchProducts(page + 1)}
                      disabled={page === totalPages}
                      className="p-2 border border-foreground/10 rounded-md hover:bg-foreground/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ArrowRight className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}