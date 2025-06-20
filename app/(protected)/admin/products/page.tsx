// app/(protected)/admin/products/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ProductType } from '@prisma/client'
import { 
  Edit, 
  Trash2, 
  Plus, 
  Filter, 
  Search, 
  Package, 
  CheckCircle, 
  XCircle, 
  Eye,
  ChevronDown,
  Building,
  DollarSign,
  Box,
  User
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { DeleteConfirmationModal } from '@/components/ui/delete-confirmation-modal'
import { Badge } from '@/components/ui/badge'

interface Product {
  id: string
  name: string
  description: string
  price: number
  type: ProductType
  unit: string
  available: boolean
  image: string | null
  categories: { id: string, name: string }[]
  stock?: {
    quantity: number
  } | null
  producer: {
    id: string
    userId: string
    companyName: string | null
    user: {
      name: string | null
      email: string
    }
  }
}

export default function AdminProductsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState<string | null>(null)
  const [availabilityFilter, setAvailabilityFilter] = useState<string | null>(null)
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalProducts, setTotalProducts] = useState(0)
  const productsPerPage = 10

  useEffect(() => {
    fetchProducts()
  }, [currentPage, typeFilter, availabilityFilter])

  useEffect(() => {
    // Filtrer les produits en fonction du terme de recherche
    if (searchTerm.trim() === '') {
      setFilteredProducts(products)
    } else {
      const filtered = products.filter(product => 
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.producer.companyName ?? '').toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredProducts(filtered)
    }
  }, [searchTerm, products])

  const fetchProducts = async () => {
    try {
      setIsLoading(true)
      
      let url = `/api/products?page=${currentPage}&limit=${productsPerPage}`
      
      if (typeFilter) {
        url += `&type=${typeFilter}`
      }
      
      if (availabilityFilter !== null) {
        url += `&available=${availabilityFilter === 'true'}`;
      }
      
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error('Erreur lors du chargement des produits')
      }
      
      const data = await response.json()
      setProducts(data.products)
      setFilteredProducts(data.products)
      setTotalPages(data.pagination.pages)
      setTotalProducts(data.pagination.total)
    } catch (error) {
      console.error('Erreur:', error)
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les produits',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteProduct = async () => {
    if (!selectedProductId) return

    try {
      setIsDeleting(true)
      
      const response = await fetch(`/api/products/${selectedProductId}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        throw new Error('Erreur lors de la suppression du produit')
      }
      
      // Supprimer le produit de la liste locale
      setProducts(prevProducts => prevProducts.filter(p => p.id !== selectedProductId))
      setFilteredProducts(prevProducts => prevProducts.filter(p => p.id !== selectedProductId))
      
      toast({
        title: 'Produit supprimé',
        description: 'Le produit a été supprimé avec succès'
      })
    } catch (error) {
      console.error('Erreur:', error)
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer le produit',
        variant: 'destructive'
      })
    } finally {
      setIsDeleting(false)
      setIsDeleteModalOpen(false)
      setSelectedProductId(null)
    }
  }

  const handleUpdateAvailability = async (productId: string, newAvailability: boolean) => {
    try {
      const response = await fetch(`/api/products/${productId}/availability`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ available: newAvailability })
      })
      
      if (!response.ok) {
        throw new Error(`Erreur lors de la mise à jour de la disponibilité`)
      }
      
      // Mettre à jour l'état local
      setProducts(prevProducts => 
        prevProducts.map(p => 
          p.id === productId ? { ...p, available: newAvailability } : p
        )
      )
      
      setFilteredProducts(prevProducts => 
        prevProducts.map(p => 
          p.id === productId ? { ...p, available: newAvailability } : p
        )
      )
      
      toast({
        title: 'Produit mis à jour',
        description: `Le produit est maintenant ${newAvailability ? 'disponible' : 'indisponible'}`
      })
    } catch (error) {
      console.error('Erreur:', error)
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour la disponibilité',
        variant: 'destructive'
      })
    }
  }

  const renderProductTypeIcon = (type: ProductType) => {
    switch (type) {
      case 'FRESH':
        return <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300">{type}</Badge>
      case 'DRIED':
        return <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">{type}</Badge>
      case 'SUBSTRATE':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300">{type}</Badge>
      case 'WELLNESS':
        return <Badge variant="secondary" className="bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300">{type}</Badge>
      default:
        return <Badge variant="secondary">{type}</Badge>
    }
  }

  return (
    <div className="p-4 sm:p-6">
      {/* En-tête responsive */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Gestion des produits</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {totalProducts} produit{totalProducts > 1 ? 's' : ''} au total
          </p>
        </div>
        <Link
          href="/admin/products/new"
          className="bg-custom-accent text-white px-4 py-2 rounded-md flex items-center justify-center gap-2 hover:opacity-90 transition-opacity text-sm sm:text-base"
        >
          <Plus className="h-4 w-4 sm:h-5 sm:w-5" /> 
          <span className="hidden sm:inline">Ajouter un produit</span>
          <span className="sm:hidden">Ajouter</span>
        </Link>
      </div>

      {/* Filtres responsive */}
      <div className="bg-background border border-foreground/10 rounded-lg p-4 mb-6">
        <div className="space-y-4">
          {/* Barre de recherche */}
          <div className="w-full">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <input
                type="text"
                placeholder="Rechercher un produit..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-foreground/10 rounded-md text-sm"
              />
            </div>
          </div>
          
          {/* Filtres en ligne sur desktop, empilés sur mobile */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Filtre par type */}
            <div className="relative flex-1 sm:flex-none sm:w-40">
              <select
                value={typeFilter || ''}
                onChange={(e) => setTypeFilter(e.target.value || null)}
                className="w-full appearance-none border border-foreground/10 rounded-md px-3 py-2 pr-8 text-sm bg-background [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-ms-expand]:hidden"
                style={{ backgroundImage: 'none' }}
              >
                <option value="">Tous les types</option>
                {Object.values(ProductType).map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>
            
            {/* Filtre par disponibilité */}
            <div className="relative flex-1 sm:flex-none sm:w-44">
              <select
                value={availabilityFilter === null ? '' : availabilityFilter}
                onChange={(e) => {
                  const value = e.target.value;
                  setAvailabilityFilter(value === '' ? null : value);
                }}
                className="w-full appearance-none border border-foreground/10 rounded-md px-3 py-2 pr-8 text-sm bg-background [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-ms-expand]:hidden"
                style={{ backgroundImage: 'none' }}
              >
                <option value="">Toutes disponibilités</option>
                <option value="true">Disponible</option>
                <option value="false">Indisponible</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>
            
            {/* Bouton reset */}
            <button
              onClick={() => {
                setTypeFilter(null)
                setAvailabilityFilter(null)
                setSearchTerm('')
              }}
              className="px-3 py-2 border border-foreground/10 rounded-md hover:bg-foreground/5 transition-colors flex items-center justify-center gap-2 text-sm"
            >
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="sm:hidden">Réinitialiser</span>
            </button>
          </div>
        </div>
      </div>

      {/* Liste des produits */}
      {isLoading ? (
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-custom-accent" />
        </div>
      ) : filteredProducts.length > 0 ? (
        <>
          {/* Version mobile - Cards */}
          <div className="lg:hidden space-y-4 mb-6">
            {filteredProducts.map((product) => (
              <div key={product.id} className="bg-background border border-foreground/10 rounded-lg p-4">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-12 h-12 rounded-md overflow-hidden bg-foreground/5 flex-shrink-0">
                    {product.image ? (
                      <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="h-6 w-6 text-foreground/50" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm truncate">{product.name}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {product.description || 'Aucune description'}
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    {product.available ? (
                      <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200 text-xs">
                        Disponible
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-gray-100 text-gray-800 border-gray-200 text-xs">
                        Indisponible
                      </Badge>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{product.price.toFixed(2)} CHF</p>
                      <p className="text-xs text-muted-foreground">par {product.unit}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Box className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm">
                        {product.stock ? `${product.stock.quantity.toFixed(2)} ${product.unit}` : 'N/A'}
                      </p>
                      <p className="text-xs text-muted-foreground">Stock</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 mb-3">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{product.producer.companyName || product.producer.user.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{product.producer.user.email}</p>
                  </div>
                  {renderProductTypeIcon(product.type)}
                </div>
                
                <div className="flex items-center justify-between pt-3 border-t border-foreground/10">
                  <div className="flex gap-1">
                    <Link
                      href={`/products/${product.id}`}
                      className="p-2 text-foreground/60 hover:text-custom-accent transition-colors"
                      title="Voir"
                    >
                      <Eye className="h-4 w-4" />
                    </Link>
                    <Link
                      href={`/admin/products/${product.id}/edit`}
                      className="p-2 text-foreground/60 hover:text-custom-accent transition-colors"
                      title="Modifier"
                    >
                      <Edit className="h-4 w-4" />
                    </Link>
                    <button
                      onClick={() => {
                        setSelectedProductId(product.id)
                        setIsDeleteModalOpen(true)
                      }}
                      className="p-2 text-foreground/60 hover:text-destructive transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  
                  <button
                    onClick={() => handleUpdateAvailability(product.id, !product.available)}
                    className={cn(
                      "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                      product.available 
                        ? "bg-red-100 text-red-800 hover:bg-red-200" 
                        : "bg-green-100 text-green-800 hover:bg-green-200"
                    )}
                  >
                    {product.available ? "Désactiver" : "Activer"}
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          {/* Version desktop - Tableau */}
          <div className="hidden lg:block bg-background border border-foreground/10 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-foreground/5">
                    <th className="py-3 px-4 text-left text-sm font-medium">Produit</th>
                    <th className="py-3 px-4 text-left text-sm font-medium">Type</th>
                    <th className="py-3 px-4 text-left text-sm font-medium">Prix</th>
                    <th className="py-3 px-4 text-left text-sm font-medium">Stock</th>
                    <th className="py-3 px-4 text-left text-sm font-medium">Producteur</th>
                    <th className="py-3 px-4 text-center text-sm font-medium">Statut</th>
                    <th className="py-3 px-4 text-right text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-foreground/10">
                  {filteredProducts.map((product) => (
                    <tr key={product.id} className="hover:bg-foreground/5 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-md overflow-hidden bg-foreground/5 mr-3 flex-shrink-0">
                            {product.image ? (
                              <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package className="h-5 w-5 text-foreground/50" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium">{product.name}</div>
                            <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {product.description || 'Aucune description'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {renderProductTypeIcon(product.type)}
                      </td>
                      <td className="py-3 px-4">
                        {product.price.toFixed(2)} CHF
                        <div className="text-xs text-muted-foreground">
                          par {product.unit}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {product.stock ? (
                          <span>{product.stock.quantity.toFixed(2)} {product.unit}</span>
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="min-w-0">
                          <div className="truncate">{product.producer.companyName || product.producer.user.name}</div>
                          <div className="text-xs text-muted-foreground truncate">{product.producer.user.email}</div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {product.available ? (
                          <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300">
                            Disponible
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300">
                            Indisponible
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/products/${product.id}`}
                            className="p-2 text-foreground/60 hover:text-custom-accent transition-colors"
                            title="Voir le produit"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          <Link
                            href={`/admin/products/${product.id}/edit`}
                            className="p-2 text-foreground/60 hover:text-custom-accent transition-colors"
                            title="Modifier"
                          >
                            <Edit className="h-4 w-4" />
                          </Link>
                          <button
                            onClick={() => {
                              setSelectedProductId(product.id)
                              setIsDeleteModalOpen(true)
                            }}
                            className="p-2 text-foreground/60 hover:text-destructive transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleUpdateAvailability(product.id, !product.available)}
                            className={cn(
                              "p-2 transition-colors",
                              product.available 
                                ? "text-green-600 hover:text-gray-500" 
                                : "text-gray-500 hover:text-green-600"
                            )}
                            title={product.available ? "Marquer comme indisponible" : "Marquer comme disponible"}
                          >
                            {product.available ? (
                              <XCircle className="h-4 w-4" />
                            ) : (
                              <CheckCircle className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Pagination responsive */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 px-4 py-3 bg-background border border-foreground/10 rounded-lg mt-4">
              <div className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
                Affichage de {(currentPage - 1) * productsPerPage + 1} à {Math.min(currentPage * productsPerPage, totalProducts)} sur {totalProducts} produits
              </div>
              <div className="flex justify-center gap-1">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-2 sm:px-3 py-1 rounded-md border border-foreground/10 disabled:opacity-50 text-xs sm:text-sm"
                >
                  <span className="hidden sm:inline">Précédent</span>
                  <span className="sm:hidden">Préc.</span>
                </button>
                
                {/* Pages - montrer moins sur mobile */}
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let page: number;
                  if (totalPages <= 5) {
                    page = i + 1;
                  } else if (currentPage <= 3) {
                    page = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    page = totalPages - 4 + i;
                  } else {
                    page = currentPage - 2 + i;
                  }
                  
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={cn(
                        "px-2 sm:px-3 py-1 rounded-md text-xs sm:text-sm",
                        currentPage === page
                          ? "bg-custom-accent text-white"
                          : "border border-foreground/10 hover:bg-foreground/5"
                      )}
                    >
                      {page}
                    </button>
                  );
                })}
                
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-2 sm:px-3 py-1 rounded-md border border-foreground/10 disabled:opacity-50 text-xs sm:text-sm"
                >
                  <span className="hidden sm:inline">Suivant</span>
                  <span className="sm:hidden">Suiv.</span>
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="bg-background border border-foreground/10 rounded-lg p-8 text-center">
          <Package className="h-12 sm:h-16 w-12 sm:w-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-lg sm:text-xl font-semibold mb-2">Aucun produit trouvé</h2>
          <p className="text-sm sm:text-base text-muted-foreground mb-6">
            {searchTerm || typeFilter || availabilityFilter !== null
              ? "Aucun produit ne correspond à vos critères de recherche."
              : "Aucun produit n'est disponible dans la plateforme."}
          </p>
          <Link
            href="/admin/products/new"
            className="bg-custom-accent text-white px-4 py-2 rounded-md hover:opacity-90 transition-opacity text-sm sm:text-base"
          >
            Ajouter un produit
          </Link>
        </div>
      )}

      {/* Modal de confirmation de suppression */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false)
          setSelectedProductId(null)
        }}
        onConfirm={handleDeleteProduct}
        productName={products.find(p => p.id === selectedProductId)?.name || ''}
        isLoading={isDeleting}
      />
    </div>
  )
}