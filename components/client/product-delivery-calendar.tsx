// components/client/product-delivery-calendar.tsx
'use client'

import { useState, useEffect } from 'react'
import { Calendar } from '@/components/ui/calendar'
import { useToast } from "@/hooks/use-toast"
import { LoadingButton } from '@/components/ui/loading-button'
import { formatNumber, formatInputValue, parseToTwoDecimals } from '@/lib/number-utils'

interface DeliverySlot {
  id: string
  date: Date
  maxCapacity: number
  reserved: number
  isAvailable: boolean
}

interface Product {
  id: string
  name: string
  unit: string
  // Autres propriétés du produit si nécessaires
}

interface ProductDeliveryCalendarProps {
  productId: string
  onReservationComplete: (slotId: string, quantity: number) => void
  minQuantity?: number // Ajout de cette propriété
}

export default function ProductDeliveryCalendar({ 
  productId,
  onReservationComplete,
  minQuantity = 0 // Valeur par défaut à 0
}: ProductDeliveryCalendarProps) {
  const { toast } = useToast()
  const [slots, setSlots] = useState<DeliverySlot[]>([])
  const [product, setProduct] = useState<Product | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<DeliverySlot | null>(null)
  const [quantity, setQuantity] = useState<string>(minQuantity > 0 ? formatNumber(minQuantity) : "1")
  const [isReserving, setIsReserving] = useState(false)

  // Charger les créneaux disponibles et les informations du produit
  useEffect(() => {
    async function fetchData() {
      try {
        // Charger les informations du produit pour avoir l'unité
        const productResponse = await fetch(`/api/products/${productId}`)
        if (!productResponse.ok) throw new Error('Erreur lors du chargement du produit')
        const productData = await productResponse.json()
        setProduct(productData)
        
        // Charger les créneaux
        const response = await fetch(`/api/delivery-slots?productId=${productId}`)
        if (!response.ok) throw new Error('Erreur lors du chargement des créneaux')
        
        const data = await response.json()
        const formattedSlots = data.slots.map((slot: any) => ({
          ...slot,
          date: new Date(slot.date)
        }))
        
        setSlots(formattedSlots)
      } catch (error) {
        toast({
          title: "Erreur",
          description: "Impossible de charger les données de livraison",
          variant: "destructive"
        })
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchData()
  }, [productId, toast])

  // Quand une date est sélectionnée, trouver le créneau correspondant
  useEffect(() => {
    if (!selectedDate || slots.length === 0) {
      setSelectedSlot(null)
      return
    }
    
    const slotForDate = slots.find(slot => 
      slot.date.getFullYear() === selectedDate.getFullYear() &&
      slot.date.getMonth() === selectedDate.getMonth() &&
      slot.date.getDate() === selectedDate.getDate()
    )
    
    setSelectedSlot(slotForDate || null)
  }, [selectedDate, slots])

  // Fonction pour réserver un créneau
  const handleReserve = async () => {
    if (!selectedSlot) return
    
    setIsReserving(true)
    
    try {
      const qtyNum = parseToTwoDecimals(parseFloat(quantity))
      if (isNaN(qtyNum) || qtyNum <= 0) {
        throw new Error('Quantité invalide')
      }
      
      // Vérifier la quantité minimale
      if (minQuantity > 0 && qtyNum < minQuantity) {
        throw new Error(`La quantité minimale pour ce produit est de ${formatNumber(minQuantity)} ${product?.unit}`)
      }
      
      // Vérifier si une commande en cours existe, sinon en créer une
      const storedOrderId = localStorage.getItem('currentOrderId')
      let finalOrderId: string
      
      try {
        if (storedOrderId) {
          // Vérifier si la commande existe et appartient à l'utilisateur
          const checkOrderResponse = await fetch(`/api/orders/${storedOrderId}`)
          if (checkOrderResponse.ok) {
            // La commande existe et est accessible
            finalOrderId = storedOrderId
          } else {
            // La commande n'existe pas ou n'appartient pas à l'utilisateur
            throw new Error('Invalid order')
          }
        } else {
          throw new Error('No order found')
        }
      } catch (error) {
        // Créer une nouvelle commande
        const createOrderResponse = await fetch('/api/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'client_order'
          })
        })
        
        if (!createOrderResponse.ok) {
          throw new Error('Impossible de créer une commande')
        }
        
        const newOrder = await createOrderResponse.json()
        finalOrderId = newOrder.id
        localStorage.setItem('currentOrderId', finalOrderId)
      }
      
      // Réserver le créneau
      const reserveResponse = await fetch(`/api/delivery-slots/${selectedSlot.id}/book`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quantity: qtyNum,
          orderId: finalOrderId
        })
      })
      
      if (!reserveResponse.ok) {
        const errorData = await reserveResponse.json()
        throw new Error(errorData.message || 'Erreur lors de la réservation')
      }
      
      // Succès
      toast({
        title: "Réservation confirmée",
        description: `${formatNumber(qtyNum)} ${product?.unit} réservé(s) pour le ${selectedSlot.date.toLocaleDateString('fr-FR')}`
      })
      
      // Notifier le parent
      onReservationComplete(selectedSlot.id, qtyNum)
      
      // Réinitialiser la sélection
      setSelectedDate(null)
      setSelectedSlot(null)
      setQuantity(minQuantity > 0 ? formatNumber(minQuantity) : "1")
      
    } catch (error: any) {
      console.error("Erreur de réservation:", error)
      toast({
        title: "Erreur",
        description: error.message || "Impossible de réserver ce créneau",
        variant: "destructive"
      })
    } finally {
      setIsReserving(false)
    }
  }

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatInputValue(e.target.value)
    setQuantity(formatted)
  }

  const handleQuantityBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (e.target.value) {
      const parsed = parseToTwoDecimals(parseFloat(e.target.value))
      setQuantity(formatNumber(parsed))
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-custom-accent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Sélectionner un créneau de livraison</h3>
      
      <Calendar
        selected={selectedDate}
        onSelect={setSelectedDate}
        bookedDates={slots.map(slot => slot.date)}
        showLegend={false} // Ne pas afficher la légende
      />
      
      {selectedSlot && (
        <div className="border border-foreground/10 rounded-lg p-4 bg-background">
          <h4 className="font-medium mb-2">
            Créneau sélectionné: {selectedSlot.date.toLocaleDateString('fr-FR', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </h4>
          
          <p className="text-sm text-muted-foreground mb-4">
            Quantité disponible: {formatNumber(selectedSlot.maxCapacity - selectedSlot.reserved)} {product?.unit || ''}
          </p>
          
          <div className="flex gap-4 items-end mb-4">
            <div>
              <label htmlFor="quantity" className="block text-sm font-medium mb-1">
                Quantité à réserver ({product?.unit || ''})
                {minQuantity > 0 && (
                  <span className="text-xs text-amber-600 ml-2">
                    Min: {formatNumber(minQuantity)} {product?.unit}
                  </span>
                )}
              </label>
              <input
                id="quantity"
                type="number"
                value={quantity}
                onChange={handleQuantityChange}
                onBlur={handleQuantityBlur}
                min={minQuantity || 0.01}
                step="0.01"
                max={selectedSlot.maxCapacity - selectedSlot.reserved}
                className="w-24 rounded-md border border-foreground/10 bg-background px-3 py-2"
              />
            </div>
            
            <LoadingButton
              onClick={handleReserve}
              isLoading={isReserving}
              disabled={!quantity || parseFloat(quantity) <= 0}
              className="bg-custom-accent text-white hover:bg-custom-accentHover"
            >
              Réserver
            </LoadingButton>
          </div>
          
          <div className="text-xs text-muted-foreground">
            <p>• La réservation sera confirmée après finalisation de votre commande</p>
            <p>• Vous avez 2 heures pour finaliser votre commande</p>
          </div>
        </div>
      )}
      
      {slots.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p>Aucun créneau de livraison disponible pour ce produit.</p>
        </div>
      )}
    </div>
  )
}