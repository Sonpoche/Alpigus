// Chemin du fichier: app/(protected)/admin/produits/[id]/modifier/page.tsx
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
import { ArrowLeft, Package } from 'lucide-react'

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
        // CORRECTION : L'API /api/categories retourne { categories: [...] }
        setCategories(categoriesData.categories || categoriesData)
        // CORRECTION : L'API /api/producers retourne { producers: [...] }
        setProducers(producersData.producers || producersData)
        setSelectedUnit(productData.unit)
        setSelectedProducer(productData.producer.id)
        setSelectedCategories(productData.categories.map((c: { id: string }) => c.id))
        setCurrentImage(productData.image)
        
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
        router.push('/admin/produits')
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

      const response = await fetch(`/api/admin/products/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      })

      if (!response.ok) {
        throw new Error('Erreur lors de la mise à jour du produit')
      }

      const updatedProduct = await response.json()

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

  if (isLoadingInitial || !product) {
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
            Modifier le produit
          </h1>
          <p className="mt-2 text-gray-600">
            Mettez à jour les informations du produit
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
              defaultValue={product.name}
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
              defaultValue={product.description}
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
                defaultValue={product.price}
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
            <div className="grid grid-cols-2 gap-4">
              {Object.values(ProductType).map((type) => (
                <label key={type} className="flex items-center space-x-3 p-3 border-2 border-gray-300 rounded-md hover:border-black cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name="type"
                    value={type}
                    defaultChecked={product.type === type}
                    className="w-4 h-4 text-black border-gray-300 focus:ring-black"
                    required
                  />
                  <span className="text-black font-medium">{type}</span>
                </label>
              ))}
            </div>
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

          {/* Stock */}
          <div>
            <label htmlFor="stock" className="block text-sm font-semibold text-black mb-2">
              Stock <span className="text-red-600">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                id="stock"
                name="stock"
                defaultValue={product.stock?.quantity || 0}
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
              <p className="mt-1 text-sm text-red-600">Le stock ne peut pas être négatif</p>
            )}
          </div>

          {/* Disponibilité */}
          <div>
            <label className="block text-sm font-semibold text-black mb-3">
              Disponibilité
            </label>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-3 p-3 border-2 border-gray-300 rounded-md hover:border-black cursor-pointer transition-colors">
                <input
                  type="radio"
                  name="available"
                  value="true"
                  defaultChecked={product.available}
                  className="w-4 h-4 text-black border-gray-300 focus:ring-black"
                />
                <span className="text-black font-medium">Disponible</span>
              </label>
              <label className="flex items-center gap-3 p-3 border-2 border-gray-300 rounded-md hover:border-black cursor-pointer transition-colors">
                <input
                  type="radio"
                  name="available"
                  value="false"
                  defaultChecked={!product.available}
                  className="w-4 h-4 text-black border-gray-300 focus:ring-black"
                />
                <span className="text-black font-medium">Indisponible</span>
              </label>
            </div>
          </div>

          {/* Image */}
          <div>
            <label className="block text-sm font-semibold text-black mb-3">
              Image du produit
            </label>
            <div className="space-y-4">
              {currentImage && (
                <div className="relative w-32 h-32 overflow-hidden rounded-md border-2 border-gray-300">
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
          <div className="flex gap-4 pt-4 border-t-2 border-gray-200">
            <LoadingButton 
              type="submit" 
              isLoading={isLoading}
              className="bg-black text-white hover:bg-gray-800 border-2 border-black px-6 py-2 rounded-md font-semibold"
            >
              Mettre à jour le produit
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