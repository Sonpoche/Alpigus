'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ProductType } from '@prisma/client'
import { useToast } from "@/hooks/use-toast"
import { LoadingButton } from '@/components/ui/loading-button'
import { ImageSelector } from '@/components/ui/image-selector'
import { cn } from '@/lib/utils'
import { PRESET_IMAGES } from '@/types/images'

interface Product {
  id: string
  name: string
  description: string
  price: number
  type: ProductType
  unit: string
  available: boolean
  image: string | null
  categories: { id: string }[]
  stock?: {
    quantity: number
  } | null
  acceptDeferred?: boolean
  minOrderQuantity?: number
}

interface Category {
  id: string
  name: string
}

interface FieldErrors {
  name?: boolean
  price?: boolean
  description?: boolean
  type?: boolean
  unit?: boolean
  stock?: boolean
  categories?: boolean
  minOrderQuantity?: boolean
}

interface PageProps {
  params: {
    id: string
  }
}

export default function EditProductPage({ params }: PageProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingInitial, setIsLoadingInitial] = useState(true)
  const [product, setProduct] = useState<Product | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedUnit, setSelectedUnit] = useState<'kg' | 'g'>('kg')
  const [currentImage, setCurrentImage] = useState<string | null>(null)
  const imageRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await fetch(`/api/products/${params.id}`)
        if (!response.ok) throw new Error('Erreur lors de la récupération du produit')
        const data = await response.json()
        setProduct(data)
        setSelectedUnit(data.unit)
        setSelectedCategories(data.categories.map((c: { id: string }) => c.id))
        setCurrentImage(data.image)
        
        // Gestion des images prédéfinies
        if (data.image) {
          const preset = PRESET_IMAGES.find(p => p.src === data.image)
          if (preset) {
            setSelectedPreset(preset.id)
          }
        }
      } catch (error) {
        toast({
          title: "Erreur",
          description: "Impossible de charger les données du produit",
          variant: "destructive"
        })
      }
    }

    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/categories')
        if (!response.ok) throw new Error('Erreur lors du chargement des catégories')
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

    Promise.all([fetchProduct(), fetchCategories()])
      .finally(() => setIsLoadingInitial(false))
  }, [params.id, toast])

  function handleImageSelection(value: string | File | null) {
    if (value instanceof File) {
      const url = URL.createObjectURL(value)
      setImageFile(value)
      setSelectedPreset(null)
      setCurrentImage(url)
      if (imageRef.current) {
        imageRef.current.src = url
      }
    } else {
      setSelectedPreset(value)
      setImageFile(null)
      const preset = PRESET_IMAGES.find(p => p.id === value)
      const newImageUrl = preset?.src || null
      setCurrentImage(newImageUrl)
      if (imageRef.current && newImageUrl) {
        imageRef.current.src = newImageUrl
      }
    }
  }

  function handleCategoryChange(categoryId: string) {
    setSelectedCategories(prev => {
      if (prev.includes(categoryId)) {
        return prev.filter(id => id !== categoryId)
      } else {
        return [...prev, categoryId]
      }
    })
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)
    setFieldErrors({})

    try {
      const formData = new FormData(event.currentTarget)
      const name = formData.get('name') as string
      const price = parseFloat(formData.get('price') as string)
      const type = formData.get('type') as string
      const quantity = parseFloat(formData.get('stock') as string)
      const description = formData.get('description') as string || ''
      const available = (formData.get('available') as string) === 'true'
      const acceptDeferred = formData.has('acceptDeferred')
      const minOrderQuantity = parseFloat(formData.get('minOrderQuantity') as string || '0')

      // Validations
      const errors: FieldErrors = {}
      let hasErrors = false

      if (!name || name.trim().length < 2) {
        errors.name = true
        hasErrors = true
      }
      if (!price || price <= 0 || isNaN(price)) {
        errors.price = true
        hasErrors = true
      }
      if (!type) {
        errors.type = true
        hasErrors = true
      }
      if (!quantity || quantity < 0 || isNaN(quantity)) {
        errors.stock = true
        hasErrors = true
      }
      if (selectedCategories.length === 0) {
        errors.categories = true
        hasErrors = true
      }
      if (minOrderQuantity < 0 || isNaN(minOrderQuantity)) {
        errors.minOrderQuantity = true
        hasErrors = true
      }

      if (hasErrors) {
        setFieldErrors(errors)
        throw new Error('Veuillez remplir tous les champs requis correctement')
      }

      // Mise à jour du produit
      const updateData = {
        name,
        description,
        price,
        type,
        unit: selectedUnit,
        categories: selectedCategories,
        stock: { quantity },
        available,
        imagePreset: selectedPreset,
        acceptDeferred,
        minOrderQuantity
      }

      // Mettre à jour le produit principal
      const response = await fetch(`/api/products/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      })

      if (!response.ok) {
        throw new Error('Erreur lors de la mise à jour du produit')
      }

      const updatedProduct = await response.json()

      // Upload de l'image personnalisée si sélectionnée
      if (imageFile) {
        const imageFormData = new FormData()
        imageFormData.append('image', imageFile)
        
        const uploadResponse = await fetch(`/api/products/${params.id}/image`, {
          method: 'POST',
          body: imageFormData
        })

        if (!uploadResponse.ok) {
          throw new Error("Erreur lors de l'upload de l'image")
        }

        const productWithImage = await uploadResponse.json()
        setProduct(productWithImage)
        if (imageRef.current) {
          imageRef.current.src = productWithImage.image
        }
      } else {
        setProduct(updatedProduct)
      }

      toast({
        title: "Succès",
        description: "Le produit a été mis à jour avec succès"
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
  }

  if (isLoadingInitial || !product) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-custom-accent" />
      </div>
    )
  }

  // Fonction pour formater les nombres à maximum 2 décimales sans zéros inutiles
  const formatNumber = (num: number): string => {
    return parseFloat(num.toFixed(2)).toString();
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-2xl mx-auto bg-background border border-foreground/10 rounded-lg p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-custom-title mb-6">Modifier le produit</h1>

        <form onSubmit={onSubmit} className="space-y-6">
          {/* Nom */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-custom-title">
              Nom du produit <span className="text-custom-accent">*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              defaultValue={product.name}
              className={cn(
                "mt-1 block w-full rounded-md border border-foreground/10 bg-background px-3 py-2",
                fieldErrors.name && "border-destructive"
              )}
              required
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-custom-title">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              defaultValue={product.description}
              rows={4}
              className="mt-1 block w-full rounded-md border border-foreground/10 bg-background px-3 py-2"
            />
          </div>

          {/* Prix et Unité */}
          <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="price" className="block text-sm font-medium text-custom-title">
              Prix par {selectedUnit} (CHF) <span className="text-custom-accent">*</span>
            </label>
            <input
              type="number"
              id="price"
              name="price"
              defaultValue={product.price}
              step="0.01"
              min="0"
              className={cn(
                "mt-1 block w-full rounded-md border border-foreground/10 bg-background px-3 py-2",
                fieldErrors.price && "border-destructive"
              )}
              required
            />
          </div>
            <div>
              <label htmlFor="unit" className="block text-sm font-medium text-custom-title">
                Unité <span className="text-custom-accent">*</span>
              </label>
              <select
                id="unit"
                name="unit"
                value={selectedUnit}
                onChange={(e) => setSelectedUnit(e.target.value as 'kg' | 'g')}
                className={cn(
                  "mt-1 block w-full rounded-md border border-foreground/10 bg-background px-3 py-2",
                  fieldErrors.unit && "border-destructive"
                )}
                required
              >
                <option value="kg">Kilogramme (kg)</option>
                <option value="g">Gramme (g)</option>
              </select>
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
                    type="radio"
                    name="type"
                    value={type}
                    defaultChecked={product.type === type}
                    className="border-foreground/10 text-custom-accent focus:ring-custom-accent"
                    required
                  />
                  <span className="text-custom-text">{type}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Catégories */}
          <div>
            <label className="block text-sm font-medium text-custom-title mb-2">
              Catégories <span className="text-custom-accent">*</span>
            </label>
            <div className={cn(
              "grid grid-cols-2 gap-4 p-4 border rounded-md",
              fieldErrors.categories ? "border-destructive" : "border-foreground/10"
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
          </div>

          {/* Stock */}
          <div>
            <label htmlFor="stock" className="block text-sm font-medium text-custom-title">
              Stock <span className="text-custom-accent">*</span>
            </label>
            <div className="relative mt-1">
              <input
                type="number"
                id="stock"
                name="stock"
                defaultValue={product.stock?.quantity || 0}
                min="0"
                step={selectedUnit === 'kg' ? "0.01" : "1"}
                className={cn(
                  "block w-full rounded-md border border-foreground/10 bg-background px-3 py-2 pr-12",
                  fieldErrors.stock && "border-destructive"
                )}
                required
              />
              <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-foreground/60">
                {selectedUnit}
              </div>
            </div>
          </div>

          {/* Quantité minimale */}
          <div>
            <label htmlFor="minOrderQuantity" className="block text-sm font-medium text-custom-title">
              Quantité minimale de commande ({selectedUnit})
            </label>
            <div className="relative mt-1">
              <input
                type="number"
                id="minOrderQuantity"
                name="minOrderQuantity"
                defaultValue={product.minOrderQuantity || 0}
                min="0"
                step={selectedUnit === 'kg' ? "0.1" : "1"}
                className={cn(
                  "block w-full rounded-md border border-foreground/10 bg-background px-3 py-2 pr-12",
                  fieldErrors.minOrderQuantity && "border-destructive"
                )}
              />
              <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-foreground/60">
                {selectedUnit}
              </div>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Laissez à 0 pour aucun minimum
            </p>
          </div>

          {/* Paiement différé */}
          <div className="mt-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="acceptDeferred"
                name="acceptDeferred"
                defaultChecked={product.acceptDeferred || false}
                className="h-4 w-4 border-foreground/10 text-custom-accent focus:ring-custom-accent rounded"
              />
              <label htmlFor="acceptDeferred" className="text-sm font-medium text-custom-title">
                Accepter le paiement sous 30 jours
              </label>
            </div>
            <p className="mt-1 text-xs text-muted-foreground ml-6">
              Les clients éligibles pourront commander ce produit avec paiement différé
            </p>
          </div>

          {/* Disponibilité */}
          <div className="flex items-center gap-2">
            <input
              type="radio"
              id="available-true"
              name="available"
              value="true"
              defaultChecked={product.available}
              className="border-foreground/10 text-custom-accent focus:ring-custom-accent"
            />
            <label htmlFor="available-true" className="text-custom-text">Disponible</label>
            
            <input
              type="radio"
              id="available-false"
              name="available"
              value="false"
              defaultChecked={!product.available}
              className="ml-4 border-foreground/10 text-custom-accent focus:ring-custom-accent"
            />
            <label htmlFor="available-false" className="text-custom-text">Indisponible</label>
          </div>

          {/* Image */}
          <div>
            <label className="block text-sm font-medium text-custom-title mb-2">
              Image du produit
            </label>
            <ImageSelector
              onSelectImage={handleImageSelection}
              selectedPreset={selectedPreset}
              className="mb-4"
            />
            
          </div>

          {/* Boutons */}
          <div className="flex gap-4">
            <LoadingButton type="submit" isLoading={isLoading}>
              Mettre à jour le produit
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