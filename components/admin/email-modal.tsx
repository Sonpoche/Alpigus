// components/admin/email-modal.tsx

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

      // Réinitialiser le formulaire et fermer la modal
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
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-custom-accent" />
            Envoyer un email
          </DialogTitle>
          <DialogDescription>
            Envoyer un email à {recipientName} ({recipientEmail})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Destinataire (lecture seule) */}
          <div className="space-y-2">
            <Label htmlFor="recipient">Destinataire</Label>
            <div className="flex items-center space-x-2 p-3 bg-muted/30 rounded-md">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{recipientName}</span>
              <span className="text-sm text-muted-foreground">({recipientEmail})</span>
            </div>
          </div>

          {/* Sujet */}
          <div className="space-y-2">
            <Label htmlFor="subject">Sujet *</Label>
            <Input
              id="subject"
              value={formData.subject}
              onChange={(e) => handleInputChange('subject', e.target.value)}
              placeholder="Objet de votre message"
              disabled={isSending}
              className="form-input"
            />
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="message">Message *</Label>
            <Textarea
              id="message"
              value={formData.message}
              onChange={(e) => handleInputChange('message', e.target.value)}
              placeholder="Votre message..."
              rows={8}
              disabled={isSending}
              className="form-textarea resize-none"
            />
            <div className="text-xs text-muted-foreground">
              L'email sera envoyé depuis l'adresse administrative de Mushroom Marketplace
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSending}
          >
            Annuler
          </Button>
          
          <LoadingButton
            onClick={handleSendEmail}
            isLoading={isSending}
            disabled={!formData.subject.trim() || !formData.message.trim()}
            icon={<Send className="h-4 w-4" />}
          >
            Envoyer l'email
          </LoadingButton>
        </div>
      </DialogContent>
    </Dialog>
  )
}