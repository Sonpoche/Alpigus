// components/admin/user-delete-confirm-modal.tsx
'use client'

import { useState } from 'react'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogFooter,
  DialogTitle,
  DialogDescription
} from '@/components/ui/simple-dialog'
import { LoadingButton } from '@/components/ui/loading-button'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'

interface UserDeleteConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  userName: string
}

export function UserDeleteConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm,
  userName
}: UserDeleteConfirmModalProps) {
  const [isDeleting, setIsDeleting] = useState(false)

  const handleConfirm = async () => {
    setIsDeleting(true)
    try {
      await onConfirm()
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-destructive flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Confirmation de suppression
          </DialogTitle>
          <DialogDescription>
            Êtes-vous sûr de vouloir supprimer l'utilisateur <span className="font-medium">"{userName}"</span> ?
            <br />
            Cette action est irréversible et supprimera toutes les données associées à cet utilisateur.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isDeleting}>
            Annuler
          </Button>
          <LoadingButton 
            variant="destructive" 
            isLoading={isDeleting}
            onClick={handleConfirm}
          >
            Supprimer l'utilisateur
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}