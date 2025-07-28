// components/products/modern-product-catalog.tsx
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { ProductType } from '@prisma/client'
import { 
  ArrowLeft,
  ArrowRight,
  SlidersHorizontal,
  Search
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { ModernProductCard } from './modern-product-card'
import { ModernCatalogHeader } from './modern-catalog-header'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

// Fonction debounce optimisée
function debounce<T extends (...args: any[]) => any>(
  fn: T,
  ms = 150
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return function(this: any, ...args: Parameters<T>) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), ms);
  };
}

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
  minOrderQuantity?: number
  acceptDeferred?: boolean
  producer?: {
    companyName?: string | null
    user: {
      name: string | null
    }
  }
}

interface FilterState {
  search: string
  category: string
  minPrice: string
  maxPrice: string
  available: boolean | null
  sortBy: 'price_asc' | 'price_desc' | 'newest' | 'popular'
}

const initialFilters: FilterState = {
  search: '',
  category: ProductType.FRESH, // Par défaut sur FRAIS
  minPrice: '',
  maxPrice: '',
  available: null,
  sortBy: 'newest'
}

export default function ModernProductCatalog() {
  // États
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [filters, setFilters] = useState<FilterState>(initialFilters)
  const [isLoading, setIsLoading] = useState(true)
  const [isSearching, setIsSearching] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const { toast } = useToast()
  
  // Référence pour le conteneur de grille
  const gridRef = useRef<HTMLDivElement>(null)
  
  // Nettoyage à la destruction du composant
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  // États pour compter les produits
  const [allProducts, setAllProducts] = useState<Product[]>([]) // Tous les produits sans filtres
  
  // Chargement initial des données
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setIsLoading(true)
        
        // Charger tous les produits pour les compteurs
        const allProductsResponse = await fetch('/api/products?limit=1000')
        if (allProductsResponse.ok) {
          const allProductsData = await allProductsResponse.json()
          setAllProducts(allProductsData.products || [])
        }
        
        // Charger catégories
        const categoriesResponse = await fetch('/api/categories')
        if (!categoriesResponse.ok) throw new Error('Erreur lors du chargement des catégories')
        const categoriesData = await categoriesResponse.json()
        setCategories(categoriesData)

        // Récupérer les paramètres URL
        const urlParams = new URLSearchParams(window.location.search)
        const urlFilters = extractFiltersFromUrl(urlParams)
        
        if (!isDefaultFilters(urlFilters)) {
          setFilters(urlFilters)
          await fetchProducts(parseInt(urlParams.get('page') || '1'), urlFilters)
        } else {
          await fetchProducts(1, initialFilters)
        }
        
      } catch (error) {
        console.error('Erreur:', error)
        toast({
          title: "Erreur",
          description: "Impossible de charger les données",
          variant: "destructive"
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchInitialData()
  }, [])

  // Extraction des filtres depuis l'URL
  const extractFiltersFromUrl = (urlParams: URLSearchParams): FilterState => {
    return {
      category: urlParams.get('type') || ProductType.FRESH, // Lire 'type' au lieu de 'category'
      minPrice: urlParams.get('minPrice') || '',
      maxPrice: urlParams.get('maxPrice') || '',
      available: urlParams.get('available') === null ? null : urlParams.get('available') === 'true',
      sortBy: (urlParams.get('sortBy') as FilterState['sortBy']) || 'newest',
      search: urlParams.get('search') || ''
    }
  }

  // Vérification si les filtres sont par défaut
  const isDefaultFilters = (filtersToCheck: Partial<FilterState>): boolean => {
    return (
      (!filtersToCheck.category || filtersToCheck.category === ProductType.FRESH) &&
      (!filtersToCheck.minPrice || filtersToCheck.minPrice === '') &&
      (!filtersToCheck.maxPrice || filtersToCheck.maxPrice === '') &&
      (filtersToCheck.available === null || filtersToCheck.available === undefined) &&
      (!filtersToCheck.sortBy || filtersToCheck.sortBy === 'newest') &&
      (!filtersToCheck.search || filtersToCheck.search === '')
    )
  }

  // Référence pour annuler les requêtes en cours
  const abortControllerRef = useRef<AbortController | null>(null)
  
  // Récupération des produits avec gestion d'annulation
  const fetchProducts = async (pageNum = 1, customFilters?: Partial<FilterState>) => {
    // Annuler la requête précédente si elle existe
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    
    // Créer un nouveau controller pour cette requête
    const abortController = new AbortController()
    abortControllerRef.current = abortController
    
    setIsSearching(true)
    
    try {
      const filtersToUse = customFilters || filters
      const url = buildApiUrl(pageNum, filtersToUse)
      
      console.log("🚀 Fetching products:", url.toString(), "Category:", filtersToUse.category)
      
      const response = await fetch(url.toString(), {
        signal: abortController.signal,
        cache: 'no-store', // Éviter le cache pour une réactivité immédiate
        headers: {
          'Accept': 'application/json',
        }
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Erreur API: ${response.status} - ${errorText}`)
      }
      
      const data = await response.json()
      
      // Vérifier que cette requête n'a pas été annulée
      if (abortController.signal.aborted) {
        return
      }
      
      // Mise à jour des états
      setProducts(data.products || [])
      setTotalPages(data.pagination?.pages || 1)
      setPage(pageNum)
      
      // Mise à jour des filtres si nécessaire
      if (customFilters) {
        setFilters(prev => ({ ...prev, ...customFilters }))
      }
      
      // Filtrage local pour la recherche
      const searchTerm = typeof filtersToUse.search === 'string' ? filtersToUse.search : ''
      filterProductsBySearch(data.products || [], searchTerm)
      
      // Mise à jour URL
      updateUrlWithFilters(filtersToUse, pageNum)
      
    } catch (error: any) {
      // Ignorer les erreurs d'annulation
      if (error.name === 'AbortError') {
        console.log('Requête annulée')
        return
      }
      
      console.error('❌ Fetch error:', error)
      toast({
        title: "Erreur",
        description: "Impossible de charger les produits",
        variant: "destructive"
      })
    } finally {
      setIsSearching(false)
      abortControllerRef.current = null
    }
  }

  // Construction de l'URL d'API
  const buildApiUrl = (pageNum: number, filtersToUse: Partial<FilterState>) => {
    const url = new URL('/api/products', window.location.origin)
    
    url.searchParams.set('page', pageNum.toString())
    url.searchParams.set('limit', '50')
    
    const addParamIfValid = (key: string, value: any) => {
      if (value && value !== '' && value !== null && value !== undefined) {
        url.searchParams.set(key, value.toString())
      }
    }
    
    // Utiliser 'type' au lieu de 'category' pour les ProductType
    if (filtersToUse.category && Object.values(ProductType).includes(filtersToUse.category as ProductType)) {
      addParamIfValid('type', filtersToUse.category)
    }
    addParamIfValid('minPrice', filtersToUse.minPrice?.trim())
    addParamIfValid('maxPrice', filtersToUse.maxPrice?.trim())
    addParamIfValid('available', filtersToUse.available)
    if (filtersToUse.sortBy && filtersToUse.sortBy !== 'newest') {
      addParamIfValid('sortBy', filtersToUse.sortBy)
    }
    if (filtersToUse.search?.trim()) {
      addParamIfValid('search', filtersToUse.search.trim())
    }
    
    return url
  }

  // Mise à jour de l'URL de manière synchrone
  const updateUrlWithFilters = (filtersToUse: Partial<FilterState>, pageNum: number) => {
    if (typeof window === 'undefined') return
    
    const url = new URL(window.location.href)
    
    // Nettoyer tous les paramètres existants
    const params = ['type', 'category', 'minPrice', 'maxPrice', 'available', 'sortBy', 'search', 'page']
    params.forEach(param => url.searchParams.delete(param))
    
    // Ajouter les nouveaux paramètres
    if (filtersToUse.category && Object.values(ProductType).includes(filtersToUse.category as ProductType)) {
      url.searchParams.set('type', filtersToUse.category)
    }
    if (filtersToUse.minPrice?.trim()) url.searchParams.set('minPrice', filtersToUse.minPrice)
    if (filtersToUse.maxPrice?.trim()) url.searchParams.set('maxPrice', filtersToUse.maxPrice)
    if (filtersToUse.available !== null && filtersToUse.available !== undefined) {
      url.searchParams.set('available', filtersToUse.available.toString())
    }
    if (filtersToUse.sortBy && filtersToUse.sortBy !== 'newest') {
      url.searchParams.set('sortBy', filtersToUse.sortBy)
    }
    if (filtersToUse.search?.trim()) url.searchParams.set('search', filtersToUse.search.trim())
    if (pageNum > 1) url.searchParams.set('page', pageNum.toString())
    
    // Mise à jour immédiate de l'URL
    window.history.replaceState({}, '', url.toString())
  }

  // Filtrage local par recherche
  const filterProductsBySearch = useCallback((productsToFilter: Product[], searchTerm: string) => {
    if (!searchTerm || searchTerm.trim() === '') {
      setFilteredProducts(productsToFilter)
      return
    }
    
    const term = searchTerm.toLowerCase().trim()
    const filtered = productsToFilter.filter(product => {
      const nameMatch = product.name.toLowerCase().includes(term)
      const descMatch = product.description?.toLowerCase().includes(term)
      const typeMatch = product.type.toLowerCase().includes(term)
      const categoryMatch = product.categories.some(cat => cat.name.toLowerCase().includes(term))
      
      return nameMatch || descMatch || typeMatch || categoryMatch
    })
    
    setFilteredProducts(filtered)
  }, [])

  // Debounce pour la recherche
  const debouncedSearch = useCallback(
    debounce((searchTerm: string) => {
      setFilters(prev => ({ ...prev, search: searchTerm }))
      filterProductsBySearch(products, searchTerm)
      setIsSearching(false)
    }, 150),
    [products, filterProductsBySearch]
  )

  // Gestion de la recherche
  const handleSearchChange = (searchTerm: string) => {
    setIsSearching(true)
    debouncedSearch(searchTerm)
  }

  // Gestion du changement de catégorie avec debounce
  const handleCategoryChange = useCallback((categoryId: string) => {
    // Mise à jour immédiate de l'UI
    setFilters(prev => ({ ...prev, category: categoryId }))
    
    // Annuler toute requête en cours
    setIsSearching(true)
    
    // Déclencher la requête avec un petit délai pour éviter les conditions de course
    const timer = setTimeout(() => {
      fetchProducts(1, { ...filters, category: categoryId })
    }, 100)
    
    return () => clearTimeout(timer)
  }, [filters])

  // Reset des filtres
  const resetFilters = useCallback(async () => {
    setFilters(initialFilters)
    await fetchProducts(1, initialFilters)
    
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', window.location.pathname)
    }
  }, [])

  // Skeleton de chargement
  const renderSkeletons = () => {
    return [...Array(8)].map((_, index) => (
      <div key={index} className="animate-pulse">
        <div className="aspect-square bg-gray-200 rounded-2xl mb-3"></div>
        <div className="space-y-2">
          <div className="flex justify-between">
            <div className="h-3 w-16 bg-gray-200 rounded"></div>
            <div className="h-3 w-12 bg-gray-200 rounded"></div>
          </div>
          <div className="h-4 w-3/4 bg-gray-200 rounded"></div>
          <div className="h-3 w-1/2 bg-gray-200 rounded"></div>
          <div className="h-4 w-1/3 bg-gray-200 rounded"></div>
        </div>
      </div>
    ))
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header du catalogue */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ModernCatalogHeader
          searchQuery={filters.search}
          onSearchChange={handleSearchChange}
          selectedCategory={filters.category}
          onCategoryChange={handleCategoryChange}
          showFilters={showFilters}
          onToggleFilters={() => setShowFilters(!showFilters)}
          categories={[
            { 
              id: ProductType.FRESH, 
              name: 'Frais', 
              icon: Search, 
              count: allProducts.filter(p => p.type === ProductType.FRESH).length
            },
            { 
              id: ProductType.DRIED, 
              name: 'Séchés', 
              icon: Search, 
              count: allProducts.filter(p => p.type === ProductType.DRIED).length
            },
            { 
              id: ProductType.SUBSTRATE, 
              name: 'Substrats', 
              icon: Search, 
              count: allProducts.filter(p => p.type === ProductType.SUBSTRATE).length
            },
            { 
              id: ProductType.WELLNESS, 
              name: 'Bien-être', 
              icon: Search, 
              count: allProducts.filter(p => p.type === ProductType.WELLNESS).length
            }
          ]}
          totalProducts={allProducts.length}
        />

        {/* Résultats */}
        <div className="mt-8">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              {!isLoading && `${filteredProducts.length} champignon${filteredProducts.length > 1 ? 's' : ''} trouvé${filteredProducts.length > 1 ? 's' : ''}`}
            </h2>
          </div>

          {/* Grille de produits */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" ref={gridRef}>
              {renderSkeletons()}
            </div>
          ) : filteredProducts.length === 0 ? (
            // Message quand aucun produit trouvé
            <div className="text-center py-12">
              <div className="mb-4">
                <SlidersHorizontal className="h-12 w-12 mx-auto text-gray-400" />
              </div>
              <h3 className="text-xl font-medium text-gray-900 mb-2">
                Aucun champignon trouvé
              </h3>
              <p className="text-gray-500 mb-6">
                Aucun produit ne correspond à vos critères dans cette catégorie
              </p>
              <button 
                onClick={resetFilters}
                className="bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600 transition-colors"
              >
                Retour aux produits frais
              </button>
            </div>
          ) : (
            // Affichage des produits
            <div>
              <AnimatePresence mode="wait">
                <motion.div
                  key="products-grid"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                  ref={gridRef}
                >
                  {filteredProducts.map((product) => (
                    <motion.div
                      key={product.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <ModernProductCard product={product} />
                    </motion.div>
                  ))}
                </motion.div>
              </AnimatePresence>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center mt-12">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => fetchProducts(page - 1)}
                      disabled={page === 1}
                      className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    
                    {[...Array(totalPages)].map((_, i) => (
                      <button
                        key={i}
                        onClick={() => fetchProducts(i + 1)}
                        className={cn(
                          "px-4 py-2 rounded-lg transition-colors",
                          i + 1 === page 
                            ? 'bg-red-500 text-white' 
                            : 'border border-gray-300 hover:bg-gray-50'
                        )}
                      >
                        {i + 1}
                      </button>
                    ))}
                    
                    <button
                      onClick={() => fetchProducts(page + 1)}
                      disabled={page === totalPages}
                      className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ArrowRight className="w-4 h-4" />
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