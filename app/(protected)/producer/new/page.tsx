'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ProductType } from '@prisma/client'
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Edit, Trash2, Plus, Package, ShoppingBag, Truck, LineChart } from 'lucide-react'
import { useToast } from "@/hooks/use-toast"
import { LoadingButton } from '@/components/ui/loading-button'
import { ImageSelector } from '@/components/ui/image-selector'
import { cn } from '@/lib/utils'

interface Category {
  id: string
  name: string
}

const productSchema = z.object({
  name: z.string()
    .min(2, "Le nom doit contenir au moins 2 caractères")
    .max(50, "Le nom ne doit pas dépasser 50 caractères"),
  description: z.string().optional(),
  price: z.coerce.number()
    .positive("Le prix doit être supérieur à 0")
    .min(0.01, "Le prix minimum est de 0.01 CHF"),
  type: z.enum(['FRESH', 'DRIED', 'SUBSTRATE', 'WELLNESS'], {
    required_error: "Veuillez sélectionner un type de produit"
  }),
  unit: z.enum(['kg', 'g'], {
    required_error: "Veuillez sélectionner une unité"
  }),
  initialStock: z.coerce.number()
    .min(0, "Le stock ne peut pas être négatif"),
  categories: z.array(z.string())
    .min(1, "Sélectionnez au moins une catégorie"),
})

type ProductFormData = z.infer<typeof productSchema>

