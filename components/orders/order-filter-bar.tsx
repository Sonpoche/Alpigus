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
    <div className="mb-6 flex flex-col sm:flex-row gap-4">
      <div className="flex-1 relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-muted-foreground" />
        </div>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Rechercher par client, commande, produit..."
          className="pl-10 w-full rounded-md border border-foreground/10 bg-background px-3 py-2"
        />
      </div>
      
      <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
        <button
          onClick={() => onStatusChange(null)}
          className={`px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap ${
            activeStatus === null
              ? 'bg-custom-accent text-white'
              : 'bg-foreground/5 hover:bg-foreground/10 text-foreground transition-colors'
          }`}
        >
          <FilterIcon className="h-4 w-4 mr-1 inline-block" />
          Toutes
        </button>
        
        <button
          onClick={() => onStatusChange(OrderStatus.CONFIRMED)}
          className={`px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap ${
            activeStatus === OrderStatus.CONFIRMED
              ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300'
              : 'bg-foreground/5 hover:bg-foreground/10 text-foreground transition-colors'
          }`}
        >
          <Clock className="h-4 w-4 mr-1 inline-block" />
          À traiter
        </button>
        
        <button
          onClick={() => onStatusChange(OrderStatus.CONFIRMED)}
          className={`px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap ${
            activeStatus === OrderStatus.CONFIRMED
              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
              : 'bg-foreground/5 hover:bg-foreground/10 text-foreground transition-colors'
          }`}
        >
          <CheckCircle className="h-4 w-4 mr-1 inline-block" />
          Confirmées
        </button>
        
        <button
          onClick={() => onStatusChange(OrderStatus.SHIPPED)}
          className={`px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap ${
            activeStatus === OrderStatus.SHIPPED
              ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300'
              : 'bg-foreground/5 hover:bg-foreground/10 text-foreground transition-colors'
          }`}
        >
          <Truck className="h-4 w-4 mr-1 inline-block" />
          Expédiées
        </button>
        
        <button
          onClick={() => onStatusChange(OrderStatus.DELIVERED)}
          className={`px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap ${
            activeStatus === OrderStatus.DELIVERED
              ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
              : 'bg-foreground/5 hover:bg-foreground/10 text-foreground transition-colors'
          }`}
        >
          <Package className="h-4 w-4 mr-1 inline-block" />
          Livrées
        </button>
      </div>
    </div>
  );
}