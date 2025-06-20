// components/checkout/bank-transfer-form.tsx
'use client'

import { useState } from 'react'
import { LoadingButton } from '@/components/ui/loading-button'
import { useToast } from '@/hooks/use-toast'
import { Copy, Building, Check, AlertCircle } from 'lucide-react'

interface BankTransferFormProps {
  amount: number
  orderId: string
  onConfirm: () => void
  isLoading?: boolean
}

export function BankTransferForm({ amount, orderId, onConfirm, isLoading }: BankTransferFormProps) {
  const { toast } = useToast()
  const [copiedFields, setCopiedFields] = useState<Record<string, boolean>>({})

  // Informations bancaires de votre entreprise (à personnaliser)
  const bankDetails = {
    beneficiary: 'Mushroom Marketplace Sàrl',
    iban: 'CH93 0076 2011 6238 5295 7', // Exemple - remplacez par votre IBAN
    bic: 'UBSWCHZH80A', // Exemple - remplacez par votre BIC
    bank: 'UBS Switzerland AG',
    reference: `COMM-${orderId.substring(0, 8).toUpperCase()}`
  }

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedFields({ ...copiedFields, [field]: true })
      
      toast({
        title: "Copié !",
        description: `${field} copié dans le presse-papiers`,
      })
      
      // Réinitialiser l'état de copie après 2 secondes
      setTimeout(() => {
        setCopiedFields(prev => ({ ...prev, [field]: false }))
      }, 2000)
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de copier dans le presse-papiers",
        variant: "destructive"
      })
    }
  }

  const CopyButton = ({ text, field, label }: { text: string, field: string, label: string }) => (
    <button
      type="button"
      onClick={() => copyToClipboard(text, field)}
      className="ml-2 p-1 rounded-md hover:bg-foreground/5 transition-colors group"
      title={`Copier ${label}`}
    >
      {copiedFields[field] ? (
        <Check className="h-4 w-4 text-green-600" />
      ) : (
        <Copy className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
      )}
    </button>
  )

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center gap-2 text-center">
        <Building className="h-5 w-5 text-blue-600" />
        <h3 className="font-medium">Paiement par virement bancaire</h3>
      </div>

      {/* Alerte importante */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="space-y-2">
            <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
              Instructions importantes
            </p>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <li>• Effectuez le virement dans les 5 jours ouvrables</li>
              <li>• Mentionnez obligatoirement la référence de commande</li>
              <li>• Votre commande sera traitée après réception du paiement</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Informations bancaires */}
      <div className="bg-background border border-foreground/10 rounded-lg p-6 space-y-4">
        <h4 className="font-medium text-foreground mb-4">Détails du virement</h4>
        
        <div className="space-y-3">
          {/* Bénéficiaire */}
          <div className="flex justify-between items-center py-2 border-b border-foreground/5">
            <span className="text-sm text-muted-foreground">Bénéficiaire:</span>
            <div className="flex items-center">
              <span className="font-mono text-sm">{bankDetails.beneficiary}</span>
              <CopyButton text={bankDetails.beneficiary} field="beneficiary" label="Bénéficiaire" />
            </div>
          </div>

          {/* IBAN */}
          <div className="flex justify-between items-center py-2 border-b border-foreground/5">
            <span className="text-sm text-muted-foreground">IBAN:</span>
            <div className="flex items-center">
              <span className="font-mono text-sm font-medium">{bankDetails.iban}</span>
              <CopyButton text={bankDetails.iban} field="iban" label="IBAN" />
            </div>
          </div>

          {/* BIC */}
          <div className="flex justify-between items-center py-2 border-b border-foreground/5">
            <span className="text-sm text-muted-foreground">BIC/SWIFT:</span>
            <div className="flex items-center">
              <span className="font-mono text-sm">{bankDetails.bic}</span>
              <CopyButton text={bankDetails.bic} field="bic" label="BIC" />
            </div>
          </div>

          {/* Banque */}
          <div className="flex justify-between items-center py-2 border-b border-foreground/5">
            <span className="text-sm text-muted-foreground">Banque:</span>
            <div className="flex items-center">
              <span className="text-sm">{bankDetails.bank}</span>
              <CopyButton text={bankDetails.bank} field="bank" label="Banque" />
            </div>
          </div>

          {/* Montant */}
          <div className="flex justify-between items-center py-2 border-b border-foreground/5">
            <span className="text-sm text-muted-foreground">Montant:</span>
            <div className="flex items-center">
              <span className="font-bold text-lg">{amount.toFixed(2)} CHF</span>
              <CopyButton text={amount.toFixed(2)} field="amount" label="Montant" />
            </div>
          </div>

          {/* Référence - Important */}
          <div className="flex justify-between items-center py-2 bg-yellow-50 dark:bg-yellow-900/20 -m-2 p-4 rounded-md">
            <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              Référence obligatoire:
            </span>
            <div className="flex items-center">
              <span className="font-mono text-sm font-bold text-yellow-900 dark:text-yellow-100">
                {bankDetails.reference}
              </span>
              <CopyButton text={bankDetails.reference} field="reference" label="Référence" />
            </div>
          </div>
        </div>
      </div>

      {/* Résumé de commande */}
      <div className="bg-foreground/5 p-4 rounded-lg">
        <div className="flex justify-between items-center">
          <span className="font-medium">Total à virer:</span>
          <span className="text-xl font-bold text-custom-accent">{amount.toFixed(2)} CHF</span>
        </div>
      </div>

      {/* Bouton de confirmation */}
      <div className="space-y-3">
        <LoadingButton
          onClick={onConfirm}
          isLoading={isLoading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3"
          icon={<Building className="h-5 w-5" />}
        >
          J'ai effectué le virement
        </LoadingButton>
        
        <p className="text-xs text-muted-foreground text-center">
          En cliquant sur ce bouton, vous confirmez avoir initié le virement bancaire.<br/>
          Votre commande sera traitée dès réception du paiement.
        </p>
      </div>

      {/* Aide */}
      <div className="bg-muted/30 p-4 rounded-lg">
        <h5 className="font-medium text-sm mb-2">Besoin d'aide ?</h5>
        <p className="text-xs text-muted-foreground">
          Si vous rencontrez des difficultés avec le virement, contactez-nous à{' '}
          <a href="mailto:support@mushroom-marketplace.com" className="text-custom-accent hover:underline">
            support@mushroom-marketplace.com
          </a>
        </p>
      </div>
    </div>
  )
}