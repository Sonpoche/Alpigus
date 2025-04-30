// app/(protected)/admin/products/[id]/edit/page.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ProductType } from '@prisma/client'
import { useToast } from "@/hooks/use-toast"
import { LoadingButton } from '@/components/ui/loading-button'
import { ImageSelector } from '@/components/ui/image-selector'
import { cn } from '@/lib/utils'
import { PRESET_IMAGES } from '@/types/images'
import Link from 'next/link'

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
  producer: {
    id: string
    companyName: string
    user: {
      name: string
      email: string
    }
  }
}

interface Category {
  id: string
  name: string
}

interface Producer {
  id: string
  companyName: string
  user: {
    name: string
    email: string
  }
}

interface PageProps {
  params: {
    id: string
  }
}

export default function AdminEditProductPage({ params }: PageProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingInitial, setIsLoadingInitial] = useState(true)
  const [product, setProduct] = useState<Product | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [producers, setProducers] = useState<Producer[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedProducer, setSelectedProducer] = useState<string>('')
  const [selectedUnit, setSelectedUnit] = useState<'kg' | 'g'>('kg')
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [currentImage, setCurrentImage] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<{[key: string]: boolean}>({})
  const imageRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoadingInitial(true)
        
        // Charger le produit, les catégories et les producteurs en parallèle
        const [productRes, categoriesRes, producersRes] = await Promise.all([
          fetch(`/api/products/${params.id}`),
          fetch('/api/categories'),
          fetch('/api/producers')
        ])
        
        if (!productRes.ok || !categoriesRes.ok || !producersRes.ok) {
          throw new Error('Erreur lors du chargement des données')
        }
        
        const productData = await productRes.json()
        const categoriesData = await categoriesRes.json()
        const producersData = await producersRes.json()
        
        setProduct(productData)
        setCategories(categoriesData)
        setProducers(producersData)
        setSelectedUnit(productData.unit)
        setSelectedProducer(productData.producer.id)
        setSelectedCategories(productData.categories.map((c: { id: string }) => c.id))
        setCurrentImage(productData.image)
        
        // Gestion des images prédéfinies
        if (productData.image) {
          const preset = PRESET_IMAGES.find(p => p.src === productData.image)
          if (preset) {
            setSelectedPreset(preset.id)
          }
        }
      } catch (error) {
        console.error('Erreur:', error)
        toast({
          title: "Erreur",
          description: "Impossible de charger les données du produit",
          variant: "destructive"
        })
        router.push('/admin/products')
      } finally {
        setIsLoadingInitial(false)
      }
    }
    
    fetchData()
  }, [params.id, toast, router])

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
      if (!product) throw new Error('Produit non trouvé')

      const formData = new FormData(event.currentTarget)
      const name = formData.get('name') as string
      const description = formData.get('description') as string || ''
      const price = parseFloat(formData.get('price') as string)
      const type = formData.get('type') as string
      const quantity = parseFloat(formData.get('stock') as string)
      const available = (formData.get('available') as string) === 'true'

      // Validations
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
      
      if (!quantity || quantity < 0 || isNaN(quantity)) {
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

      // Mise à jour du produit
      const updateData = {
        name,
        description,
        price,
        type,
        unit: selectedUnit,
        producerId: selectedProducer,
        categories: selectedCategories,
        stock: { quantity },
        available,
        imagePreset: selectedPreset
      }

      // Mettre à jour le produit
      const response = await fetch(`/api/admin/products/${params.id}`, {
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
      } else {
        setProduct(updatedProduct)
      }

      toast({
        title: "Succès",
        description: "Le produit a été mis à jour avec succès"
      })

      router.push('/admin/products')
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

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Modifier le produit</h1>
        <Link
          href="/admin/products"
          className="text-custom-text hover:text-custom-accent transition-colors"
        >
          Retour à la liste
        </Link>
      </div>
      
      <div className="bg-background border border-foreground/10 rounded-lg p-6">
        <form onSubmit={onSubmit} className="space-y-6">
          {/* Producteur */}
          <div>
            <label htmlFor="producer" className="block text-sm font-medium text-custom-title">
              Producteur <span className="text-custom-accent">*</span>
            </label>
            <select
              id="producer"
              name="producer"
              value={selectedProducer}
              onChange={(e) => setSelectedProducer(e.target.value)}
              className={cn(
                "mt-1 block w-full rounded-md border border-foreground/10 bg-background px-3 py-2",
                fieldErrors.producer && "border-destructive"
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
              <p className="mt-1 text-sm text-destructive">Veuillez sélectionner un producteur</p>
            )}
          </div>
          
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
            {fieldErrors.name && (
              <p className="mt-1 text-sm text-destructive">Le nom doit contenir au moins 2 caractères</p>
            )}
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
              Prix au kg (CHF) <span className="text-custom-accent">*</span>
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
            {fieldErrors.price && (
              <p className="mt-1 text-sm text-destructive">Le prix doit être supérieur à 0</p>
            )}
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
                className="mt-1 block w-full rounded-md border border-foreground/10 bg-background px-3 py-2"
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
            {fieldErrors.categories && (
              <p className="mt-1 text-sm text-destructive">Sélectionnez au moins une catégorie</p>
            )}
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
            {fieldErrors.stock && (
              <p className="mt-1 text-sm text-destructive">Le stock ne peut pas être négatif</p>
            )}
          </div>

          {/* Disponibilité */}
          <div>
            <label className="block text-sm font-medium text-custom-title mb-2">
              Disponibilité
            </label>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="available"
                  value="true"
                  defaultChecked={product.available}
                  className="border-foreground/10 text-custom-accent focus:ring-custom-accent"
                />
                <span>Disponible</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="available"
                  value="false"
                  defaultChecked={!product.available}
                  className="border-foreground/10 text-custom-accent focus:ring-custom-accent"
                />
                <span>Indisponible</span>
              </label>
            </div>
          </div>

          {/* Image */}
          <div>
            <label className="block text-sm font-medium text-custom-title mb-2">
              Image du produit
            </label>
            <div className="mb-4">
              {currentImage && (
                <div className="mb-4 relative w-32 h-32 overflow-hidden rounded-md border border-foreground/10">
                  <img
                    ref={imageRef}
                    src={currentImage}
                    alt="Aperçu du produit"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <ImageSelector
                onSelectImage={handleImageSelection}
                selectedPreset={selectedPreset}
              />
            </div>
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