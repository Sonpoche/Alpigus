// app/(protected)/invoices/payment-success/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, Download, Receipt, ArrowLeft, Home, FileText } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { LoadingButton } from '@/components/ui/loading-button'
import { formatPriceSimple } from '@/lib/number-utils'

interface Invoice {
  id: string
  invoiceNumber: string
  amount: number
  status: string
  paidAt: string | null
  paymentMethod: string | null
  dueDate: string
  order: {
    id: string
    createdAt: string
  }
}

export default function InvoicePaymentSuccessPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { toast } = useToast()
  
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDownloading, setIsDownloading] = useState(false)
  
  const invoiceId = searchParams.get('invoice_id')
  const paymentMethod = searchParams.get('payment_method')
  const amount = searchParams.get('amount')

  useEffect(() => {
    if (!invoiceId) {
      router.push('/invoices')
      return
    }
    
    fetchInvoiceDetails()
  }, [invoiceId])

  const fetchInvoiceDetails = async () => {
    if (!invoiceId) return
    
    try {
      const response = await fetch(`/api/invoices/${invoiceId}`)
      if (!response.ok) throw new Error('Facture non trouvée')
      
      const invoiceData = await response.json()
      setInvoice(invoiceData)
    } catch (error) {
      console.error('Erreur:', error)
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les détails de la facture',
        variant: 'destructive'
      })
      router.push('/invoices')
    } finally {
      setIsLoading(false)
    }
  }

  const downloadInvoice = async () => {
    if (!invoiceId) return
    
    try {
      setIsDownloading(true)
      
      const response = await fetch(`/api/invoices/${invoiceId}/download`)
      if (!response.ok) throw new Error('Erreur lors de la génération')
      
      const html = await response.text()
      const newWindow = window.open('', '_blank')
      if (newWindow) {
        newWindow.document.write(html)
        newWindow.document.close()
      }
      
      toast({
        title: '📄 Facture téléchargée',
        description: 'Votre facture s\'ouvre dans un nouvel onglet',
        duration: 3000,
      })
    } catch (error) {
      console.error('Erreur:', error)
      toast({
        title: 'Erreur',
        description: 'Impossible de télécharger la facture',
        variant: 'destructive'
      })
    } finally {
      setIsDownloading(false)
    }
  }

  const getPaymentMethodLabel = (method: string | null) => {
    switch (method) {
      case 'card': return 'Carte bancaire'
      case 'bank_transfer': return 'Virement bancaire'
      case 'invoice': return 'Facture'
      default: return 'Paiement'
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-custom-accent" />
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Facture non trouvée</h1>
        <Link 
          href="/invoices"
          className="inline-flex items-center text-custom-accent hover:underline"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Retour aux factures
        </Link>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      {/* Header de succès */}
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
        </div>
        
        <h1 className="text-3xl font-bold text-green-600 mb-2">
          Paiement confirmé !
        </h1>
        
        <p className="text-muted-foreground text-lg">
          Votre facture a été payée avec succès
        </p>
      </div>

      {/* Détails du paiement */}
      <div className="bg-background border border-foreground/10 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <Receipt className="h-5 w-5 mr-2 text-custom-accent" />
          Détails du paiement
        </h2>
        
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Facture :</span>
            <span className="font-medium">#{invoice.invoiceNumber}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-muted-foreground">Montant payé :</span>
            <span className="font-bold text-lg text-custom-accent">
              {formatPriceSimple(invoice.amount)} CHF
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-muted-foreground">Méthode de paiement :</span>
            <span className="font-medium">
              {getPaymentMethodLabel(paymentMethod || invoice.paymentMethod)}
            </span>
          </div>
          
          {invoice.paidAt && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Date de paiement :</span>
              <span className="font-medium">
                {new Date(invoice.paidAt).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
          )}
          
          <div className="flex justify-between">
            <span className="text-muted-foreground">Commande associée :</span>
            <span className="font-medium">
              #{invoice.order.id.substring(0, 8).toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      {/* Informations importantes */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 mb-6">
        <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
          📧 Confirmation par email
        </h3>
        <p className="text-blue-700 dark:text-blue-300 text-sm">
          Un email de confirmation avec les détails du paiement vous a été envoyé. 
          Vous pouvez également télécharger votre facture ci-dessous.
        </p>
      </div>

      {/* Actions */}
      <div className="space-y-4">
        {/* Télécharger la facture */}
        <LoadingButton
          onClick={downloadInvoice}
          isLoading={isDownloading}
          className="w-full bg-custom-accent text-white hover:bg-custom-accentHover"
        >
          <Download className="h-4 w-4 mr-2" />
          Télécharger la facture
        </LoadingButton>

        {/* Navigation */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/invoices"
            className="flex-1 flex items-center justify-center gap-2 py-2 px-4 border border-foreground/10 rounded-md hover:bg-foreground/5 transition-colors text-center"
          >
            <FileText className="h-4 w-4" />
            Mes factures
          </Link>
          
          <Link
            href="/dashboard"
            className="flex-1 flex items-center justify-center gap-2 py-2 px-4 border border-foreground/10 rounded-md hover:bg-foreground/5 transition-colors text-center"
          >
            <Home className="h-4 w-4" />
            Tableau de bord
          </Link>
        </div>
      </div>

      {/* Message de remerciement */}
      <div className="text-center mt-8 p-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
        <h3 className="font-semibold text-green-800 dark:text-green-200 mb-2">
          🙏 Merci pour votre paiement !
        </h3>
        <p className="text-green-700 dark:text-green-300 text-sm">
          Votre paiement contribue au développement de notre plateforme et au soutien de nos producteurs locaux.
        </p>
      </div>
    </div>
  )
}