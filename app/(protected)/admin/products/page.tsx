// app/(protected)/admin/products/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ProductType } from '@prisma/client'
import { Edit, Trash2, Plus, Filter, Search, Package, CheckCircle, XCircle, Eye } from 'lucide-react'
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
  // Ajoutez cette propriété pour résoudre les erreurs
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
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Gestion des produits</h1>
        <Link
          href="/admin/products/new"
          className="bg-custom-accent text-white px-4 py-2 rounded-md flex items-center gap-2 hover:opacity-90 transition-opacity"
        >
          <Plus className="h-5 w-5" /> Ajouter un produit
        </Link>
      </div>

      {/* Filtres */}
      <div className="bg-background border border-foreground/10 rounded-lg p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-foreground/10 rounded-md"
              />
            </div>
          </div>
          
          <div className="flex gap-4">
            <select
              value={typeFilter || ''}
              onChange={(e) => setTypeFilter(e.target.value || null)}
              className="border border-foreground/10 rounded-md px-3 py-2"
            >
              <option value="">Tous les types</option>
              {Object.values(ProductType).map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            
            <select
              value={availabilityFilter === null ? '' : availabilityFilter}
              onChange={(e) => {
                const value = e.target.value;
                setAvailabilityFilter(value === '' ? null : value);
              }}
              className="border border-foreground/10 rounded-md px-3 py-2"
            >
              <option value="">Toutes disponibilités</option>
              <option value="true">Disponible</option>
              <option value="false">Indisponible</option>
            </select>
            
            <button
              onClick={() => {
                setTypeFilter(null)
                setAvailabilityFilter(null)
                setSearchTerm('')
              }}
              className="px-3 py-2 border border-foreground/10 rounded-md hover:bg-foreground/5 transition-colors"
            >
              <Filter className="h-5 w-5 text-muted-foreground" />
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
        <div className="bg-background border border-foreground/10 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-foreground/5">
                  <th className="py-3 px-4 text-left">Produit</th>
                  <th className="py-3 px-4 text-left">Type</th>
                  <th className="py-3 px-4 text-left">Prix</th>
                  <th className="py-3 px-4 text-left">Stock</th>
                  <th className="py-3 px-4 text-left">Producteur</th>
                  <th className="py-3 px-4 text-center">Statut</th>
                  <th className="py-3 px-4 text-right">Actions</th>
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
                        <div>
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
                      <div>{product.producer.companyName || product.producer.user.name}</div>
                      <div className="text-xs text-muted-foreground">{product.producer.user.email}</div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {product.available ? (
                        <Badge variant="success" className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300">
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
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center px-4 py-3 border-t border-foreground/10">
              <div className="text-sm text-muted-foreground">
                Affichage de {(currentPage - 1) * productsPerPage + 1} à {Math.min(currentPage * productsPerPage, totalProducts)} sur {totalProducts} produits
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 rounded-md border border-foreground/10 disabled:opacity-50"
                >
                  Précédent
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={cn(
                      "px-3 py-1 rounded-md",
                      currentPage === page
                        ? "bg-custom-accent text-white"
                        : "border border-foreground/10 hover:bg-foreground/5"
                    )}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 rounded-md border border-foreground/10 disabled:opacity-50"
                >
                  Suivant
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-background border border-foreground/10 rounded-lg p-8 text-center">
          <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Aucun produit trouvé</h2>
          <p className="text-muted-foreground mb-6">
            {searchTerm || typeFilter || availabilityFilter !== null
              ? "Aucun produit ne correspond à vos critères de recherche."
              : "Aucun produit n'est disponible dans la plateforme."}
          </p>
          <Link
            href="/admin/products/new"
            className="bg-custom-accent text-white px-4 py-2 rounded-md hover:opacity-90 transition-opacity"
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