// components/producer/delivery-slot-calendar.tsx
import { useState, useEffect } from 'react'
import { useToast } from "@/hooks/use-toast"
import { Calendar } from '@/components/ui/calendar'
import { LoadingButton } from '@/components/ui/loading-button'
import { Plus, X, AlertTriangle, Edit2, Copy, Trash2, Square, CheckSquare, Eye, EyeOff } from 'lucide-react'
import { formatNumber, formatInputValue, parseToTwoDecimals } from '@/lib/number-utils'

interface DeliverySlot {
  id: string
  date: Date
  maxCapacity: number
  reserved: number
  isAvailable: boolean
  productId: string
}

interface Product {
  id: string
  name: string
  unit: string
  stock?: {
    quantity: number
  } | null
}

interface ValidationMessage {
  type: 'error' | 'warning'
  message: string
}

interface RepeatConfig {
  weeks: number
  daysOfWeek: number[]
}

export default function DeliverySlotCalendar({ productId }: { productId: string }) {
  const { toast } = useToast()
  const [slots, setSlots] = useState<DeliverySlot[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [product, setProduct] = useState<Product | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [newSlotCapacity, setNewSlotCapacity] = useState('')
  const [editingSlot, setEditingSlot] = useState<DeliverySlot | null>(null)
  const [validationMessages, setValidationMessages] = useState<ValidationMessage[]>([])
  const [isRepeating, setIsRepeating] = useState(false)
  const [repeatConfig, setRepeatConfig] = useState<RepeatConfig>({
    weeks: 1,
    daysOfWeek: []
  })

  // Nouveaux états pour la sélection multiple
  const [selectedSlots, setSelectedSlots] = useState<string[]>([])
  const [isPerformingBulkAction, setIsPerformingBulkAction] = useState(false)

  // Fonction pour calculer la quantité disponible
  const getAvailableQuantity = (slot: DeliverySlot) => {
    return slot.maxCapacity - slot.reserved
  }

  // Fonction pour calculer le pourcentage de disponibilité
  const getAvailabilityPercentage = (slot: DeliverySlot) => {
    return (getAvailableQuantity(slot) / slot.maxCapacity) * 100
  }

  useEffect(() => {
    fetchData()
  }, [productId])

  const fetchData = async () => {
    try {
      // Nettoyer les créneaux expirés avant de charger les données
      await fetch('/api/delivery-slots/cleanup', { method: 'POST' })

      // Charger spécifiquement les données du produit actuel
      const [productResponse, slotsResponse] = await Promise.all([
        fetch(`/api/products/${productId}`),
        fetch(`/api/delivery-slots?productId=${productId}`) // Filtrer par productId
      ])

      if (!productResponse.ok || !slotsResponse.ok) 
        throw new Error('Erreur lors du chargement des données')

      const productData = await productResponse.json()
      const slotsData = await slotsResponse.json()

      setProduct(productData)
      setSlots(slotsData.slots.map((slot: any) => ({
        ...slot,
        date: new Date(slot.date)
      })))
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

  const validateNewSlot = () => {
    if (!selectedDate || !newSlotCapacity || !product) return false

    const capacity = parseFloat(newSlotCapacity)
    const messages: ValidationMessage[] = []

    if (product.stock && capacity > product.stock.quantity) {
      messages.push({
        type: 'error',
        message: `La capacité ne peut pas dépasser le stock disponible (${formatNumber(product.stock.quantity)} ${product.unit})`
      })
    }

    setValidationMessages(messages)
    return messages.every(m => m.type !== 'error')
  }

  const generateRepeatedDates = (startDate: Date, weeks: number, daysOfWeek: number[]): Date[] => {
    const dates: Date[] = [];
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + (weeks * 7));

    for (let date = new Date(startDate); date < endDate; date.setDate(date.getDate() + 1)) {
      if (daysOfWeek.includes(date.getDay())) {
        dates.push(new Date(date));
      }
    }
    return dates;
  }

  const handleCreateSlot = async () => {
    if (!selectedDate || !newSlotCapacity || !validateNewSlot()) return

    setIsCreating(true)
    try {
      const dates = isRepeating 
        ? generateRepeatedDates(selectedDate, repeatConfig.weeks, repeatConfig.daysOfWeek)
        : [selectedDate]

      const capacity = parseFloat(newSlotCapacity)
      
      // Créer tous les créneaux
      const results = await Promise.allSettled(
        dates.map(async (date) => {
          const response = await fetch('/api/delivery-slots', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              productId,
              date: date.toISOString(),
              maxCapacity: capacity
            })
          })

          if (!response.ok) {
            // Lire le message d'erreur depuis la réponse
            const errorText = await response.text()
            throw new Error(errorText || `Erreur ${response.status}`)
          }
          
          return response.json()
        })
      )

      // Analyser les résultats
      const successful = results.filter(r => r.status === 'fulfilled').length
      const failed = results.filter(r => r.status === 'rejected')

      if (successful > 0) {
        toast({
          title: "Créneaux créés",
          description: `${successful} créneau${successful > 1 ? 'x' : ''} créé${successful > 1 ? 's' : ''} avec succès`
        })
        
        // Réinitialiser le formulaire
        setSelectedDate(null)
        setNewSlotCapacity('')
        setIsRepeating(false)
        setRepeatConfig({ weeks: 1, daysOfWeek: [] })
        setValidationMessages([])
        
        // Rafraîchir les données
        await fetchData()
      }

      // Afficher les erreurs spécifiques
      if (failed.length > 0) {
        failed.forEach(failure => {
          if (failure.status === 'rejected') {
            toast({
              title: "Erreur lors de la création",
              description: failure.reason.message || "Erreur inconnue",
              variant: "destructive"
            })
          }
        })
      }

    } catch (error: any) {
      console.error('Erreur lors de la création du créneau:', error)
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer le créneau",
        variant: "destructive"
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleUpdateSlot = async (slot: DeliverySlot, newCapacity: number) => {
    try {
      const response = await fetch(`/api/delivery-slots/${slot.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          maxCapacity: newCapacity
        })
      })

      if (!response.ok) {
        // 🔧 CORRECTION : Lire le message d'erreur depuis la réponse
        const errorText = await response.text()
        throw new Error(errorText || `Erreur ${response.status}`)
      }

      const updatedSlot = await response.json()
      setSlots(prev => prev.map(s => 
        s.id === updatedSlot.id ? { ...updatedSlot, date: new Date(updatedSlot.date) } : s
      ))
      setEditingSlot(null)
      
      toast({
        title: "Succès",
        description: "Créneau mis à jour avec succès"
      })
    } catch (error: any) {
      console.error('Erreur lors de la mise à jour:', error)
      toast({
        title: "Erreur lors de la modification",
        description: error.message || "Impossible de mettre à jour le créneau",
        variant: "destructive"
      })
    }
  }

  const handleDeleteSlot = async (slotId: string) => {
    try {
      const response = await fetch(`/api/delivery-slots/${slotId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        // 🔧 CORRECTION : Lire le message d'erreur
        const errorText = await response.text()
        throw new Error(errorText || `Erreur ${response.status}`)
      }

      setSlots(prev => prev.filter(slot => slot.id !== slotId))
      toast({
        title: "Succès",
        description: "Créneau supprimé avec succès"
      })
    } catch (error: any) {
      console.error('Erreur lors de la suppression:', error)
      toast({
        title: "Erreur lors de la suppression",
        description: error.message || "Impossible de supprimer le créneau",
        variant: "destructive"
      })
    }
  }

  // Nouvelles fonctions pour la sélection multiple
  const toggleSlotSelection = (slotId: string) => {
    setSelectedSlots(prev => 
      prev.includes(slotId) 
        ? prev.filter(id => id !== slotId)
        : [...prev, slotId]
    )
  }

  const selectAllSlots = () => {
    setSelectedSlots(slots.map(slot => slot.id))
  }

  const deselectAllSlots = () => {
    setSelectedSlots([])
  }

  // Actions groupées avec gestion d'erreur améliorée
  const handleBulkDelete = async () => {
    if (selectedSlots.length === 0) return

    setIsPerformingBulkAction(true)
    try {
      const results = await Promise.allSettled(
        selectedSlots.map(async (slotId) => {
          const response = await fetch(`/api/delivery-slots/${slotId}`, { method: 'DELETE' })
          if (!response.ok) {
            const errorText = await response.text()
            throw new Error(errorText || `Erreur ${response.status}`)
          }
          return response
        })
      )

      // Analyser les résultats
      const successful = results.filter(r => r.status === 'fulfilled').length
      const failed = results.filter(r => r.status === 'rejected')

      if (successful > 0) {
        setSlots(prev => prev.filter(slot => !selectedSlots.includes(slot.id)))
        setSelectedSlots([])
        
        toast({
          title: "Succès",
          description: `${successful} créneau(x) supprimé(s) avec succès`
        })
      }

      // Afficher les erreurs spécifiques
      if (failed.length > 0) {
        failed.forEach(failure => {
          if (failure.status === 'rejected') {
            toast({
              title: "Erreur lors de la suppression",
              description: failure.reason.message || "Erreur inconnue",
              variant: "destructive"
            })
          }
        })
      }

    } catch (error: any) {
      console.error('Erreur lors de la suppression groupée:', error)
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de la suppression des créneaux",
        variant: "destructive"
      })
    } finally {
      setIsPerformingBulkAction(false)
    }
  }

  const handleBulkToggleAvailability = async () => {
    if (selectedSlots.length === 0) return

    setIsPerformingBulkAction(true)
    try {
      const selectedSlotsData = slots.filter(slot => selectedSlots.includes(slot.id))
      const allAvailable = selectedSlotsData.every(slot => slot.isAvailable)
      const newAvailability = !allAvailable

      const results = await Promise.allSettled(
        selectedSlots.map(async (slotId) => {
          const response = await fetch(`/api/delivery-slots/${slotId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isAvailable: newAvailability })
          })
          
          if (!response.ok) {
            const errorText = await response.text()
            throw new Error(errorText || `Erreur ${response.status}`)
          }
          return response
        })
      )

      // Analyser les résultats
      const successful = results.filter(r => r.status === 'fulfilled').length
      const failed = results.filter(r => r.status === 'rejected')

      if (successful > 0) {
        setSlots(prev => prev.map(slot => 
          selectedSlots.includes(slot.id) 
            ? { ...slot, isAvailable: newAvailability }
            : slot
        ))
        
        toast({
          title: "Succès",
          description: `${successful} créneau(x) ${newAvailability ? 'activé(s)' : 'désactivé(s)'} avec succès`
        })
      }

      // Afficher les erreurs spécifiques
      if (failed.length > 0) {
        failed.forEach(failure => {
          if (failure.status === 'rejected') {
            toast({
              title: "Erreur lors de la modification",
              description: failure.reason.message || "Erreur inconnue",
              variant: "destructive"
            })
          }
        })
      }

    } catch (error: any) {
      console.error('Erreur lors de la modification groupée:', error)
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de la modification des créneaux",
        variant: "destructive"
      })
    } finally {
      setIsPerformingBulkAction(false)
    }
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('fr-FR', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }).format(date)
  }

  if (isLoading || !product) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-custom-accent" />
      </div>
    )
  }

  // Fonction pour vérifier si une date est antérieure à la date d'aujourd'hui (sans considérer l'heure)
  const isDateBeforeToday = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateToCheck = new Date(date);
    dateToCheck.setHours(0, 0, 0, 0);
    return dateToCheck < today;
  }

  return (
    <div className="space-y-8">
      {/* Ajout d'un en-tête indiquant clairement le produit concerné */}
      <div className="bg-foreground/5 p-4 rounded-lg">
        <h3 className="font-medium mb-2">Gestion des créneaux pour : {product.name}</h3>
        <p className="text-sm text-muted-foreground">
          Les créneaux de livraison affichés ci-dessous concernent uniquement ce produit.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        {/* Calendrier */}
        <div>
          <Calendar
            selected={selectedDate}
            onSelect={setSelectedDate}
            bookedDates={slots.map(slot => slot.date)}
          />
        </div>

        {/* Liste des créneaux et formulaire */}
        <div className="space-y-6">
          {/* Formulaire d'ajout */}
          {selectedDate && (
            <div className="bg-background border border-foreground/10 rounded-lg p-4">
              <h3 className="font-medium mb-4">
                Nouveau créneau pour le {formatDate(selectedDate)}
              </h3>
              <div className="space-y-4">
                <div className="flex gap-4 items-end">
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-1">
                      Capacité maximale ({product.unit})
                    </label>
                    <input
                      type="number"
                      value={newSlotCapacity}
                      onChange={(e) => {
                        const formatted = formatInputValue(e.target.value)
                        setNewSlotCapacity(formatted)
                        if (formatted) validateNewSlot()
                      }}
                      onBlur={(e) => {
                        if (e.target.value) {
                          const parsed = parseToTwoDecimals(e.target.value)
                          setNewSlotCapacity(formatNumber(parsed))
                        }
                      }}
                      min="0"
                      step="0.01"
                      max="999999.99"
                      className="w-full rounded-md border border-foreground/10 bg-background px-3 py-2"
                    />
                  </div>
                  <button
                    onClick={() => setIsRepeating(!isRepeating)}
                    className={`p-2 rounded-md transition-colors ${
                      isRepeating 
                        ? "bg-custom-accent text-white" 
                        : "border border-foreground/10 hover:bg-foreground/5"
                    }`}
                    title="Répéter le créneau"
                  >
                    <Copy className="h-5 w-5" />
                  </button>
                  <LoadingButton
                    onClick={handleCreateSlot}
                    isLoading={isCreating}
                    disabled={!newSlotCapacity}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter
                  </LoadingButton>
                </div>

                {isRepeating && (
                  <div className="space-y-4 p-4 bg-foreground/5 rounded-md">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Répéter pendant (semaines)
                      </label>
                      <input
                        type="number"
                        value={repeatConfig.weeks}
                        onChange={(e) => setRepeatConfig(prev => ({
                          ...prev,
                          weeks: parseInt(e.target.value)
                        }))}
                        min="1"
                        max="52"
                        className="w-24 rounded-md border border-foreground/10 bg-background px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Jours de la semaine
                      </label>
                      <div className="flex gap-2 flex-wrap">
                        {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((day, index) => (
                          <button
                            key={day}
                            onClick={() => {
                              const dayIndex = (index + 1) % 7;
                              setRepeatConfig(prev => ({
                                ...prev,
                                daysOfWeek: prev.daysOfWeek.includes(dayIndex)
                                  ? prev.daysOfWeek.filter(d => d !== dayIndex)
                                  : [...prev.daysOfWeek, dayIndex]
                              }))
                            }}
                            className={`px-3 py-1 rounded-md transition-colors ${
                              repeatConfig.daysOfWeek.includes((index + 1) % 7)
                                ? "bg-custom-accent text-white"
                                : "border border-foreground/10 hover:bg-foreground/5"
                            }`}
                          >
                            {day}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Messages de validation */}
              {validationMessages.length > 0 && (
                <div className="mt-4 space-y-2">
                  {validationMessages.map((message, index) => (
                    <div
                      key={index}
                      className={`flex items-start gap-2 rounded-md p-2 text-sm ${
                        message.type === 'error' 
                          ? "bg-destructive/10 text-destructive"
                          : "bg-yellow-500/10 text-yellow-700"
                      }`}
                    >
                      <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <p>{message.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* En-tête avec actions de sélection - VERSION RESPONSIVE */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <div>
              <h3 className="font-medium">Créneaux configurés</h3>
              <p className="text-sm text-muted-foreground">
                {slots.length} créneau{slots.length > 1 ? 'x' : ''} • {selectedSlots.length} sélectionné{selectedSlots.length > 1 ? 's' : ''}
              </p>
            </div>
            
            {/* Actions de sélection - Responsive */}
            <div className="flex gap-2 text-sm">
              <button
                onClick={selectAllSlots}
                className="px-2 sm:px-3 py-1 bg-custom-accent/10 text-custom-accent rounded-md hover:bg-custom-accent/20 transition-colors text-xs sm:text-sm"
              >
                <span className="hidden sm:inline">Tout sélectionner</span>
                <span className="sm:hidden">Tout</span>
              </button>
              <button
                onClick={deselectAllSlots}
                className="px-2 sm:px-3 py-1 bg-foreground/5 text-foreground rounded-md hover:bg-foreground/10 transition-colors text-xs sm:text-sm"
              >
                <span className="hidden sm:inline">Désélectionner</span>
                <span className="sm:hidden">Aucun</span>
              </button>
            </div>
          </div>

          {/* Actions groupées - VERSION RESPONSIVE */}
          {selectedSlots.length > 0 && (
            <div className="flex flex-col sm:flex-row gap-2 p-3 bg-custom-accent/5 border border-custom-accent/20 rounded-lg">
              <LoadingButton
                onClick={handleBulkToggleAvailability}
                isLoading={isPerformingBulkAction}
                variant="outline"
                size="sm"
                className="w-full sm:w-auto text-xs sm:text-sm"
              >
                {selectedSlots.length > 0 && slots.filter(s => selectedSlots.includes(s.id)).every(s => s.isAvailable) ? (
                  <><EyeOff className="h-3 w-3 sm:h-4 sm:w-4 mr-1" /> Désactiver</>
                ) : (
                  <><Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1" /> Activer</>
                )}
              </LoadingButton>
              <LoadingButton
                onClick={handleBulkDelete}
                isLoading={isPerformingBulkAction}
                variant="destructive"
                size="sm"
                className="w-full sm:w-auto text-xs sm:text-sm"
              >
                <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                Supprimer
              </LoadingButton>
            </div>
          )}

          {/* Liste des créneaux - VERSION RESPONSIVE */}
          <div className="space-y-2">
            {slots.length === 0 ? (
              <p className="text-muted-foreground text-sm p-4 text-center">
                Aucun créneau défini. Sélectionnez une date pour en créer un.
              </p>
            ) : (
              slots
                .sort((a, b) => a.date.getTime() - b.date.getTime())
                .map(slot => {
                  const isPastSlot = isDateBeforeToday(slot.date);
                  const available = getAvailableQuantity(slot);
                  const availabilityPercentage = getAvailabilityPercentage(slot);
                  const isSelected = selectedSlots.includes(slot.id);
                  
                  return (
                    <div
                      key={slot.id}
                      className={`flex flex-col sm:flex-row sm:items-center gap-3 p-3 sm:p-4 border rounded-lg transition-colors ${
                        isPastSlot ? 'opacity-50' : ''
                      } ${
                        isSelected ? 'border-custom-accent bg-custom-accent/5' : 'border-foreground/10'
                      }`}
                    >
                      {/* Header mobile avec checkbox et date */}
                      <div className="flex items-center justify-between sm:justify-start sm:gap-3 w-full sm:w-auto">
                        {/* Checkbox de sélection */}
                        <button
                          onClick={() => toggleSlotSelection(slot.id)}
                          className="flex-shrink-0"
                          disabled={isPastSlot}
                        >
                          {isSelected ? (
                            <CheckSquare className="h-4 w-4 sm:h-5 sm:w-5 text-custom-accent" />
                          ) : (
                            <Square className="h-4 w-4 sm:h-5 sm:w-5 text-foreground/40" />
                          )}
                        </button>

                        {/* Date - plus compacte sur mobile */}
                        <div className="flex-1 sm:flex-none min-w-0">
                          <p className="font-medium text-sm sm:text-base truncate">
                            <span className="sm:hidden">
                              {new Intl.DateTimeFormat('fr-FR', { 
                                day: 'numeric', 
                                month: 'short' 
                              }).format(slot.date)}
                            </span>
                            <span className="hidden sm:inline">
                              {formatDate(slot.date)}
                            </span>
                          </p>
                        </div>

                        {/* Actions sur mobile */}
                        <div className="flex gap-1 sm:hidden">
                          {editingSlot?.id === slot.id ? (
                            <>
                              <button
                                onClick={() => handleUpdateSlot(slot, editingSlot.maxCapacity)}
                                className="p-2 text-custom-accent hover:bg-custom-accent/10 rounded-full transition-colors"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => setEditingSlot(null)}
                                className="p-2 text-destructive hover:bg-destructive/10 rounded-full transition-colors"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => setEditingSlot(slot)}
                                className="p-2 hover:bg-foreground/5 rounded-full transition-colors text-custom-text hover:text-custom-accent"
                                title="Modifier le créneau"
                                disabled={isPastSlot}
                              >
                                <Edit2 className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => handleDeleteSlot(slot.id)}
                                className="p-2 hover:bg-foreground/5 rounded-full transition-colors text-custom-text hover:text-destructive"
                                title="Supprimer le créneau"
                                disabled={slot.reserved > 0 || isPastSlot}
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Contenu du créneau */}
                      <div className="flex-1 min-w-0 space-y-2">
                        {/* Statuts et capacité */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          {/* Date complète sur mobile (masquée sur desktop car déjà affichée) */}
                          <div className="sm:hidden">
                            <p className="text-xs text-muted-foreground">
                              {formatDate(slot.date)}
                            </p>
                          </div>
                          
                          <div className="flex items-center gap-2 flex-wrap">
                            {!slot.isAvailable && (
                              <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
                                Désactivé
                              </span>
                            )}
                            <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                              availabilityPercentage > 70 
                                ? 'bg-green-100 text-green-700'
                                : availabilityPercentage > 30
                                ? 'bg-orange-100 text-orange-700'
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {formatNumber(available)} / {formatNumber(slot.maxCapacity)} {product.unit}
                            </span>
                          </div>
                        </div>
                        
                        {/* Barre de progression de disponibilité */}
                        <div className="w-full bg-foreground/10 rounded-full h-1.5 sm:h-2">
                          <div
                            className={`h-1.5 sm:h-2 rounded-full transition-all ${
                              availabilityPercentage > 70 
                                ? 'bg-green-500'
                                : availabilityPercentage > 30
                                ? 'bg-orange-500'
                                : 'bg-red-500'
                            }`}
                            style={{ width: `${availabilityPercentage}%` }}
                          />
                        </div>

                        {/* Input d'édition sur mobile */}
                        {editingSlot?.id === slot.id && (
                          <div className="sm:hidden">
                            <input
                              type="number"
                              value={editingSlot.maxCapacity}
                              onChange={(e) => {
                                const formatted = formatInputValue(e.target.value)
                                const numValue = parseToTwoDecimals(parseFloat(formatted))
                                setEditingSlot({
                                  ...editingSlot,
                                  maxCapacity: numValue
                                })
                              }}
                              min={slot.reserved}
                              step="0.01"
                              max="999999.99"
                              className="w-full rounded-md border border-foreground/10 bg-background px-3 py-2 text-sm"
                              placeholder="Nouvelle capacité"
                            />
                          </div>
                        )}
                      </div>

                      {/* Actions desktop */}
                      <div className="hidden sm:flex gap-2">
                        {editingSlot?.id === slot.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={editingSlot.maxCapacity}
                              onChange={(e) => {
                                const formatted = formatInputValue(e.target.value)
                                const numValue = parseToTwoDecimals(parseFloat(formatted))
                                setEditingSlot({
                                  ...editingSlot,
                                  maxCapacity: numValue
                                })
                              }}
                              min={slot.reserved}
                              step="0.01"
                              max="999999.99"
                              className="w-24 rounded-md border border-foreground/10 bg-background px-2 py-1"
                            />
                            <button
                              onClick={() => handleUpdateSlot(slot, editingSlot.maxCapacity)}
                              className="p-2 text-custom-accent hover:bg-custom-accent/10 rounded-full transition-colors"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setEditingSlot(null)}
                              className="p-2 text-destructive hover:bg-destructive/10 rounded-full transition-colors"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => setEditingSlot(slot)}
                              className="p-2 hover:bg-foreground/5 rounded-full transition-colors text-custom-text hover:text-custom-accent"
                              title="Modifier le créneau"
                              disabled={isPastSlot}
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteSlot(slot.id)}
                              className="p-2 hover:bg-foreground/5 rounded-full transition-colors text-custom-text hover:text-destructive"
                              title="Supprimer le créneau"
                              disabled={slot.reserved > 0 || isPastSlot}
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )
                })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}