export default function NewProductPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      unit: 'kg',
      categories: [],
    }
  })

  const selectedUnit = watch('unit')

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/categories')
        if (!response.ok) {
          throw new Error('Erreur lors du chargement des catégories')
        }
        const data = await response.json()
        setCategories(data)
      } catch (error) {
        console.error('Erreur:', error)
        toast({
          title: "Erreur",
          description: "Impossible de charger les catégories",
          variant: "destructive"
        })
      }
    }
    fetchCategories()
  }, [toast])

  // Gérer les changements de catégories
  const handleCategoryChange = (categoryId: string) => {
    const newCategories = selectedCategories.includes(categoryId)
      ? selectedCategories.filter(id => id !== categoryId)
      : [...selectedCategories, categoryId]
    
    setSelectedCategories(newCategories)
    setValue('categories', newCategories)
  }

  // Gérer la sélection d'image
  const handleImageSelection = (value: string | File | null) => {
    if (value instanceof File) {
      setImageFile(value)
      setSelectedPreset(null)
    } else {
      setSelectedPreset(value)
      setImageFile(null)
    }
  }

  // Gérer la soumission du formulaire
  const onSubmit = handleSubmit(async (data) => {
    setIsLoading(true)
    try {
      const productData = {
        ...data,
        imagePreset: selectedPreset,
      }

      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData)
      })

      if (!response.ok) throw new Error('Erreur lors de la création du produit')

      const createdProduct = await response.json()

      if (imageFile) {
        const imageFormData = new FormData()
        imageFormData.append('image', imageFile)
        
        const uploadResponse = await fetch(`/api/products/${createdProduct.id}/image`, {
          method: 'POST',
          body: imageFormData
        })

        if (!uploadResponse.ok) {
          throw new Error("Erreur lors de l'upload de l'image")
        }
      }

      toast({
        title: "Succès",
        description: "Le produit a été créé avec succès"
      })

      router.push('/producer')
      router.refresh()

    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  })

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-2xl mx-auto bg-background border border-foreground/10 rounded-lg p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-custom-title mb-6">Ajouter un produit</h1>

        <form onSubmit={onSubmit} className="space-y-6">
          {/* Nom */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-custom-title">
              Nom du produit <span className="text-custom-accent">*</span>
            </label>
            <input
              {...register('name')}
              type="text"
              id="name"
              className={cn(
                "mt-1 block w-full rounded-md border border-foreground/10 bg-background px-3 py-2",
                errors.name && "border-destructive"
              )}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-custom-title">
              Description
            </label>
            <textarea
              {...register('description')}
              id="description"
              rows={4}
              className="mt-1 block w-full rounded-md border border-foreground/10 bg-background px-3 py-2"
            />
            {errors.description && (
              <p className="mt-1 text-sm text-destructive">{errors.description.message}</p>
            )}
          </div>

          {/* Prix et Unité */}
          <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="price" className="block text-sm font-medium text-custom-title">
              Prix par {selectedUnit} (CHF) <span className="text-custom-accent">*</span>
            </label>
            <input
              {...register('price')}
              type="number"
              id="price"
              step="0.01"
              min="0"
              className={cn(
                "mt-1 block w-full rounded-md border border-foreground/10 bg-background px-3 py-2",
                errors.price && "border-destructive"
              )}
            />
            {errors.price && (
              <p className="mt-1 text-sm text-destructive">{errors.price.message}</p>
            )}
          </div>
            <div>
              <label htmlFor="unit" className="block text-sm font-medium text-custom-title">
                Unité <span className="text-custom-accent">*</span>
              </label>
              <select
                {...register('unit')}
                id="unit"
                className={cn(
                  "mt-1 block w-full rounded-md border border-foreground/10 bg-background px-3 py-2",
                  errors.unit && "border-destructive"
                )}
              >
                <option value="kg">Kilogramme (kg)</option>
                <option value="g">Gramme (g)</option>
              </select>
              {errors.unit && (
                <p className="mt-1 text-sm text-destructive">{errors.unit.message}</p>
              )}
            </div>
          </div>

          {/* Type de produit */}
          <div>
            <label className="block text-sm font-medium text-custom-title mb-2">
              Type de produit <span className="text-custom-accent">*</span>
            </label>
            <div className="grid grid-cols-2 gap-4">
              {Object.values(ProductType).map((type) => (
                <label key={type} className="flex items-center space-x-2">
                  <input
                    {...register('type')}
                    type="radio"
                    value={type}
                    className="border-foreground/10 text-custom-accent focus:ring-custom-accent"
                  />
                  <span className="text-custom-text">{type}</span>
                </label>
              ))}
            </div>
            {errors.type && (
              <p className="mt-1 text-sm text-destructive">{errors.type.message}</p>
            )}
          </div>

          {/* Catégories */}
          <div>
            <label className="block text-sm font-medium text-custom-title mb-2">
              Catégories <span className="text-custom-accent">*</span>
            </label>
            <div className={cn(
              "grid grid-cols-2 gap-4 p-4 border rounded-md",
              errors.categories ? "border-destructive" : "border-foreground/10"
            )}>
              {categories.map((category) => (
                <label key={category.id} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(category.id)}
                    onChange={() => handleCategoryChange(category.id)}
                    className="border-foreground/10 text-custom-accent focus:ring-custom-accent rounded"
                  />
                  <span className="text-custom-text">{category.name}</span>
                </label>
              ))}
            </div>
            {errors.categories && (
              <p className="mt-1 text-sm text-destructive">{errors.categories.message}</p>
            )}
          </div>

          {/* Stock initial */}
          <div>
            <label htmlFor="initialStock" className="block text-sm font-medium text-custom-title">
              Stock initial <span className="text-custom-accent">*</span>
            </label>
            <div className="relative mt-1">
              <input
                {...register('initialStock')}
                type="number"
                id="initialStock"
                min="0"
                step={selectedUnit === 'kg' ? "0.01" : "1"}
                className={cn(
                  "block w-full rounded-md border border-foreground/10 bg-background px-3 py-2 pr-12",
                  errors.initialStock && "border-destructive"
                )}
              />
              <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-foreground/60">
                {selectedUnit}
              </div>
            </div>
            {errors.initialStock && (
              <p className="mt-1 text-sm text-destructive">{errors.initialStock.message}</p>
            )}
          </div>

          {/* Image */}
          <div>
            <label className="block text-sm font-medium text-custom-title mb-2">
              Image du produit
            </label>
            <ImageSelector
              onSelectImage={handleImageSelection}
              selectedPreset={selectedPreset}
            />
          </div>

          {/* Boutons */}
          <div className="flex gap-4">
            <LoadingButton type="submit" isLoading={isLoading}>
              Créer le produit
            </LoadingButton>
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 border border-foreground/10 rounded-md hover:bg-foreground/5 transition-colors text-custom-text"
            >
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}