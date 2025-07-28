// components/products/modern-filter-sidebar.tsx
import { useState } from 'react'
import { ProductType } from '@prisma/client'
import { 
  X, 
  ChevronDown, 
  ChevronUp,
  Filter,
  DollarSign,
  Package,
  CheckCircle,
  Circle
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

interface Category {
  id: string
  name: string
}

interface FilterSidebarProps {
  isOpen: boolean
  onClose: () => void
  filters: {
    type: ProductType | ''
    category: string
    minPrice: string
    maxPrice: string
    available: boolean | null
    sortBy: string
  }
  onFiltersChange: (filters: any) => void
  categories: Category[]
  onApplyFilters: () => void
  onResetFilters: () => void
}

interface FilterSectionProps {
  title: string
  icon: React.ComponentType<any>
  children: React.ReactNode
  defaultOpen?: boolean
}

function FilterSection({ title, icon: Icon, children, defaultOpen = true }: FilterSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="border-b border-gray-200 last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center space-x-2">
          <Icon className="w-4 h-4 text-gray-600" />
          <span className="font-medium text-gray-900">{title}</span>
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-gray-600" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-600" />
        )}
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function ModernFilterSidebar({
  isOpen,
  onClose,
  filters,
  onFiltersChange,
  categories,
  onApplyFilters,
  onResetFilters
}: FilterSidebarProps) {
  const productTypes = [
    { value: ProductType.FRESH, label: 'Frais' },
    { value: ProductType.DRIED, label: 'Séchés' },
    { value: ProductType.SUBSTRATE, label: 'Substrats' },
    { value: ProductType.WELLNESS, label: 'Bien-être' }
  ]

  const priceRanges = [
    { min: '', max: '20', label: 'Moins de 20 CHF' },
    { min: '20', max: '50', label: '20 - 50 CHF' },
    { min: '50', max: '100', label: '50 - 100 CHF' },
    { min: '100', max: '', label: 'Plus de 100 CHF' }
  ]

  const handleCategoryChange = (categoryType: string) => {
    onFiltersChange({ ...filters, category: categoryType })
  }

  const handlePriceRangeClick = (min: string, max: string) => {
    onFiltersChange({ ...filters, minPrice: min, maxPrice: max })
  }

  const handleAvailabilityChange = (available: boolean | null) => {
    onFiltersChange({ ...filters, available })
  }

  const handleSortChange = (sortBy: string) => {
    onFiltersChange({ ...filters, sortBy })
  }

  return (
    <>
      {/* Overlay mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <motion.div
        initial={{ x: -300 }}
        animate={{ x: isOpen ? 0 : -300 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="fixed left-0 top-0 h-full w-80 bg-white shadow-xl z-50 lg:relative lg:translate-x-0 lg:shadow-none lg:border-r lg:border-gray-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Filtres</h2>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Contenu des filtres */}
        <div className="h-full overflow-y-auto pb-20">
          {/* Catégories principales (basées sur ProductType) */}
          <FilterSection title="Catégories principales" icon={Package}>
            <div className="space-y-3">
              {productTypes.map((type) => (
                <button
                  key={type.value}
                  onClick={() => handleCategoryChange(type.value)}
                  className={cn(
                    "w-full flex items-center space-x-2 p-2 rounded-lg transition-colors text-left",
                    filters.category === type.value ? "bg-red-50 text-red-700" : "hover:bg-gray-50"
                  )}
                >
                  {filters.category === type.value ? (
                    <CheckCircle className="w-4 h-4 text-red-500" />
                  ) : (
                    <Circle className="w-4 h-4 text-gray-400" />
                  )}
                  <span>{type.label}</span>
                </button>
              ))}
            </div>
          </FilterSection>

          {/* Prix */}
          <FilterSection title="Gamme de prix" icon={DollarSign}>
            <div className="space-y-4">
              {/* Plages prédéfinies */}
              <div className="space-y-3">
                {priceRanges.map((range, index) => {
                  const isSelected = filters.minPrice === range.min && filters.maxPrice === range.max
                  return (
                    <button
                      key={index}
                      onClick={() => handlePriceRangeClick(range.min, range.max)}
                      className={cn(
                        "w-full flex items-center space-x-2 p-2 rounded-lg transition-colors text-left",
                        isSelected ? "bg-red-50 text-red-700" : "hover:bg-gray-50"
                      )}
                    >
                      {isSelected ? (
                        <CheckCircle className="w-4 h-4 text-red-500" />
                      ) : (
                        <Circle className="w-4 h-4 text-gray-400" />
                      )}
                      <span>{range.label}</span>
                    </button>
                  )
                })}
              </div>

              {/* Inputs personnalisés */}
              <div className="pt-3 border-t border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prix personnalisé (CHF)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={filters.minPrice}
                    onChange={(e) => onFiltersChange({ ...filters, minPrice: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={filters.maxPrice}
                    onChange={(e) => onFiltersChange({ ...filters, maxPrice: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
              </div>
            </div>
          </FilterSection>

          {/* Disponibilité */}
          <FilterSection title="Disponibilité" icon={CheckCircle}>
            <div className="space-y-3">
              <button
                onClick={() => handleAvailabilityChange(null)}
                className={cn(
                  "w-full flex items-center space-x-2 p-2 rounded-lg transition-colors text-left",
                  filters.available === null ? "bg-red-50 text-red-700" : "hover:bg-gray-50"
                )}
              >
                {filters.available === null ? (
                  <CheckCircle className="w-4 h-4 text-red-500" />
                ) : (
                  <Circle className="w-4 h-4 text-gray-400" />
                )}
                <span>Tous les produits</span>
              </button>
              
              <button
                onClick={() => handleAvailabilityChange(true)}
                className={cn(
                  "w-full flex items-center space-x-2 p-2 rounded-lg transition-colors text-left",
                  filters.available === true ? "bg-red-50 text-red-700" : "hover:bg-gray-50"
                )}
              >
                {filters.available === true ? (
                  <CheckCircle className="w-4 h-4 text-red-500" />
                ) : (
                  <Circle className="w-4 h-4 text-gray-400" />
                )}
                <span>Disponible seulement</span>
              </button>
              
              <button
                onClick={() => handleAvailabilityChange(false)}
                className={cn(
                  "w-full flex items-center space-x-2 p-2 rounded-lg transition-colors text-left",
                  filters.available === false ? "bg-red-50 text-red-700" : "hover:bg-gray-50"
                )}
              >
                {filters.available === false ? (
                  <CheckCircle className="w-4 h-4 text-red-500" />
                ) : (
                  <Circle className="w-4 h-4 text-gray-400" />
                )}
                <span>En rupture de stock</span>
              </button>
            </div>
          </FilterSection>

          {/* Tri */}
          <FilterSection title="Trier par" icon={Filter}>
            <div className="space-y-3">
              {[
                { value: 'newest', label: 'Plus récents' },
                { value: 'price_asc', label: 'Prix croissant' },
                { value: 'price_desc', label: 'Prix décroissant' },
                { value: 'popular', label: 'Popularité' }
              ].map((sort) => (
                <button
                  key={sort.value}
                  onClick={() => handleSortChange(sort.value)}
                  className={cn(
                    "w-full flex items-center space-x-2 p-2 rounded-lg transition-colors text-left",
                    filters.sortBy === sort.value ? "bg-red-50 text-red-700" : "hover:bg-gray-50"
                  )}
                >
                  {filters.sortBy === sort.value ? (
                    <CheckCircle className="w-4 h-4 text-red-500" />
                  ) : (
                    <Circle className="w-4 h-4 text-gray-400" />
                  )}
                  <span>{sort.label}</span>
                </button>
              ))}
            </div>
          </FilterSection>
        </div>

        {/* Boutons d'action */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200">
          <div className="flex gap-2">
            <button
              onClick={onResetFilters}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Réinitialiser
            </button>
            <button
              onClick={onApplyFilters}
              className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              Appliquer
            </button>
          </div>
        </div>
      </motion.div>
    </>
  )
}