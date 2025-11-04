// Chemin du fichier: components/admin/user-delete-confirm-modal.tsx
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
import { Trash2, AlertTriangle } from 'lucide-react'

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
      <DialogContent className="sm:max-w-md bg-white border-2 border-red-600 rounded-lg">
        <DialogHeader className="border-b-2 border-red-600 pb-4">
          <DialogTitle className="text-2xl font-bold text-red-600 flex items-center gap-2">
            <AlertTriangle className="h-6 w-6" />
            Confirmation de suppression
          </DialogTitle>
          <DialogDescription className="text-gray-700">
            Êtes-vous sûr de vouloir supprimer l'utilisateur <span className="font-bold text-black">"{userName}"</span> ?
            <br />
            <span className="text-red-600 font-medium">Cette action est irréversible</span> et supprimera toutes les données associées à cet utilisateur.
          </DialogDescription>
        </DialogHeader>
        
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 my-4">
          <div className="flex items-start gap-3">
            <Trash2 className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-800">
              <p className="font-bold mb-1">Données qui seront supprimées :</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Informations personnelles</li>
                <li>Historique d'activité</li>
                <li>Données associées</li>
              </ul>
            </div>
          </div>
        </div>
        
        <DialogFooter className="flex gap-3">
          <button 
            onClick={onClose} 
            disabled={isDeleting}
            className="flex-1 px-4 py-2.5 border-2 border-black rounded-md hover:bg-gray-100 transition-colors font-semibold disabled:opacity-50"
          >
            Annuler
          </button>
          <LoadingButton 
            isLoading={isDeleting}
            onClick={handleConfirm}
            className="flex-1 bg-red-600 text-white hover:bg-red-700 border-2 border-red-600 px-4 py-2.5 rounded-md font-semibold flex items-center justify-center gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Supprimer l'utilisateur
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}