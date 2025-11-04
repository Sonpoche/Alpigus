// Chemin du fichier: components/admin/category-management.tsx
'use client'

import { useState, useEffect } from 'react'
import { PlusCircle, Pencil, Trash2, Tag } from 'lucide-react'
import { useToast } from "@/hooks/use-toast"
import { LoadingButton } from '@/components/ui/loading-button'
import { DeleteConfirmationModal } from '@/components/ui/delete-confirmation-modal'

interface Category {
  id: string
  name: string
  _count?: {
    products: number
  }
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
      setCategories(data.categories || data)
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-black flex items-center gap-3">
            <Tag className="h-8 w-8" />
            Gestion des catégories
          </h1>
          <p className="mt-2 text-gray-600">
            {categories.length} catégorie{categories.length > 1 ? 's' : ''} enregistrée{categories.length > 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Formulaire de création */}
      <div className="bg-white border-2 border-black rounded-lg p-6">
        <h2 className="text-xl font-bold text-black mb-4">Ajouter une nouvelle catégorie</h2>
        <form onSubmit={handleCreate} className="flex gap-4">
          <input
            type="text"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="Nom de la catégorie..."
            className="flex-1 rounded-md border-2 border-gray-300 bg-white px-4 py-2 focus:border-black focus:outline-none"
          />
          <LoadingButton 
            type="submit" 
            isLoading={isCreating} 
            disabled={!newCategoryName.trim()}
            className="bg-black text-white hover:bg-gray-800 border-2 border-black px-6 py-2 rounded-md font-semibold flex items-center gap-2"
          >
            <PlusCircle className="h-5 w-5" />
            Créer
          </LoadingButton>
        </form>
      </div>

      {/* Liste des catégories */}
      <div className="bg-white border-2 border-black rounded-lg overflow-hidden">
        {categories.length === 0 ? (
          <div className="text-center py-12">
            <Tag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 font-medium">Aucune catégorie enregistrée</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-black bg-gray-50">
                <th className="text-left px-6 py-4 text-sm font-bold text-black">Nom</th>
                <th className="text-center px-6 py-4 text-sm font-bold text-black">Produits</th>
                <th className="text-right px-6 py-4 text-sm font-bold text-black">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {categories.map((category) => (
                <tr key={category.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    {editingCategory?.id === category.id ? (
                      <form onSubmit={handleEdit} className="flex gap-2">
                        <input
                          type="text"
                          value={editingCategory.name}
                          onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                          className="rounded-md border-2 border-gray-300 bg-white px-3 py-1 focus:border-black focus:outline-none"
                          autoFocus
                        />
                        <button
                          type="submit"
                          className="text-black hover:text-gray-600 text-sm font-semibold"
                        >
                          Sauvegarder
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingCategory(null)}
                          className="text-gray-600 hover:text-black text-sm font-semibold"
                        >
                          Annuler
                        </button>
                      </form>
                    ) : (
                      <span className="font-semibold text-black">{category.name}</span>
                    )}
                  </td>
                  <td className="text-center px-6 py-4">
                    <span className="inline-flex items-center justify-center w-8 h-8 bg-gray-100 text-black font-bold rounded-full border-2 border-gray-300">
                      {category._count?.products || 0}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setEditingCategory({ id: category.id, name: category.name })}
                        className="p-2 hover:bg-gray-100 rounded-md transition-colors border-2 border-black"
                        title="Modifier"
                      >
                        <Pencil className="h-4 w-4 text-black" />
                      </button>
                      <button
                        onClick={() => {
                          setCategoryToDelete(category)
                          setIsDeleteModalOpen(true)
                        }}
                        className="p-2 hover:bg-red-50 rounded-md transition-colors border-2 border-red-600"
                        title="Supprimer"
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
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