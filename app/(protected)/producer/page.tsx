// app/(protected)/producer/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ProductType } from '@prisma/client'
import { Edit, Trash2, Plus, Package, ShoppingBag, Truck, LineChart, Calendar, AlertTriangle, BarChart2 } from 'lucide-react'
import { useToast } from "@/hooks/use-toast"
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { DeleteConfirmationModal } from '@/components/ui/delete-confirmation-modal'
import { NewOrdersAlert } from '@/components/producer/new-orders-alert'

interface Product {
  id: string
  name: string
  description: string
  price: number
  type: ProductType
  unit: string
  available: boolean
  image: string | null
  categories: { id: string }[]
  stock?: {
    quantity: number
  } | null
  deliverySlots?: any[]
  minOrderQuantity?: number
  acceptDeferred?: boolean
}

interface DashboardStats {
  totalProducts: number
  totalStock: number
  pendingOrders: number
  pendingDeliveries: number
}

interface FreshProductWithoutSlots {
  id: string
  name: string
  type: ProductType
  deliverySlots: any[]
}

export default function ProducerDashboard() {
  const router = useRouter()
  const { toast } = useToast()
  const [products, setProducts] = useState<Product[]>([])
  const [availabilityFilter, setAvailabilityFilter] = useState<string | null>(null)
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    totalStock: 0,
    pendingOrders: 0,
    pendingDeliveries: 0
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [productToDelete, setProductToDelete] = useState<{ id: string, name: string } | null>(null)
  const [freshProductsWithoutSlots, setFreshProductsWithoutSlots] = useState<FreshProductWithoutSlots[]>([])

  // Fonction pour formater les nombres décimaux proprement
  const formatNumber = (num: number): string => {
    // On garde 2 décimales maximum et on supprime les zéros inutiles en fin de nombre
    return parseFloat(num.toFixed(2)).toString();
  };

  // Fonction pour vérifier si une date est aujourd'hui ou dans le futur (ignorant l'heure)
  const isDateTodayOrFuture = (date: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    
    return checkDate >= today;
  }

  const fetchData = async () => {
    try {
      const url = new URL('/api/products', window.location.origin)
      if (availabilityFilter !== null) {
        url.searchParams.set('available', availabilityFilter)
      }
      
      // Chargement parallèle des produits et des créneaux
      const [productsResponse, slotsResponse] = await Promise.all([
        fetch(url.toString()),
        fetch('/api/delivery-slots')
      ]);

      if (!productsResponse.ok || !slotsResponse.ok) 
        throw new Error('Erreur lors du chargement des données')

      const productsData = await productsResponse.json()
      const slotsData = await slotsResponse.json()

      // Convertir les dates en objets Date
      const formattedSlots = slotsData.slots.map((slot: any) => ({
        ...slot,
        date: new Date(slot.date)
      }));

      // Associer les créneaux aux produits
      const productsWithSlots = productsData.products.map((product: Product) => {
        const productSlots = formattedSlots
          .filter((slot: any) => slot.productId === product.id)
          .map((slot: any) => ({
            ...slot,
            date: new Date(slot.date)
          }));
        return {
          ...product,
          deliverySlots: productSlots
        };
      });

      setProducts(productsWithSlots)
      
      // Filtrer les produits frais sans créneaux valides (présents ou futurs)
      const freshWithoutSlots = productsWithSlots.filter((product: Product) => {
        if (product.type !== ProductType.FRESH) return false;
        
        // Vérifier si le produit a des créneaux valides (aujourd'hui ou ultérieurs)
        const hasValidSlots = product.deliverySlots?.some((slot: any) => 
          isDateTodayOrFuture(slot.date)
        );
        
        return !hasValidSlots;
      });

      setFreshProductsWithoutSlots(freshWithoutSlots)

      // Calculer les statistiques
      const totalStock = productsWithSlots.reduce((acc: number, product: Product) => {
        const quantity = product.stock?.quantity || 0
        return acc + (product.unit === 'g' ? quantity / 1000 : quantity)
      }, 0)

      setStats({
        totalProducts: productsWithSlots.length,
        totalStock,
        pendingOrders: 0,
        pendingDeliveries: 0
      })

    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les données",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [availabilityFilter, toast])

  const handleDeleteClick = (product: Product) => {
    setProductToDelete({ id: product.id, name: product.name })
    setIsDeleteModalOpen(true)
  }

  const handleDelete = async () => {
    if (!productToDelete) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/products/${productToDelete.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Erreur lors de la suppression du produit')
      }

      toast({
        title: "Succès",
        description: "Le produit a été supprimé avec succès"
      })

      fetchData()
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le produit",
        variant: "destructive"
      })
    } finally {
      setIsDeleting(false)
      setIsDeleteModalOpen(false)
      setProductToDelete(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-custom-accent" />
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Alerte pour les nouvelles commandes */}
      <NewOrdersAlert />
      
      {/* Alerte pour les produits frais sans créneaux */}
      {freshProductsWithoutSlots.length > 0 && (
        <div className="mb-6 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-500 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-orange-800 dark:text-orange-200">
                Configuration des créneaux de livraison requise
              </h3>
              <p className="mt-1 text-sm text-orange-700 dark:text-orange-300">
                Les produits frais suivants n'ont pas de créneaux de livraison configurés :
              </p>
              <ul className="mt-2 text-sm text-orange-700 dark:text-orange-300 space-y-1">
                {freshProductsWithoutSlots.map(product => (
                  <li key={product.id} className="flex items-center gap-2">
                    <span>•</span>
                    <Link 
                      href={`/producer/delivery-slots/product/${product.id}`}
                      className="underline hover:text-orange-800 dark:hover:text-orange-200"
                    >
                      {product.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-background border border-foreground/10 rounded-lg p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-custom-accent/10 rounded-full">
              <Package className="h-6 w-6 text-custom-accent" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Produits en ligne</p>
              <p className="text-2xl font-semibold text-custom-title">{stats.totalProducts}</p>
            </div>
          </div>
        </div>

        <div className="bg-background border border-foreground/10 rounded-lg p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-full">
              <LineChart className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Stock total</p>
              <p className="text-2xl font-semibold text-custom-title">
                {formatNumber(stats.totalStock)} kg
              </p>
            </div>
          </div>
        </div>

        <div className="bg-background border border-foreground/10 rounded-lg p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-orange-100 dark:bg-orange-900/20 rounded-full">
              <ShoppingBag className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Commandes en attente</p>
              <p className="text-2xl font-semibold text-custom-title">{stats.pendingOrders}</p>
            </div>
          </div>
        </div>

        <div className="bg-background border border-foreground/10 rounded-lg p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-full">
              <Truck className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Livraisons en cours</p>
              <p className="text-2xl font-semibold text-custom-title">{stats.pendingDeliveries}</p>
            </div>
          </div>
        </div>
      </div>

      {/* En-tête de la liste des produits */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-montserrat font-bold text-custom-title">
            Mes Produits
          </h2>
          <select
            value={availabilityFilter ?? ''}
            onChange={(e) => setAvailabilityFilter(e.target.value || null)}
            className="ml-4 rounded-md border border-foreground/10 bg-background px-3 py-2 text-sm"
          >
            <option value="">Tous les produits</option>
            <option value="true">Disponibles</option>
            <option value="false">Indisponibles</option>
          </select>
        </div>
        <Link
          href="/producer/new"
          className="flex items-center gap-2 bg-custom-accent text-white px-4 py-2 rounded-md hover:opacity-90 transition-opacity"
        >
          <Plus className="h-5 w-5" />
          Nouveau Produit
        </Link>
      </div>

      {/* Liste des produits */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => (
          <div
            key={product.id}
            className="bg-background border border-foreground/10 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow"
          >
            {/* En-tête avec image */}
            <div className="flex gap-4 mb-4">
              <div className="w-24 h-24 flex-shrink-0">
                {product.image ? (
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <div className="w-full h-full bg-foreground/5 rounded-lg flex items-center justify-center">
                    <Package className="h-8 w-8 text-foreground/30" />
                  </div>
                )}
              </div>

              {/* Info produit et actions */}
              <div className="flex flex-col flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-montserrat font-semibold text-custom-title">{product.name}</h3>
                    <p className="text-sm text-muted-foreground">{product.type}</p>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href={`/producer/inventory/${product.id}`}
                      className="text-custom-text hover:text-custom-accent transition-colors"
                      aria-label="Gérer les stocks"
                    >
                      <BarChart2 className="h-5 w-5" />
                    </Link>
                    <button
                      onClick={() => router.push(`/producer/${product.id}/edit`)}
                      className="text-custom-text hover:text-custom-accent transition-colors"
                      aria-label="Modifier le produit"
                    >
                      <Edit className="h-5 w-5" />
                    </button>
                    {product.type === ProductType.FRESH && (
                      <Link
                        href={`/producer/delivery-slots/product/${product.id}`}
                        className="text-custom-text hover:text-custom-accent transition-colors"
                        aria-label="Gérer les créneaux de livraison"
                      >
                        <Calendar className="h-5 w-5" />
                      </Link>
                    )}
                    <button
                      onClick={() => handleDeleteClick(product)}
                      className="text-custom-text hover:text-destructive transition-colors"
                      aria-label="Supprimer le produit"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Informations détaillées */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-custom-text">Prix</span>
                <span className="font-medium">{formatNumber(product.price)} CHF/{product.unit}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-custom-text">Stock</span>
                <span className="font-medium">
                  {product.stock ? formatNumber(product.stock.quantity) : '0'} {product.unit}
                </span>
              </div>
              {(product.minOrderQuantity !== undefined && product.minOrderQuantity > 0) && (
                <div className="flex justify-between">
                  <span className="text-custom-text">Quantité min.</span>
                  <span className="font-medium">
                    {formatNumber(product.minOrderQuantity ?? 0)} {product.unit}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-custom-text">Statut</span>
                <span className={cn(
                  "font-medium",
                  product.available ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                )}>
                  {product.available ? 'Disponible' : 'Indisponible'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-custom-text">Paiement 30j</span>
                <span className={cn(
                  "font-medium",
                  product.acceptDeferred ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                )}>
                  {product.acceptDeferred ? 'Accepté' : 'Non accepté'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal de confirmation de suppression */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false)
          setProductToDelete(null)
        }}
        onConfirm={handleDelete}
        productName={productToDelete?.name ?? ''}
        isLoading={isDeleting}
      />
    </div>
  )
}