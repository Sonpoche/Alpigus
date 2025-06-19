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

  // Fonction pour formater une date en chaîne YYYY-MM-DD
  const formatDateToYYYYMMDD = (date: Date): string => {
    return format(date, 'yyyy-MM-dd');
  }

  // Fonction pour vérifier si une date est aujourd'hui ou dans le futur (ignorant l'heure)
  const isDateTodayOrFuture = (date: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    
    return checkDate >= today;
  }

  // Fonction pour vérifier si une date est antérieure à la date d'aujourd'hui (sans considérer l'heure)
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
        // Nettoyer les créneaux expirés avant de charger les données
        await fetch('/api/delivery-slots/cleanup', { method: 'POST' });

        // Récupérer d'abord les produits du producteur
        const productsResponse = await fetch('/api/products');
        if (!productsResponse.ok) throw new Error('Erreur lors du chargement des produits');
        const productsData = await productsResponse.json();
        
        // On prend tous les produits car l'API est déjà filtrée côté serveur
        const producerProducts = productsData.products as Product[];
        
        // Charger les créneaux du producteur
        const slotsResponse = await fetch('/api/delivery-slots');
        if (!slotsResponse.ok) throw new Error('Erreur lors du chargement des créneaux');
        const slotsData = await slotsResponse.json();
        
        // Convertir toutes les dates en objets Date
        const formattedSlots = slotsData.slots.map((slot: any) => ({
          ...slot,
          date: new Date(slot.date)
        })) as DeliverySlot[];
        
        setSlots(formattedSlots);
    
        // Grouper les créneaux par date
        const grouped = formattedSlots.reduce((acc: GroupedSlots, slot: DeliverySlot) => {
          const dateStr = formatDateToYYYYMMDD(slot.date);
          if (!acc[dateStr]) {
            acc[dateStr] = [];
          }
          acc[dateStr].push(slot);
          return acc;
        }, {});
        
        setGroupedSlots(grouped);
        
        // Créer un dictionnaire de produits avec leurs créneaux
        const productsWithSlotsMap = producerProducts.reduce<Record<string, Product>>((acc, product) => {
          acc[product.id] = {
            ...product,
            deliverySlots: []
          };
          return acc;
        }, {});
        
        // Associer les créneaux à leurs produits respectifs
        formattedSlots.forEach((slot: DeliverySlot) => {
          if (productsWithSlotsMap[slot.productId]) {
            if (!productsWithSlotsMap[slot.productId].deliverySlots) {
              productsWithSlotsMap[slot.productId].deliverySlots = [];
            }
            productsWithSlotsMap[slot.productId].deliverySlots!.push(slot);
          }
        });
        
        // Convertir le dictionnaire en tableau
        const productsWithSlots = Object.values(productsWithSlotsMap);
        setProducts(productsWithSlots);
        
        // Filtrer les produits frais sans créneaux valides (présents ou futurs)
        const productsWithoutValidSlots = productsWithSlots.filter((product: Product) => {
          // Si ce n'est pas un produit frais, on l'ignore
          if (product.type !== ProductType.FRESH) return false;
          
          // Vérifier si le produit a des créneaux valides (aujourd'hui ou ultérieurs)
          const hasValidSlots = product.deliverySlots?.some(slot => 
            isDateTodayOrFuture(slot.date)
          );
          
          // Si le produit n'a pas de créneaux valides, on le garde dans la liste
          return !hasValidSlots;
        });
        
        setFreshProductsWithoutSlots(productsWithoutValidSlots);
        
        console.log("Produits frais sans créneaux valides:", productsWithoutValidSlots.map(p => p.name));
        console.log("Tous les créneaux:", formattedSlots);
    
      } catch (error) {
        console.error("Erreur:", error);
        toast({
          title: "Erreur",
          description: "Impossible de charger les créneaux de livraison",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [session, toast]);

  const getDateStyle = (date: Date) => {
    const dateStr = formatDateToYYYYMMDD(date);
    const slotsForDate = groupedSlots[dateStr] || [];
    
    if (slotsForDate.length === 0) return {};

    if (selectedProduct) {
      const hasSelectedProduct = slotsForDate.some(slot => slot.productId === selectedProduct);
      if (!hasSelectedProduct) return {};
    }

    const totalCapacity = slotsForDate.reduce((acc, slot) => acc + slot.maxCapacity, 0);
    const totalReserved = slotsForDate.reduce((acc, slot) => acc + slot.reserved, 0);
    const occupancyRate = totalReserved / totalCapacity;

    // Si la date est passée, on applique une opacité réduite
    if (isDateBeforeToday(date)) {
      return {
        backgroundColor: 'rgb(var(--custom-accent))',
        opacity: 0.3
      };
    }

    return {
      backgroundColor: 'rgb(var(--custom-accent))',
      opacity: 0.1 + (occupancyRate * 0.6)
    };
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-custom-accent" />
      </div>
    );
  }

  const selectedDateStr = selectedDate ? formatDateToYYYYMMDD(selectedDate) : null;
  const selectedSlots = selectedDateStr ? groupedSlots[selectedDateStr] || [] : [];

  return (
    <div className={containerClasses("py-8")}>
      {/* Alerte pour les produits frais sans créneaux */}
      {freshProductsWithoutSlots.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-500 mt-0.5 flex-shrink-0" />
            <div className="min-w-0 flex-1">
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
                      href={`/producer/delivery-slots/product/${product.id}`}
                      className="underline hover:text-orange-800 dark:hover:text-orange-200 truncate"
                    >
                      {product.name}
                    </Link>
                  </li>
                ))}
              </ul>
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
        
        {/* Filtre par produit */}
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
        {/* Calendrier */}
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

        {/* Liste des créneaux pour la date sélectionnée */}
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
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                              <div className="min-w-0 flex-1">
                                <h3 className="font-medium text-custom-title text-sm sm:text-base truncate">
                                  {slot.product.name}
                                </h3>
                                <p className="text-xs sm:text-sm text-muted-foreground">
                                    {slot.maxCapacity - slot.reserved} {slot.product.unit} disponible
                                </p>
                              </div>
                              {!isPastSlot && (
                                <Link
                                  href={`/producer/delivery-slots/product/${slot.productId}`}
                                  className="text-custom-accent hover:opacity-80 text-xs sm:text-sm font-medium whitespace-nowrap"
                                >
                                  Gérer
                                </Link>
                              )}
                            </div>

                            {/* Barre de progression */}
                            <div className="mt-2 h-1.5 sm:h-2 bg-foreground/5 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-custom-accent transition-all"
                                style={{
                                  width: `${(slot.reserved / slot.maxCapacity) * 100}%`
                                }}
                              />
                            </div>
                            
                            {/* Alerte si presque plein */}
                            {(slot.reserved / slot.maxCapacity) > 0.8 && (
                              <div className="flex items-center gap-1 mt-2 text-orange-600">
                                <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                                <span className="text-xs">Presque complet</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8 text-sm">
                  Aucun créneau de livraison pour cette date
                </p>
              )
            ) : (
              <p className="text-center text-muted-foreground py-8 text-sm">
                Sélectionnez une date pour voir les créneaux disponibles
              </p>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}