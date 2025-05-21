// components/products/product-catalog.tsx
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
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
  ArrowLeft,
  RefreshCw,
  Loader,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { ProductCard } from './product-card'
import { ProductListItem } from './product-list-item'
import { Badge } from '@/components/ui/badge'
import { motion, AnimatePresence } from 'framer-motion'
import { LoadingButton } from '@/components/ui/loading-button'
import { cn } from '@/lib/utils'

// Fonction debounce pour retarder l'exécution des recherches
function debounce<T extends (...args: any[]) => any>(
  fn: T,
  ms = 300
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
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [filters, setFilters] = useState<FilterState>(initialFilters)
  const [isLoading, setIsLoading] = useState(true)
  const [isSearching, setIsSearching] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showFilters, setShowFilters] = useState(false)
  const [showMobileFilters, setShowMobileFilters] = useState(false)
  const [activeFilters, setActiveFilters] = useState<string[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const { toast } = useToast()
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Charger les données initiales
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Charger les catégories
        const categoriesResponse = await fetch('/api/categories')
        if (!categoriesResponse.ok) throw new Error('Erreur lors du chargement des catégories')
        const categoriesData = await categoriesResponse.json()
        setCategories(categoriesData)

        // Récupérer les filtres à partir de l'URL s'ils existent
        const queryParams = new URLSearchParams(window.location.search);
        
        const urlType = queryParams.get('type') || '';
        const urlCategory = queryParams.get('category') || '';
        const urlMinPrice = queryParams.get('minPrice') || '';
        const urlMaxPrice = queryParams.get('maxPrice') || '';
        const urlAvailable = queryParams.get('available');
        const urlSortBy = queryParams.get('sortBy') as FilterState['sortBy'] || 'newest';
        const urlSearch = queryParams.get('search') || '';
        const urlPage = parseInt(queryParams.get('page') || '1');
        
        // Mettre à jour les filtres avec les valeurs de l'URL
        const initialStateFromUrl: FilterState = {
          type: urlType as ProductType | '',
          category: urlCategory,
          minPrice: urlMinPrice,
          maxPrice: urlMaxPrice,
          available: urlAvailable === null ? null : urlAvailable === 'true',
          sortBy: urlSortBy,
          search: urlSearch
        };
        
        // Vérifier si les filtres de l'URL sont différents des filtres par défaut
        const hasActiveFilters = !isDefaultFilters(initialStateFromUrl);
        
        if (hasActiveFilters) {
          setFilters(initialStateFromUrl);
          if (searchInputRef.current) {
            searchInputRef.current.value = urlSearch;
          }
          
          // Charger les produits avec les filtres de l'URL
          fetchProducts(urlPage, initialStateFromUrl);
        } else {
          // Charger tous les produits sans filtre
          showAllProducts();
        }
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
    
    if (filters.search) {
      newActiveFilters.push(`Recherche: ${filters.search}`)
    }
    
    setActiveFilters(newActiveFilters)
  }, [filters, categories])
  
  // Fonction pour vérifier si les filtres sont les filtres par défaut
  const isDefaultFilters = (filtersToCheck: Partial<FilterState>): boolean => {
    return (
      !filtersToCheck.type &&
      (!filtersToCheck.category || filtersToCheck.category === '') &&
      (!filtersToCheck.minPrice || filtersToCheck.minPrice === '') &&
      (!filtersToCheck.maxPrice || filtersToCheck.maxPrice === '') &&
      (filtersToCheck.available === null || filtersToCheck.available === undefined) &&
      (!filtersToCheck.sortBy || filtersToCheck.sortBy === 'newest') &&
      (!filtersToCheck.search || filtersToCheck.search === '')
    );
  };
  
  // Fonction pour afficher tous les produits sans filtres
  const showAllProducts = () => {
    setFilters(initialFilters);
    if (searchInputRef.current) {
      searchInputRef.current.value = '';
    }
    fetchProducts(1, initialFilters);
    
    // Nettoyer l'URL
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', window.location.pathname);
    }
  };
  
  // Fonction pour récupérer les produits
  const fetchProducts = async (pageNum = 1, customFilters?: Partial<FilterState>) => {
    setIsLoading(true);
    setIsSearching(true);
    
    try {
      // Construire l'URL avec les filtres
      const url = new URL('/api/products', window.location.origin);
      url.searchParams.append('page', pageNum.toString());
      url.searchParams.append('limit', '50');
      
      // Utiliser soit les filtres personnalisés passés en paramètre, soit les filtres de l'état
      const filtersToUse = customFilters || filters;
      
      // N'ajouter que les filtres qui sont réellement définis
      if (filtersToUse.type) 
        url.searchParams.append('type', filtersToUse.type);
        
      if (filtersToUse.category) 
        url.searchParams.append('category', filtersToUse.category);
      
      // Filtres de prix - seulement s'ils sont non vides
      if (filtersToUse.minPrice && filtersToUse.minPrice.trim() !== '') 
        url.searchParams.append('minPrice', filtersToUse.minPrice);
      
      if (filtersToUse.maxPrice && filtersToUse.maxPrice.trim() !== '') 
        url.searchParams.append('maxPrice', filtersToUse.maxPrice);
      
      // Disponibilité - seulement si explicitement définie
      if (filtersToUse.available !== null && filtersToUse.available !== undefined) 
        url.searchParams.append('available', filtersToUse.available.toString());
      
      // Tri - seulement si défini et différent de la valeur par défaut
      if (filtersToUse.sortBy && filtersToUse.sortBy !== 'newest') 
        url.searchParams.append('sortBy', filtersToUse.sortBy);
      
      // Recherche - seulement si non vide
      if (filtersToUse.search && typeof filtersToUse.search === 'string' && filtersToUse.search.trim() !== '')
        url.searchParams.append('search', filtersToUse.search.trim());
      
      console.log("URL de recherche:", url.toString());
      
      const response = await fetch(url.toString());
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Erreur API:", response.status, errorText);
        throw new Error(`Erreur lors du chargement des produits: ${errorText}`);
      }
      
      const data = await response.json();
      console.log("Données reçues:", data);
      
      // Stocker tous les produits
      setProducts(data.products || []);
      
      // Filtrer localement par recherche
      filterProductsBySearch(data.products || [], 
        typeof filtersToUse.search === 'string' ? filtersToUse.search : '');
      
      setTotalPages(data.pagination.pages || 1);
      setPage(pageNum);
      
      // Mettre à jour l'URL avec les filtres (uniquement si ce ne sont pas les filtres par défaut)
      if (!isDefaultFilters(filtersToUse)) {
        updateUrlWithFilters(filtersToUse, pageNum);
      } else {
        // Si ce sont les filtres par défaut, nettoyer l'URL
        if (typeof window !== 'undefined') {
          window.history.pushState({}, '', window.location.pathname);
        }
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les produits",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      setIsSearching(false);
    }
  };
  
  // Fonction pour mettre à jour l'URL avec les filtres
  const updateUrlWithFilters = (filtersToUse: Partial<FilterState>, pageNum: number) => {
    if (typeof window === 'undefined') return;
    
    const url = new URL(window.location.href);
    
    // Réinitialiser les paramètres existants
    url.searchParams.delete('type');
    url.searchParams.delete('category');
    url.searchParams.delete('minPrice');
    url.searchParams.delete('maxPrice');
    url.searchParams.delete('available');
    url.searchParams.delete('sortBy');
    url.searchParams.delete('search');
    url.searchParams.delete('page');
    
    // Ajouter les nouveaux paramètres avec vérification explicite de type
    if (filtersToUse.type) 
      url.searchParams.set('type', filtersToUse.type);
      
    if (filtersToUse.category) 
      url.searchParams.set('category', filtersToUse.category);
      
    if (filtersToUse.minPrice && filtersToUse.minPrice !== '') 
      url.searchParams.set('minPrice', filtersToUse.minPrice);
      
    if (filtersToUse.maxPrice && filtersToUse.maxPrice !== '') 
      url.searchParams.set('maxPrice', filtersToUse.maxPrice);
      
    if (filtersToUse.available !== null && filtersToUse.available !== undefined) 
      url.searchParams.set('available', filtersToUse.available.toString());
      
    if (filtersToUse.sortBy && filtersToUse.sortBy !== 'newest') 
      url.searchParams.set('sortBy', filtersToUse.sortBy);
      
    if (filtersToUse.search && typeof filtersToUse.search === 'string' && filtersToUse.search.trim() !== '') 
      url.searchParams.set('search', filtersToUse.search.trim());
      
    if (pageNum > 1) 
      url.searchParams.set('page', pageNum.toString());
    
    // Mettre à jour l'URL sans recharger la page
    window.history.pushState({}, '', url.toString());
  };
  
  // Fonction pour filtrer les produits par recherche localement
  const filterProductsBySearch = (productsToFilter: Product[], searchTerm: string) => {
    if (!searchTerm || searchTerm.trim() === '') {
      setFilteredProducts(productsToFilter);
      return;
    }
    
    const term = searchTerm.toLowerCase().trim();
    const filtered = productsToFilter.filter(product => {
      return (
        product.name.toLowerCase().includes(term) ||
        (product.description && product.description.toLowerCase().includes(term)) ||
        product.categories.some(cat => cat.name.toLowerCase().includes(term)) ||
        product.type.toLowerCase().includes(term)
      );
    });
    
    setFilteredProducts(filtered);
  };
  
  // Debounce la recherche pour éviter trop d'appels
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSearch = useCallback(
    debounce((searchTerm: string) => {
      setFilters(prev => ({ ...prev, search: searchTerm }));
      filterProductsBySearch(products, searchTerm);
      setIsSearching(false);
    }, 300),
    [products]
  );
  
  // Gestion de la recherche dynamique
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const searchTerm = e.target.value;
    
    // Utiliser le debounce pour la recherche
    setIsSearching(true);
    debouncedSearch(searchTerm);
  };
  
  // Appliquer les filtres
  const applyFilters = () => {
    fetchProducts(1);
    setShowMobileFilters(false);
  };
  
  // Réinitialiser les filtres
  const resetFilters = () => {
    showAllProducts();
    setShowMobileFilters(false);
  };
  
  // Supprimer un filtre actif
  const removeFilter = (filter: string) => {
    const [type, value] = filter.split(': ');
    
    switch (type) {
      case 'Type':
        setFilters(prev => ({ ...prev, type: '' }));
        break;
      case 'Catégorie':
        setFilters(prev => ({ ...prev, category: '' }));
        break;
      case 'Prix min':
        setFilters(prev => ({ ...prev, minPrice: '' }));
        break;
      case 'Prix max':
        setFilters(prev => ({ ...prev, maxPrice: '' }));
        break;
      case 'Disponibilité':
        setFilters(prev => ({ ...prev, available: null }));
        break;
      case 'Recherche':
        setFilters(prev => ({ ...prev, search: '' }));
        if (searchInputRef.current) {
          searchInputRef.current.value = '';
        }
        break;
      default:
        break;
    }
    
    // Appliquer les filtres après avoir supprimé un filtre
    setTimeout(() => fetchProducts(1), 0);
  };

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
      ));
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
      ));
    }
  };

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
                    ref={searchInputRef}
                    defaultValue={filters.search}
                    onChange={handleSearchChange}
                    placeholder="Rechercher..."
                    className="w-full pl-9 pr-3 py-2 bg-background border border-foreground/10 rounded-md"
                  />
                  <div className="absolute left-3 top-1/2 -translate-y-1/2">
                    {isSearching ? (
                      <Loader className="h-4 w-4 text-foreground/60 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4 text-foreground/60" />
                    )}
                  </div>
                  {filters.search && (
                    <button
                      onClick={() => {
                        setFilters(prev => ({ ...prev, search: '' }));
                        setFilteredProducts(products);
                        if (searchInputRef.current) {
                          searchInputRef.current.value = '';
                        }
                      }}
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
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 bg-background border border-foreground/10 rounded-md"
                    />
                    <input
                      type="number"
                      value={filters.maxPrice}
                      onChange={(e) => setFilters(prev => ({ ...prev, maxPrice: e.target.value }))}
                      placeholder="Max"
                      min="0"
                      step="0.01"
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
                      const value = e.target.value;
                      setFilters(prev => ({
                        ...prev,
                        available: value === '' ? null : value === 'true'
                      }));
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
                    defaultValue={filters.search}
                    onChange={handleSearchChange}
                    placeholder="Rechercher..."
                    className="w-full pl-9 pr-3 py-2 bg-background border border-foreground/10 rounded-md"
                  />
                  <div className="absolute left-3 top-1/2 -translate-y-1/2">
                    {isSearching ? (
                      <Loader className="h-4 w-4 text-foreground/60 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4 text-foreground/60" />
                    )}
                  </div>
                  {filters.search && (
                    <button
                      onClick={() => {
                        setFilters(prev => ({ ...prev, search: '' }));
                        setFilteredProducts(products);
                        if (searchInputRef.current) {
                          searchInputRef.current.value = '';
                        }
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/60 hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
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
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 bg-background border border-foreground/10 rounded-md"
                    />
                    <input
                      type="number"
                      value={filters.maxPrice}
                      onChange={(e) => setFilters(prev => ({ ...prev, maxPrice: e.target.value }))}
                      placeholder="Max"
                      min="0"
                      step="0.01"
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
                      const value = e.target.value;
                      setFilters(prev => ({
                        ...prev,
                        available: value === '' ? null : value === 'true'
                      }));
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
                      resetFilters();
                      setShowMobileFilters(false);
                    }}
                    className="py-2 border border-foreground/10 rounded-md hover:bg-foreground/5 transition-colors text-sm"
                  >
                    Réinitialiser
                  </button>
                  <button
                    onClick={() => {
                      applyFilters();
                      setShowMobileFilters(false);
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
                {!isLoading && `${filteredProducts.length} produit${filteredProducts.length > 1 || filteredProducts.length === 0 ? 's' : ''} trouvé${filteredProducts.length > 1 || filteredProducts.length === 0 ? 's' : ''}`}
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
                    }));
                    // Applique immédiatement le filtre de tri
                    setTimeout(() => fetchProducts(1), 0);
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
          ) : filteredProducts.length === 0 ? (
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
                  {filteredProducts.map((product) => (
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
  );
}