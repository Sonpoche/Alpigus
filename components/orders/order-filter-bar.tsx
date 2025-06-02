// components/orders/order-filter-bar.tsx
import { 
  FilterIcon, 
  Search, 
  Clock, 
  CheckCircle, 
  Truck, 
  Package 
} from 'lucide-react'
import { OrderStatus } from '@prisma/client'

interface OrderFilterBarProps {
  searchTerm: string
  onSearchChange: (value: string) => void
  activeStatus: string | null
  onStatusChange: (status: string | null) => void
}

export default function OrderFilterBar({ 
  searchTerm, 
  onSearchChange, 
  activeStatus, 
  onStatusChange 
}: OrderFilterBarProps) {
  return (
    <div className="mb-4 sm:mb-6 space-y-4">
      {/* Barre de recherche */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
        </div>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Rechercher par client, commande, produit..."
          className="pl-8 sm:pl-10 w-full rounded-md border border-foreground/10 bg-background px-3 py-2 text-sm sm:text-base"
        />
      </div>
      
      {/* Filtres de statut - Scrollable sur mobile */}
      <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-hide">
        <button
          onClick={() => onStatusChange(null)}
          className={`flex items-center gap-1 sm:gap-2 px-3 py-2 rounded-md text-xs sm:text-sm font-medium whitespace-nowrap flex-shrink-0 ${
            activeStatus === null
              ? 'bg-custom-accent text-white'
              : 'bg-foreground/5 hover:bg-foreground/10 text-foreground transition-colors'
          }`}
        >
          <FilterIcon className="h-3 w-3 sm:h-4 sm:w-4" />
          <span>Toutes</span>
        </button>
        
        <button
          onClick={() => onStatusChange(OrderStatus.PENDING)}
          className={`flex items-center gap-1 sm:gap-2 px-3 py-2 rounded-md text-xs sm:text-sm font-medium whitespace-nowrap flex-shrink-0 ${
            activeStatus === OrderStatus.PENDING
              ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300'
              : 'bg-foreground/5 hover:bg-foreground/10 text-foreground transition-colors'
          }`}
        >
          <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
          <span>À traiter</span>
        </button>
        
        <button
          onClick={() => onStatusChange(OrderStatus.CONFIRMED)}
          className={`flex items-center gap-1 sm:gap-2 px-3 py-2 rounded-md text-xs sm:text-sm font-medium whitespace-nowrap flex-shrink-0 ${
            activeStatus === OrderStatus.CONFIRMED
              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
              : 'bg-foreground/5 hover:bg-foreground/10 text-foreground transition-colors'
          }`}
        >
          <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" />
          <span>Confirmées</span>
        </button>
        
        <button
          onClick={() => onStatusChange(OrderStatus.SHIPPED)}
          className={`flex items-center gap-1 sm:gap-2 px-3 py-2 rounded-md text-xs sm:text-sm font-medium whitespace-nowrap flex-shrink-0 ${
            activeStatus === OrderStatus.SHIPPED
              ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300'
              : 'bg-foreground/5 hover:bg-foreground/10 text-foreground transition-colors'
          }`}
        >
          <Truck className="h-3 w-3 sm:h-4 sm:w-4" />
          <span>Expédiées</span>
        </button>
        
        <button
          onClick={() => onStatusChange(OrderStatus.DELIVERED)}
          className={`flex items-center gap-1 sm:gap-2 px-3 py-2 rounded-md text-xs sm:text-sm font-medium whitespace-nowrap flex-shrink-0 ${
            activeStatus === OrderStatus.DELIVERED
              ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
              : 'bg-foreground/5 hover:bg-foreground/10 text-foreground transition-colors'
          }`}
        >
          <Package className="h-3 w-3 sm:h-4 sm:w-4" />
          <span>Livrées</span>
        </button>
      </div>
    </div>
  );
}