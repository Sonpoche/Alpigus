// components/producer/delivery-slots-overview.tsx
'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Package, Calendar as CalendarIcon, AlertCircle } from 'lucide-react'
import { useToast } from "@/hooks/use-toast"
import Link from 'next/link'
import { cn, containerClasses, gridClasses, cardClasses, spacingClasses } from '@/lib/utils'
import SlotsCalendar from '@/components/ui/slots-calendar'
import { UserRole, ProductType } from '@prisma/client'
import { motion } from 'framer-motion'
import { formatNumber } from '@/lib/number-utils'

interface Product {
  id: string
  name: string
  image: string | null
  unit: string
  type: ProductType
  producerId: string
  producer?: {
    userId: string
  }
  deliverySlots?: DeliverySlot[]
}

interface DeliverySlot {
  id: string
  date: Date
  maxCapacity: number
  reserved: number
  isAvailable: boolean
  productId: string
  product: Product
}

interface GroupedSlots {
  [date: string]: DeliverySlot[]
}

export default function DeliverySlotsOverview() {
  const { data: session } = useSession()
  const { toast } = useToast()
  const [slots, setSlots] = useState<DeliverySlot[]>([])
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [groupedSlots, setGroupedSlots] = useState<GroupedSlots>({})
  const [selectedProduct, setSelectedProduct] = useState<string>('')
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [freshProductsWithoutSlots, setFreshProductsWithoutSlots] = useState<Product[]>([])

  const formatDateToYYYYMMDD = (date: Date): string => {
    return format(date, 'yyyy-MM-dd');
  }

  const isDateTodayOrFuture = (date: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    
    return checkDate >= today;
  }

  const isDateBeforeToday = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateToCheck = new Date(date);
    dateToCheck.setHours(0, 0, 0, 0);
    return dateToCheck < today;
  }

  useEffect(() => {
    const fetchData = async () => {
      if (!session?.user?.id) return;
    
      try {
        await fetch('/api/delivery-slots/cleanup', { method: 'POST' });

        const productsResponse = await fetch('/api/products');
        if (!productsResponse.ok) throw new Error('Erreur lors du chargement des produits');
        const productsData = await productsResponse.json();
        
        const producerProducts = productsData.products as Product[];
        
        const slotsResponse = await fetch('/api/delivery-slots');
        if (!slotsResponse.ok) throw new Error('Erreur lors du chargement des créneaux');
        const slotsData = await slotsResponse.json();
        
        const formattedSlots = slotsData.slots.map((slot: any) => ({
          ...slot,
          date: new Date(slot.date)
        })) as DeliverySlot[];
        
        setSlots(formattedSlots);
    
        const grouped = formattedSlots.reduce((acc: GroupedSlots, slot: DeliverySlot) => {
          const dateStr = formatDateToYYYYMMDD(slot.date);
          if (!acc[dateStr]) {
            acc[dateStr] = [];
          }
          acc[dateStr].push(slot);
          return acc;
        }, {});
        
        setGroupedSlots(grouped);
        
        const productsWithSlotsMap = producerProducts.reduce<Record<string, Product>>((acc, product) => {
          acc[product.id] = {
            ...product,
            deliverySlots: []
          };
          return acc;
        }, {});
        
        formattedSlots.forEach((slot: DeliverySlot) => {
          if (productsWithSlotsMap[slot.productId]) {
            if (!productsWithSlotsMap[slot.productId].deliverySlots) {
              productsWithSlotsMap[slot.productId].deliverySlots = [];
            }
            productsWithSlotsMap[slot.productId].deliverySlots!.push(slot);
          }
        });
        
        const productsWithSlots = Object.values(productsWithSlotsMap);
        setProducts(productsWithSlots);
        
        const productsWithoutValidSlots = productsWithSlots.filter((product: Product) => {
          if (product.type !== ProductType.FRESH) return false;
          
          const hasValidSlots = product.deliverySlots?.some(slot => 
            isDateTodayOrFuture(slot.date)
          );
          
          return !hasValidSlots;
        });
        
        setFreshProductsWithoutSlots(productsWithoutValidSlots);
        
        console.log("Produits frais sans créneaux valides:", productsWithoutValidSlots.map(p => p.name));
        
      } catch (error) {
        console.error('Erreur:', error);
        toast({
          title: "Erreur",
          description: "Impossible de charger les données",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [session, toast, isDateTodayOrFuture]);

  const selectedSlots = selectedDate 
    ? groupedSlots[formatDateToYYYYMMDD(selectedDate)] || []
    : [];

  const getDateStyle = (date: Date) => {
    const dateStr = formatDateToYYYYMMDD(date);
    const slotsForDate = groupedSlots[dateStr] || [];
    
    if (slotsForDate.length === 0) return { backgroundColor: 'transparent' };
    
    const totalCapacity = slotsForDate.reduce((sum, slot) => sum + slot.maxCapacity, 0);
    const totalReserved = slotsForDate.reduce((sum, slot) => sum + slot.reserved, 0);
    const availabilityRatio = totalReserved / totalCapacity;
    
    if (availabilityRatio < 0.33) {
      return { backgroundColor: 'rgb(var(--custom-accent) / 0.2)' };
    } else if (availabilityRatio < 0.66) {
      return { backgroundColor: 'rgb(var(--custom-accent) / 0.5)' };
    } else {
      return { backgroundColor: 'rgb(var(--custom-accent) / 0.8)' };
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-custom-accent" />
      </div>
    )
  }

  return (
    <div className={containerClasses()}>
      {freshProductsWithoutSlots.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 sm:mb-8"
        >
          <div className="bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-200 dark:border-orange-800 rounded-lg p-4 sm:p-6">
            <div className="flex items-start gap-3 sm:gap-4">
              <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-orange-800 dark:text-orange-200 text-sm sm:text-base">
                  Configuration des créneaux de livraison requise
                </h3>
                <p className="mt-1 text-xs sm:text-sm text-orange-700 dark:text-orange-300">
                  Les produits frais suivants n'ont pas de créneaux de livraison configurés :
                </p>
                <ul className="mt-2 text-xs sm:text-sm text-orange-700 dark:text-orange-300 space-y-1">
                  {freshProductsWithoutSlots.map(product => (
                    <li key={product.id} className="flex items-center gap-2">
                      <span>•</span>
                      <Link 
                        href={`/producteur/creneaux-livraison/produit/${product.id}`}
                        className="underline hover:text-orange-800 dark:hover:text-orange-200 truncate"
                      >
                        {product.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-8">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-montserrat text-custom-title mb-2">
            Vue d'ensemble des livraisons
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Gérez tous vos créneaux de livraison en un coup d'œil
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <select
            value={selectedProduct}
            onChange={(e) => setSelectedProduct(e.target.value)}
            className="rounded-md border border-foreground/10 bg-background px-3 py-2 text-xs sm:text-sm w-full sm:w-auto"
          >
            <option value="">Tous les produits</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={gridClasses({ default: 1, lg: 2 }, "gap-6 lg:gap-8")}>
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className={cardClasses()}
        >
          <div className={spacingClasses('md')}>
            <SlotsCalendar
              selected={selectedDate}
              onSelect={setSelectedDate}
              getDayProps={(date: Date) => ({
                style: getDateStyle(date)
              })}
            />
            
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="inline-block w-3 h-3 bg-custom-accent/20 rounded-full flex-shrink-0" /> 
                <span className="text-muted-foreground truncate">Faible occupation</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block w-3 h-3 bg-custom-accent/50 rounded-full flex-shrink-0" /> 
                <span className="text-muted-foreground truncate">Occupation moyenne</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block w-3 h-3 bg-custom-accent/80 rounded-full flex-shrink-0" /> 
                <span className="text-muted-foreground truncate">Forte occupation</span>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className={cardClasses()}
        >
          <div className={spacingClasses('md')}>
            <div className="flex items-center gap-2 mb-4">
              <CalendarIcon className="h-4 w-4 sm:h-5 sm:w-5 text-custom-accent flex-shrink-0" />
              <h2 className="font-semibold text-sm sm:text-lg text-custom-title truncate">
                {selectedDate 
                  ? format(selectedDate, 'EEEE d MMMM yyyy', { locale: fr })
                  : "Sélectionnez une date"}
              </h2>
            </div>

            {selectedDate ? (
              selectedSlots.length > 0 ? (
                <div className="space-y-3 sm:space-y-4">
                  {selectedSlots
                    .filter(slot => !selectedProduct || slot.productId === selectedProduct)
                    .map(slot => {
                      const isPastSlot = isDateBeforeToday(slot.date);
                      
                      return (
                        <div
                          key={slot.id}
                          className={cn(
                            "flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 border border-foreground/10 rounded-lg hover:bg-foreground/5 transition-colors",
                            isPastSlot ? 'opacity-50' : ''
                          )}
                        >
                          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-foreground/5 flex items-center justify-center flex-shrink-0">
                            {slot.product.image ? (
                              <img
                                src={slot.product.image}
                                alt={slot.product.name}
                                className="w-full h-full object-cover rounded-lg"
                              />
                            ) : (
                              <Package className="h-5 w-5 sm:h-6 sm:w-6 text-foreground/30" />
                            )}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                              <div className="min-w-0 flex-1">
                                <h3 className="font-medium text-custom-title text-sm sm:text-base truncate">
                                  {slot.product.name}
                                </h3>
                                <p className="text-xs sm:text-sm text-muted-foreground">
                                  {formatNumber(slot.maxCapacity - slot.reserved)} {slot.product.unit} disponible
                                </p>
                              </div>
                              {!isPastSlot && (
                                <Link
                                  href={`/producteur/creneaux-livraison/produit/${slot.productId}`}
                                  className="text-custom-accent hover:opacity-80 text-xs sm:text-sm font-medium whitespace-nowrap"
                                >
                                  Gérer
                                </Link>
                              )}
                            </div>

                            <div className="mt-2 h-1.5 sm:h-2 bg-foreground/5 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-custom-accent transition-all"
                                style={{
                                  width: `${(slot.reserved / slot.maxCapacity) * 100}%`
                                }}
                              />
                            </div>
                            
                            <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                              <span>{formatNumber(slot.reserved)} {slot.product.unit} réservé</span>
                              <span>{formatNumber(slot.maxCapacity)} {slot.product.unit} max</span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 sm:py-12 text-center px-4">
                  <CalendarIcon className="h-10 w-10 sm:h-12 sm:w-12 text-foreground/20 mb-3 sm:mb-4" />
                  <p className="text-sm sm:text-base font-medium text-custom-title mb-1 sm:mb-2">
                    Aucun créneau pour cette date
                  </p>
                  <p className="text-xs sm:text-sm text-muted-foreground max-w-sm">
                    Vous n'avez pas encore configuré de créneaux de livraison pour cette date
                  </p>
                </div>
              )
            ) : (
              <div className="flex flex-col items-center justify-center py-8 sm:py-12 text-center px-4">
                <CalendarIcon className="h-10 w-10 sm:h-12 sm:w-12 text-foreground/20 mb-3 sm:mb-4" />
                <p className="text-sm sm:text-base font-medium text-custom-title mb-1 sm:mb-2">
                  Sélectionnez une date
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground max-w-sm">
                  Cliquez sur une date dans le calendrier pour voir les créneaux de livraison
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  )
}