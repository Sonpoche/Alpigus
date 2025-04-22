// components/stock/production-schedule.tsx
import { useState, useEffect } from 'react'
import { useToast } from '@/hooks/use-toast'
import { Calendar } from '@/components/ui/calendar'
import { LoadingButton } from '@/components/ui/loading-button'
import { PlusCircle, Calendar as CalendarIcon, Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDateToFrench } from '@/lib/date-utils'

interface ProductionScheduleProps {
  productId: string
  productUnit: string
}

interface ScheduleEntry {
  id: string
  date: string
  quantity: number
  note: string | null
  isPublic: boolean
}

export default function ProductionSchedule({ productId, productUnit }: ProductionScheduleProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([])
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [quantity, setQuantity] = useState<string>('0')
  const [note, setNote] = useState<string>('')
  const [isPublic, setIsPublic] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)

  useEffect(() => {
    const fetchSchedule = async () => {
      try {
        setIsLoading(true)
        const response = await fetch(`/api/products/${productId}/production-schedule`)
        if (!response.ok) throw new Error("Erreur lors du chargement du calendrier")
        
        const data = await response.json()
        setSchedule(data)
      } catch (error) {
        console.error("Erreur:", error)
        toast({
          title: "Erreur",
          description: "Impossible de charger le calendrier de production",
          variant: "destructive"
        })
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchSchedule()
  }, [productId, toast])

  const addToSchedule = async () => {
    if (!selectedDate || parseFloat(quantity) <= 0) return;
    
    try {
      setIsAdding(true)
      
      const response = await fetch(`/api/products/${productId}/production-schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate.toISOString(),
          quantity: parseFloat(quantity),
          note: note || undefined,
          isPublic
        })
      })
      
      if (!response.ok) throw new Error("Erreur lors de l'ajout au calendrier")
      
      const newEntry = await response.json()
      
      setSchedule(prev => [...prev, newEntry])
      setShowAddForm(false)
      setSelectedDate(null)
      setQuantity('0')
      setNote('')
      
      toast({
        title: "Production planifiée",
        description: "La production a été ajoutée au calendrier"
      })
    } catch (error) {
      console.error("Erreur:", error)
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter au calendrier",
        variant: "destructive"
      })
    } finally {
      setIsAdding(false)
    }
  }

  const getScheduledDates = () => {
    if (!schedule.length) return [];
    return schedule.map(entry => new Date(entry.date));
  }

  if (isLoading) {
    return (
      <div className="p-4 flex justify-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-custom-accent" />
      </div>
    )
  }

  return (
    <div className="bg-background border border-foreground/10 rounded-lg p-6 shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Calendrier de production</h2>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1 text-sm font-medium text-custom-accent hover:opacity-80"
        >
          <PlusCircle className="h-4 w-4" />
          {showAddForm ? "Annuler" : "Planifier une production"}
        </button>
      </div>
      
      {showAddForm && (
        <div className="mb-6 bg-foreground/5 p-4 rounded-lg">
          <h3 className="font-medium mb-4">Nouvelle production</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-1">
                Date de disponibilité
              </label>
              <div className="border border-foreground/10 rounded-lg overflow-hidden">
                <Calendar
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  showLegend={false}
                  bookedDates={getScheduledDates()}
                  disabled={(date) => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    return date < today;
                  }}
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="quantity" className="block text-sm font-medium mb-1">
                  Quantité ({productUnit})
                </label>
                <input
                  type="number"
                  id="quantity"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  min="0.1"
                  step="0.1"
                  className="block w-full rounded-md border border-foreground/10 bg-background px-3 py-2"
                />
              </div>
              
              <div>
                <label htmlFor="note" className="block text-sm font-medium mb-1">
                  Note (optionnelle)
                </label>
                <textarea
                  id="note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  className="block w-full rounded-md border border-foreground/10 bg-background px-3 py-2"
                  placeholder="Détails ou information sur cette production..."
                />
              </div>
              
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                    className="rounded border-foreground/10"
                  />
                  <span className="flex items-center gap-1">
                    Visible par les clients
                    {isPublic ? (
                      <Eye className="h-4 w-4 text-green-500" />
                    ) : (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    )}
                  </span>
                </label>
                <p className="text-xs text-muted-foreground mt-1 ml-6">
                  Les clients pourront voir cette production planifiée
                </p>
              </div>
              
              <LoadingButton
                onClick={addToSchedule}
                isLoading={isAdding}
                disabled={!selectedDate || parseFloat(quantity) <= 0}
                className="w-full mt-2"
              >
                Ajouter au calendrier
              </LoadingButton>
            </div>
          </div>
        </div>
      )}
      
      <div>
        <h3 className="font-medium mb-4">Productions planifiées</h3>
        
        {schedule.length === 0 ? (
          <div className="text-center py-12 bg-foreground/5 rounded-lg">
            <CalendarIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Aucune production planifiée</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="mt-4 text-custom-accent hover:opacity-80"
            >
              Planifier maintenant
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {schedule
              .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
              .map(entry => (
                <div 
                  key={entry.id}
                  className="flex items-center justify-between p-4 border border-foreground/10 rounded-lg hover:bg-foreground/5 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="min-w-24 font-medium">
                      {formatDateToFrench(new Date(entry.date))}
                    </div>
                    <div>
                      <p className="font-medium">{entry.quantity} {productUnit}</p>
                      {entry.note && (
                        <p className="text-sm text-muted-foreground">{entry.note}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {entry.isPublic ? (
                      <span className="flex items-center text-xs text-green-600 dark:text-green-500">
                        <Eye className="h-3 w-3 mr-1" />
                        Public
                      </span>
                    ) : (
                      <span className="flex items-center text-xs text-muted-foreground">
                        <EyeOff className="h-3 w-3 mr-1" />
                        Privé
                      </span>
                    )}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  )
}