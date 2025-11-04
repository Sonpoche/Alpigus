// Chemin du fichier: components/admin/email-modal.tsx
"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { LoadingButton } from '@/components/ui/loading-button'
import { useToast } from '@/hooks/use-toast'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog'
import { Mail, X, Send } from 'lucide-react'

interface EmailModalProps {
  isOpen: boolean
  onClose: () => void
  recipientEmail: string
  recipientName: string
  defaultSubject?: string
  defaultMessage?: string
  type: 'client' | 'producer'
}

export function EmailModal({
  isOpen,
  onClose,
  recipientEmail,
  recipientName,
  defaultSubject = '',
  defaultMessage = '',
  type
}: EmailModalProps) {
  const { toast } = useToast()
  const [isSending, setIsSending] = useState(false)
  const [formData, setFormData] = useState({
    subject: defaultSubject,
    message: defaultMessage
  })

  const handleInputChange = (field: 'subject' | 'message', value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSendEmail = async () => {
    if (!formData.subject.trim() || !formData.message.trim()) {
      toast({
        title: "Champs requis",
        description: "Veuillez remplir le sujet et le message",
        variant: "destructive"
      })
      return
    }

    try {
      setIsSending(true)
      
      const response = await fetch('/api/admin/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: recipientEmail,
          toName: recipientName,
          subject: formData.subject,
          message: formData.message,
          type: type
        })
      })

      if (!response.ok) {
        throw new Error('Erreur lors de l\'envoi de l\'email')
      }

      toast({
        title: "Email envoyé",
        description: `L'email a été envoyé avec succès à ${recipientName}`,
        duration: 5000
      })

      setFormData({ subject: '', message: '' })
      onClose()

    } catch (error) {
      console.error('Erreur:', error)
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer l'email",
        variant: "destructive"
      })
    } finally {
      setIsSending(false)
    }
  }

  const handleClose = () => {
    if (!isSending) {
      setFormData({ subject: defaultSubject, message: defaultMessage })
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] bg-white border-2 border-black rounded-lg">
        <DialogHeader className="border-b-2 border-black pb-4">
          <DialogTitle className="text-2xl font-bold text-black flex items-center gap-2">
            <Mail className="h-6 w-6" />
            Envoyer un email
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            Envoyer un email à {recipientName} ({recipientEmail})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Destinataire */}
          <div className="space-y-2">
            <Label className="text-sm font-bold text-black">Destinataire</Label>
            <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-md border-2 border-gray-200">
              <Mail className="h-4 w-4 text-gray-600 flex-shrink-0" />
              <span className="text-sm font-bold text-black">{recipientName}</span>
              <span className="text-sm text-gray-600">({recipientEmail})</span>
            </div>
          </div>

          {/* Sujet */}
          <div className="space-y-2">
            <Label htmlFor="subject" className="text-sm font-bold text-black">
              Sujet <span className="text-red-600">*</span>
            </Label>
            <input
              id="subject"
              value={formData.subject}
              onChange={(e) => handleInputChange('subject', e.target.value)}
              placeholder="Objet de votre message"
              disabled={isSending}
              className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-md focus:border-black focus:outline-none disabled:opacity-50 disabled:bg-gray-100"
            />
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="message" className="text-sm font-bold text-black">
              Message <span className="text-red-600">*</span>
            </Label>
            <textarea
              id="message"
              value={formData.message}
              onChange={(e) => handleInputChange('message', e.target.value)}
              placeholder="Votre message..."
              rows={8}
              disabled={isSending}
              className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-md focus:border-black focus:outline-none resize-none disabled:opacity-50 disabled:bg-gray-100"
            />
            <div className="text-xs text-gray-600 bg-blue-50 border-2 border-blue-200 rounded-md p-2">
              L'email sera envoyé depuis l'adresse administrative de Mushroom Marketplace
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center pt-4 border-t-2 border-gray-200">
          <button
            onClick={handleClose}
            disabled={isSending}
            className="px-4 py-2.5 border-2 border-black rounded-md hover:bg-gray-100 transition-colors font-semibold disabled:opacity-50"
          >
            Annuler
          </button>
          
          <LoadingButton
            onClick={handleSendEmail}
            isLoading={isSending}
            disabled={!formData.subject.trim() || !formData.message.trim()}
            className="bg-black text-white hover:bg-gray-800 border-2 border-black px-4 py-2.5 rounded-md font-semibold flex items-center justify-center gap-2"
          >
            <Send className="h-4 w-4" />
            Envoyer l'email
          </LoadingButton>
        </div>
      </DialogContent>
    </Dialog>
  )
}