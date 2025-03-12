import { useState, useEffect } from 'react'
import { useToast } from "@/hooks/use-toast"
import { Calendar } from '@/components/ui/calendar'
import { LoadingButton } from '@/components/ui/loading-button'
import { Plus, X, AlertTriangle, Edit2, Copy } from 'lucide-react'

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
  }
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

  useEffect(() => {
    fetchData()
  }, [productId])

  const fetchData = async () => {
    try {
      // Nettoyer les créneaux expirés avant de charger les données
      await fetch('/api/delivery-slots/cleanup', { method: 'POST' })

      const [productResponse, slotsResponse] = await Promise.all([
        fetch(`/api/products/${productId}`),
        fetch(`/api/delivery-slots?productId=${productId}`)
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
        message: `La capacité ne peut pas dépasser le stock disponible (${product.stock.quantity} ${product.unit})`
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
        : [selectedDate];

      const createdSlots = await Promise.all(
        dates.map(date => 
          fetch('/api/delivery-slots', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              productId,
              date,
              maxCapacity: parseFloat(newSlotCapacity)
            })
          }).then(res => res.json())
        )
      );

      setSlots(prev => [
        ...prev,
        ...createdSlots.map(slot => ({ ...slot, date: new Date(slot.date) }))
      ]);

      setSelectedDate(null)
      setNewSlotCapacity('')
      setValidationMessages([])
      setIsRepeating(false)
      setRepeatConfig({ weeks: 1, daysOfWeek: [] })
      
      toast({
        title: "Succès",
        description: `${createdSlots.length} créneau(x) créé(s) avec succès`
      })
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de créer le(s) créneau(x)",
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

      if (!response.ok) throw new Error('Erreur lors de la mise à jour du créneau')

      const updatedSlot = await response.json()
      setSlots(prev => prev.map(s => 
        s.id === updatedSlot.id ? { ...updatedSlot, date: new Date(updatedSlot.date) } : s
      ))
      setEditingSlot(null)
      
      toast({
        title: "Succès",
        description: "Créneau mis à jour avec succès"
      })
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le créneau",
        variant: "destructive"
      })
    }
  }

  const handleDeleteSlot = async (slotId: string) => {
    try {
      const response = await fetch(`/api/delivery-slots/${slotId}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Erreur lors de la suppression du créneau')

      setSlots(prev => prev.filter(slot => slot.id !== slotId))
      toast({
        title: "Succès",
        description: "Créneau supprimé avec succès"
      })
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le créneau",
        variant: "destructive"
      })
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
                      onChange={(e) => setNewSlotCapacity(e.target.value)}
                      min="0"
                      step="0.1"
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

          {/* Liste des créneaux */}
          <div className="space-y-2">
            <h3 className="font-medium mb-2">Créneaux configurés</h3>
            {slots.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Aucun créneau défini. Sélectionnez une date pour en créer un.
              </p>
            ) : (
              slots
                .sort((a, b) => a.date.getTime() - b.date.getTime())
                .map(slot => {
                  const isPastSlot = isDateBeforeToday(slot.date);
                  
                  return (
                    <div
                      key={slot.id}
                      className={`flex items-center justify-between bg-background border border-foreground/10 rounded-lg p-4 ${
                        isPastSlot ? 'opacity-50' : ''
                      }`}
                    >
                      <div>
                        <p className="font-medium">
                          {formatDate(slot.date)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {slot.reserved} / {slot.maxCapacity} {product.unit} réservés
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {editingSlot?.id === slot.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={editingSlot.maxCapacity}
                              onChange={(e) => setEditingSlot({
                                ...editingSlot,
                                maxCapacity: parseFloat(e.target.value)
                              })}
                              min={slot.reserved}
                              step="0.1"
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