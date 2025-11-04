// Chemin du fichier: app/(protected)/admin/produits/nouveau/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ProductType } from '@prisma/client'
import { useToast } from "@/hooks/use-toast"
import { LoadingButton } from '@/components/ui/loading-button'
import { ImageSelector } from '@/components/ui/image-selector'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { ArrowLeft, Package } from 'lucide-react'

interface Producer {
  id: string
  companyName: string
  user: {
    name: string
    email: string
  }
}

interface Category {
  id: string
  name: string
}

export default function AdminNewProductPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [producers, setProducers] = useState<Producer[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedProducer, setSelectedProducer] = useState<string>('')
  const [selectedUnit, setSelectedUnit] = useState<'kg' | 'g'>('kg')
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [fieldErrors, setFieldErrors] = useState<{[key: string]: boolean}>({})
  const [isLoadingData, setIsLoadingData] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoadingData(true)
        
        const [producersRes, categoriesRes] = await Promise.all([
          fetch('/api/producers'),
          fetch('/api/categories')
        ])
        
        if (!producersRes.ok || !categoriesRes.ok) {
          throw new Error('Erreur lors du chargement des données')
        }
        
        const producersData = await producersRes.json()
        const categoriesData = await categoriesRes.json()
        
        // CORRECTION : L'API /api/producers retourne { producers: [...] }
        setProducers(producersData.producers || producersData)
        // CORRECTION : L'API /api/categories retourne { categories: [...] }
        setCategories(categoriesData.categories || categoriesData)
      } catch (error) {
        console.error('Erreur:', error)
        toast({
          title: 'Erreur',
          description: 'Impossible de charger les données nécessaires',
          variant: 'destructive'
        })
      } finally {
        setIsLoadingData(false)
      }
    }
    
    fetchData()
  }, [toast])

  const handleImageSelection = (value: string | File | null) => {
    if (value instanceof File) {
      setImageFile(value)
      setSelectedPreset(null)
    } else {
      setSelectedPreset(value)
      setImageFile(null)
    }
  }

  const handleCategoryChange = (categoryId: string) => {
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
      const description = formData.get('description') as string || ''
      const price = parseFloat(formData.get('price') as string)
      const type = formData.get('type') as ProductType
      const initialStock = parseFloat(formData.get('initialStock') as string)
      
      const errors: {[key: string]: boolean} = {}
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
      
      if (!selectedProducer) {
        errors.producer = true
        hasErrors = true
      }
      
      if (initialStock < 0 || isNaN(initialStock)) {
        errors.stock = true
        hasErrors = true
      }
      
      if (selectedCategories.length === 0) {
        errors.categories = true
        hasErrors = true
      }

      if (hasErrors) {
        setFieldErrors(errors)
        throw new Error('Veuillez remplir tous les champs requis correctement')
      }

      const productData = {
        name,
        description,
        price,
        type,
        unit: selectedUnit,
        producerId: selectedProducer,
        initialStock,
        categories: selectedCategories,
        imagePreset: selectedPreset,
      }

      const response = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData)
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || 'Erreur lors de la création du produit')
      }

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

      router.push('/admin/produits')
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

  if (isLoadingData) {
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
            <Package className="h-8 w-8" />
            Ajouter un produit
          </h1>
          <p className="mt-2 text-gray-600">
            Créez un nouveau produit pour la plateforme
          </p>
        </div>
        <Link
          href="/admin/produits"
          className="flex items-center gap-2 text-black hover:text-gray-600 transition-colors font-medium"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour
        </Link>
      </div>
      
      {/* Formulaire */}
      <div className="bg-white border-2 border-black rounded-lg p-6">
        <form onSubmit={onSubmit} className="space-y-6">
          {/* Producteur */}
          <div>
            <label htmlFor="producer" className="block text-sm font-semibold text-black mb-2">
              Producteur <span className="text-red-600">*</span>
            </label>
            <select
              id="producer"
              name="producer"
              value={selectedProducer}
              onChange={(e) => setSelectedProducer(e.target.value)}
              className={cn(
                "block w-full rounded-md border-2 bg-white px-3 py-2 focus:outline-none",
                fieldErrors.producer ? "border-red-500" : "border-gray-300 focus:border-black"
              )}
              required
            >
              <option value="">Sélectionner un producteur</option>
              {producers.map((producer) => (
                <option key={producer.id} value={producer.id}>
                  {producer.companyName || producer.user.name} ({producer.user.email})
                </option>
              ))}
            </select>
            {fieldErrors.producer && (
              <p className="mt-1 text-sm text-red-600">Veuillez sélectionner un producteur</p>
            )}
          </div>
          
          {/* Nom */}
          <div>
            <label htmlFor="name" className="block text-sm font-semibold text-black mb-2">
              Nom du produit <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              className={cn(
                "block w-full rounded-md border-2 bg-white px-3 py-2 focus:outline-none",
                fieldErrors.name ? "border-red-500" : "border-gray-300 focus:border-black"
              )}
              required
            />
            {fieldErrors.name && (
              <p className="mt-1 text-sm text-red-600">Le nom doit contenir au moins 2 caractères</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-semibold text-black mb-2">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={4}
              className="block w-full rounded-md border-2 border-gray-300 bg-white px-3 py-2 focus:border-black focus:outline-none"
            />
          </div>

          {/* Prix et Unité */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="price" className="block text-sm font-semibold text-black mb-2">
                Prix au kg (CHF) <span className="text-red-600">*</span>
              </label>
              <input
                type="number"
                id="price"
                name="price"
                step="0.01"
                min="0"
                className={cn(
                  "block w-full rounded-md border-2 bg-white px-3 py-2 focus:outline-none",
                  fieldErrors.price ? "border-red-500" : "border-gray-300 focus:border-black"
                )}
                required
              />
              {fieldErrors.price && (
                <p className="mt-1 text-sm text-red-600">Le prix doit être supérieur à 0</p>
              )}
            </div>
            <div>
              <label htmlFor="unit" className="block text-sm font-semibold text-black mb-2">
                Unité <span className="text-red-600">*</span>
              </label>
              <select
                id="unit"
                name="unit"
                value={selectedUnit}
                onChange={(e) => setSelectedUnit(e.target.value as 'kg' | 'g')}
                className="block w-full rounded-md border-2 border-gray-300 bg-white px-3 py-2 focus:border-black focus:outline-none"
                required
              >
                <option value="kg">Kilogramme (kg)</option>
                <option value="g">Gramme (g)</option>
              </select>
            </div>
          </div>

          {/* Type de produit */}
          <div>
            <label className="block text-sm font-semibold text-black mb-3">
              Type de produit <span className="text-red-600">*</span>
            </label>
            <div className={cn(
              "grid grid-cols-2 gap-4",
              fieldErrors.type && "text-red-600"
            )}>
              {Object.values(ProductType).map((type) => (
                <label key={type} className="flex items-center space-x-3 p-3 border-2 border-gray-300 rounded-md hover:border-black cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name="type"
                    value={type}
                    className="w-4 h-4 text-black border-gray-300 focus:ring-black"
                    required
                  />
                  <span className="text-black font-medium">{type}</span>
                </label>
              ))}
            </div>
            {fieldErrors.type && (
              <p className="mt-1 text-sm text-red-600">Veuillez sélectionner un type de produit</p>
            )}
          </div>

          {/* Catégories */}
          <div>
            <label className="block text-sm font-semibold text-black mb-3">
              Catégories <span className="text-red-600">*</span>
            </label>
            <div className={cn(
              "grid grid-cols-2 gap-4 p-4 border-2 rounded-md",
              fieldErrors.categories ? "border-red-500" : "border-gray-300"
            )}>
              {categories.map((category) => (
                <label key={category.id} className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(category.id)}
                    onChange={() => handleCategoryChange(category.id)}
                    className="w-4 h-4 text-black border-gray-300 rounded focus:ring-black"
                  />
                  <span className="text-black">{category.name}</span>
                </label>
              ))}
            </div>
            {fieldErrors.categories && (
              <p className="mt-1 text-sm text-red-600">Sélectionnez au moins une catégorie</p>
            )}
          </div>

          {/* Stock initial */}
          <div>
            <label htmlFor="initialStock" className="block text-sm font-semibold text-black mb-2">
              Stock initial <span className="text-red-600">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                id="initialStock"
                name="initialStock"
                min="0"
                step={selectedUnit === 'kg' ? "0.01" : "1"}
                className={cn(
                  "block w-full rounded-md border-2 bg-white px-3 py-2 pr-12 focus:outline-none",
                  fieldErrors.stock ? "border-red-500" : "border-gray-300 focus:border-black"
                )}
                required
              />
              <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-gray-600 font-medium">
                {selectedUnit}
              </div>
            </div>
            {fieldErrors.stock && (
              <p className="mt-1 text-sm text-red-600">Le stock initial ne peut pas être négatif</p>
            )}
          </div>

          {/* Image */}
          <div>
            <label className="block text-sm font-semibold text-black mb-3">
              Image du produit
            </label>
            <ImageSelector
              onSelectImage={handleImageSelection}
              selectedPreset={selectedPreset}
            />
          </div>

          {/* Boutons */}
          <div className="flex gap-4 pt-4 border-t-2 border-gray-200">
            <LoadingButton 
              type="submit" 
              isLoading={isLoading}
              className="bg-black text-white hover:bg-gray-800 border-2 border-black px-6 py-2 rounded-md font-semibold"
            >
              Créer le produit
            </LoadingButton>
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2 border-2 border-black rounded-md hover:bg-gray-100 transition-colors text-black font-semibold"
            >
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}