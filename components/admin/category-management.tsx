'use client'

import { useState, useEffect } from 'react'
import { PlusCircle, Pencil, Trash2 } from 'lucide-react'
import { useToast } from "@/hooks/use-toast"
import { LoadingButton } from '@/components/ui/loading-button'
import { DeleteConfirmationModal } from '@/components/ui/delete-confirmation-modal'

interface Category {
  id: string
  name: string
  products: any[]
}

export default function CategoryManagement() {
  const { toast } = useToast()
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [editingCategory, setEditingCategory] = useState<{ id: string, name: string } | null>(null)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories')
      if (!response.ok) throw new Error('Erreur lors du chargement des catégories')
      const data = await response.json()
      setCategories(data)
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les catégories",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!newCategoryName.trim()) return

    setIsCreating(true)
    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCategoryName.trim() })
      })

      if (!response.ok) throw new Error('Erreur lors de la création')

      await fetchCategories()
      setNewCategoryName('')
      toast({
        title: "Succès",
        description: "Catégorie créée avec succès"
      })
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de créer la catégorie",
        variant: "destructive"
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editingCategory || !editingCategory.name.trim()) return

    try {
      const response = await fetch(`/api/categories/${editingCategory.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editingCategory.name.trim() })
      })

      if (!response.ok) throw new Error('Erreur lors de la modification')

      await fetchCategories()
      setEditingCategory(null)
      toast({
        title: "Succès",
        description: "Catégorie modifiée avec succès"
      })
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de modifier la catégorie",
        variant: "destructive"
      })
    }
  }

  const handleDelete = async () => {
    if (!categoryToDelete) return
    setIsDeleting(true)

    try {
      const response = await fetch(`/api/categories/${categoryToDelete.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Erreur lors de la suppression')

      await fetchCategories()
      toast({
        title: "Succès",
        description: "Catégorie supprimée avec succès"
      })
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la catégorie",
        variant: "destructive"
      })
    } finally {
      setIsDeleting(false)
      setIsDeleteModalOpen(false)
      setCategoryToDelete(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-custom-accent" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold font-montserrat text-title mb-8">
        Gestion des catégories
      </h1>

      {/* Formulaire de création */}
      <form onSubmit={handleCreate} className="mb-8">
        <div className="flex gap-4">
          <input
            type="text"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="Nouvelle catégorie..."
            className="flex-1 rounded-md border border-foreground/10 bg-background px-3 py-2"
          />
          <LoadingButton type="submit" isLoading={isCreating} disabled={!newCategoryName.trim()}>
            <PlusCircle className="h-5 w-5 mr-2" />
            Créer
          </LoadingButton>
        </div>
      </form>

      {/* Liste des catégories */}
      <div className="bg-background border border-foreground/10 rounded-lg shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-foreground/10">
              <th className="text-left px-6 py-3 text-sm font-semibold text-foreground/60">Nom</th>
              <th className="text-center px-6 py-3 text-sm font-semibold text-foreground/60">Produits</th>
              <th className="text-right px-6 py-3 text-sm font-semibold text-foreground/60">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-foreground/10">
            {categories.map((category) => (
              <tr key={category.id}>
                <td className="px-6 py-4">
                  {editingCategory?.id === category.id ? (
                    <form onSubmit={handleEdit} className="flex gap-2">
                      <input
                        type="text"
                        value={editingCategory.name}
                        onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                        className="rounded-md border border-foreground/10 bg-background px-3 py-1"
                        autoFocus
                      />
                      <button
                        type="submit"
                        className="text-custom-accent hover:opacity-80 text-sm"
                      >
                        Sauvegarder
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingCategory(null)}
                        className="text-muted-foreground hover:text-foreground text-sm"
                      >
                        Annuler
                      </button>
                    </form>
                  ) : (
                    <span className="text-custom-text">{category.name}</span>
                  )}
                </td>
                <td className="text-center px-6 py-4 text-custom-text">
                  {category.products.length}
                </td>
                <td className="px-6 py-4">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setEditingCategory({ id: category.id, name: category.name })}
                      className="p-2 hover:bg-foreground/5 rounded-md transition-colors"
                    >
                      <Pencil className="h-4 w-4 text-custom-text hover:text-custom-accent" />
                    </button>
                    <button
                      onClick={() => {
                        setCategoryToDelete(category)
                        setIsDeleteModalOpen(true)
                      }}
                      className="p-2 hover:bg-foreground/5 rounded-md transition-colors"
                    >
                      <Trash2 className="h-4 w-4 text-custom-text hover:text-destructive" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal de confirmation de suppression */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false)
          setCategoryToDelete(null)
        }}
        onConfirm={handleDelete}
        productName={categoryToDelete?.name ?? ''}
        isLoading={isDeleting}
      />
    </div>
  )
}