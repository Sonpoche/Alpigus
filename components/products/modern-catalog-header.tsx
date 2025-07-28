// components/products/modern-catalog-header.tsx
import { useState } from 'react'
import { Search, SlidersHorizontal, Leaf, Package, Pill, Beaker } from 'lucide-react'
import { ProductType } from '@prisma/client'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

interface Category {
  id: string
  name: string
  icon: React.ComponentType<any>
  count: number
  type?: ProductType
}

interface ModernCatalogHeaderProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  selectedCategory: string
  onCategoryChange: (categoryId: string) => void
  showFilters: boolean
  onToggleFilters: () => void
  categories: Category[]
  totalProducts: number
}

const defaultCategories: Category[] = [
  { 
    id: ProductType.FRESH, 
    name: 'Frais', 
    icon: Leaf, 
    count: 0,
    type: ProductType.FRESH
  },
  { 
    id: ProductType.DRIED, 
    name: 'Séchés', 
    icon: Package, 
    count: 0,
    type: ProductType.DRIED
  },
  { 
    id: ProductType.SUBSTRATE, 
    name: 'Substrats', 
    icon: Beaker, 
    count: 0,
    type: ProductType.SUBSTRATE
  },
  { 
    id: ProductType.WELLNESS, 
    name: 'Bien-être', 
    icon: Pill, 
    count: 0,
    type: ProductType.WELLNESS
  }
]

export function ModernCatalogHeader({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  showFilters,
  onToggleFilters,
  categories = defaultCategories,
  totalProducts
}: ModernCatalogHeaderProps) {
  
  return (
    <div className="space-y-6">
      {/* Barre de recherche principale */}
      <div className="max-w-2xl mx-auto">
        <div className="relative">
          <div className="flex items-center bg-white border border-gray-300 rounded-full shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex-1 px-6 py-4">
              <input
                type="text"
                placeholder="Rechercher des champignons..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full text-gray-700 placeholder-gray-500 bg-transparent border-none outline-none"
              />
            </div>
            <button className="bg-red-500 text-white p-4 rounded-full mr-2 hover:bg-red-600 transition-colors">
              <Search className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Section catégories et filtres */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Nos catégories de produits
          </h2>
          <button 
            onClick={onToggleFilters}
            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Filtres</span>
          </button>
        </div>
        
        {/* Catégories horizontales */}
        <div className="flex space-x-4 overflow-x-auto scrollbar-hide pb-2">
          {/* Catégories principales - pas de bouton "Tous" */}
          {categories.map((category) => {
            const IconComponent = category.icon
            return (
              <button
                key={category.id}
                onClick={() => onCategoryChange(category.id)}
                className={cn(
                  "flex-shrink-0 flex flex-col items-center p-4 rounded-lg border-2 transition-all min-w-[100px]",
                  selectedCategory === category.id 
                    ? "border-red-500 bg-red-50" 
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                <IconComponent className="w-6 h-6 mb-2 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">{category.name}</span>
                <span className="text-xs text-gray-500">{category.count}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Filtres déroulants */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-gray-50 p-6 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Prix maximum
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white">
                    <option>Aucune limite</option>
                    <option>Moins de 20 CHF</option>
                    <option>Moins de 50 CHF</option>
                    <option>Moins de 100 CHF</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Disponibilité
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white">
                    <option>Tous les produits</option>
                    <option>Disponible seulement</option>
                    <option>En rupture de stock</option>
                  </select>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}