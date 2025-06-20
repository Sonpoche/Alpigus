// components/checkout/stripe-payment-form.tsx
'use client'

import { useState, useEffect } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import {
  Elements,
  CardElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js'
import { LoadingButton } from '@/components/ui/loading-button'
import { useToast } from '@/hooks/use-toast'
import { CreditCard, Shield, Lock } from 'lucide-react'

// Initialiser Stripe avec votre clé publique
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface StripePaymentFormProps {
  amount: number
  orderId: string
  onSuccess: (paymentIntent: any) => void
  onError: (error: string) => void
  isLoading?: boolean
}

// Composant du formulaire de paiement
function CheckoutForm({ amount, orderId, onSuccess, onError }: StripePaymentFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const { toast } = useToast()
  const [isProcessing, setIsProcessing] = useState(false)
  const [cardError, setCardError] = useState<string | null>(null)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    
    if (!stripe || !elements) {
      onError('Stripe n\'est pas encore chargé')
      return
    }

    const cardElement = elements.getElement(CardElement)
    if (!cardElement) {
      onError('Élément carte non trouvé')
      return
    }
    
    setIsProcessing(true)
    setCardError(null)
    
    try {
      // 1. Créer le PaymentIntent côté serveur
      const response = await fetch('/api/payment/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          amount: Math.round(amount * 100), // Convertir en centimes
          orderId
        })
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || 'Erreur lors de la création du paiement')
      }
      
      const { client_secret } = await response.json()
      
      // 2. Confirmer le paiement avec la carte
      const result = await stripe.confirmCardPayment(client_secret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            // Vous pouvez ajouter les détails de facturation ici
          }
        }
      })
      
      if (result.error) {
        // Erreur lors du paiement
        const errorMessage = result.error.message || 'Erreur de paiement inconnue'
        setCardError(errorMessage)
        onError(errorMessage)
        
        toast({
          title: "Erreur de paiement",
          description: errorMessage,
          variant: "destructive"
        })
      } else {
        // Paiement réussi
        toast({
          title: "Paiement réussi",
          description: "Votre paiement a été traité avec succès",
        })
        onSuccess(result.paymentIntent)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur de paiement'
      setCardError(errorMessage)
      onError(errorMessage)
      
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive"
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCardChange = (event: any) => {
    if (event.error) {
      setCardError(event.error.message)
    } else {
      setCardError(null)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* En-tête sécurisé */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Shield className="h-4 w-4 text-green-600" />
        <span>Paiement sécurisé par Stripe</span>
        <Lock className="h-4 w-4" />
      </div>
      
      {/* Élément carte Stripe */}
      <div className="space-y-2">
        <label className="block text-sm font-medium">
          Informations de carte
        </label>
        <div className="p-4 border border-foreground/10 rounded-lg bg-background focus-within:ring-2 focus-within:ring-custom-accent focus-within:border-custom-accent transition-all">
          <CardElement
            onChange={handleCardChange}
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: 'var(--foreground)',
                  fontFamily: '"Inter", system-ui, sans-serif',
                  fontSmoothing: 'antialiased',
                  '::placeholder': {
                    color: 'var(--muted-foreground)',
                  },
                  iconColor: 'var(--foreground)',
                },
                invalid: {
                  color: '#ef4444',
                  iconColor: '#ef4444',
                },
              },
              hidePostalCode: true,
            }}
          />
        </div>
        
        {/* Erreur de carte */}
        {cardError && (
          <p className="text-sm text-destructive flex items-center gap-2">
            <span className="text-destructive">⚠</span>
            {cardError}
          </p>
        )}
      </div>
      
      {/* Résumé du montant */}
      <div className="bg-foreground/5 p-4 rounded-lg">
        <div className="flex justify-between items-center">
          <span className="font-medium">Montant à payer:</span>
          <span className="text-lg font-bold">{amount.toFixed(2)} CHF</span>
        </div>
      </div>
      
      {/* Bouton de paiement */}
      <LoadingButton
        type="submit"
        isLoading={isProcessing}
        disabled={!stripe || isProcessing}
        className="w-full bg-custom-accent hover:bg-custom-accent/90 text-white py-3"
        icon={<CreditCard className="h-5 w-5" />}
      >
        {isProcessing ? 'Traitement en cours...' : `Payer ${amount.toFixed(2)} CHF`}
      </LoadingButton>
      
      {/* Informations de sécurité */}
      <div className="text-xs text-muted-foreground text-center space-y-1">
        <p>🔒 Vos informations de paiement sont sécurisées et cryptées</p>
        <p>Nous ne stockons aucune information de carte bancaire</p>
      </div>
    </form>
  )
}

// Composant principal avec Elements Provider
export function StripePaymentForm(props: StripePaymentFormProps) {
  const [stripeLoaded, setStripeLoaded] = useState(false)

  useEffect(() => {
    stripePromise.then((stripe) => {
      if (stripe) {
        setStripeLoaded(true)
      }
    })
  }, [])

  if (!stripeLoaded) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-custom-accent" />
        <span className="ml-2">Chargement du paiement sécurisé...</span>
      </div>
    )
  }

  return (
    <Elements stripe={stripePromise}>
      <CheckoutForm {...props} />
    </Elements>
  )
}