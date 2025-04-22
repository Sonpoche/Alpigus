// components/stock/stock-alert-config.tsx
import { useState, useEffect } from 'react'
import { useToast } from '@/hooks/use-toast'
import { LoadingButton } from '@/components/ui/loading-button'
import { cn } from '@/lib/utils'

interface StockAlertConfigProps {
  productId: string
}

export default function StockAlertConfig({ productId }: StockAlertConfigProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [threshold, setThreshold] = useState<number>(0)
  const [isPercentage, setIsPercentage] = useState(false)
  const [emailEnabled, setEmailEnabled] = useState(true)

  useEffect(() => {
    const fetchAlertConfig = async () => {
      try {
        setIsLoading(true)
        const response = await fetch(`/api/products/${productId}/alerts`)
        if (!response.ok) throw new Error("Erreur lors du chargement de la configuration")
        
        const data = await response.json()
        if (data) {
          setThreshold(data.threshold || 0)
          setIsPercentage(data.percentage || false)
          setEmailEnabled(data.emailAlert !== false)
        }
      } catch (error) {
        console.error("Erreur:", error)
        toast({
          title: "Erreur",
          description: "Impossible de charger la configuration des alertes",
          variant: "destructive"
        })
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchAlertConfig()
  }, [productId, toast])

  const saveConfig = async () => {
    try {
      setIsSaving(true)
      
      const response = await fetch(`/api/products/${productId}/alerts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          threshold,
          percentage: isPercentage,
          emailAlert: emailEnabled
        })
      })
      
      if (!response.ok) throw new Error("Erreur lors de l'enregistrement")
      
      toast({
        title: "Configuration sauvegardée",
        description: "Les paramètres d'alerte ont été mis à jour"
      })
    } catch (error) {
      console.error("Erreur:", error)
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder la configuration",
        variant: "destructive"
      })
    } finally {
      setIsSaving(false)
    }
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
      <h2 className="text-xl font-semibold mb-4">Configuration des alertes de stock</h2>
      
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-1">
            Seuil d'alerte
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={threshold}
              onChange={(e) => setThreshold(parseFloat(e.target.value) || 0)}
              min="0"
              step={isPercentage ? "1" : "0.1"}
              className="block w-full rounded-md border border-foreground/10 bg-background px-3 py-2"
            />
            <select
              value={isPercentage ? "percent" : "absolute"}
              onChange={(e) => setIsPercentage(e.target.value === "percent")}
              className="rounded-md border border-foreground/10 bg-background px-3 py-2"
            >
              <option value="absolute">Quantité</option>
              <option value="percent">Pourcentage</option>
            </select>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {isPercentage 
              ? "Alerte quand le stock descend sous ce pourcentage du niveau habituel" 
              : "Alerte quand le stock descend sous cette quantité"}
          </p>
        </div>
        
        <div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={emailEnabled}
              onChange={(e) => setEmailEnabled(e.target.checked)}
              className="rounded border-foreground/10"
            />
            <span>Recevoir des alertes par email</span>
          </label>
        </div>
        
        <LoadingButton
          onClick={saveConfig}
          isLoading={isSaving}
          className="w-full"
        >
          Enregistrer la configuration
        </LoadingButton>
      </div>
    </div>
  )
}