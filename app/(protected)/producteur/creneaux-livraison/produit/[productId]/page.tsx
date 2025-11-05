// app/(protected)/producteur/creneaux-livraison/produit/[productId]/page.tsx
'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import DeliverySlotCalendar from '@/components/producer/delivery-slot-calendar'

interface PageProps {
  params: {
    productId: string
  }
}

export default function DeliverySlotsPage({ params }: PageProps) {
  const router = useRouter()

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-foreground/5 rounded-md transition-colors flex-shrink-0"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h1 className="text-lg sm:text-xl lg:text-2xl font-montserrat font-bold text-custom-title line-clamp-2">
              Gestion des créneaux de livraison
            </h1>
          </div>
          <Link
            href="/producteur"
            className="text-sm text-custom-text hover:text-custom-accent transition-colors whitespace-nowrap ml-auto sm:ml-0"
          >
            Retour aux produits
          </Link>
        </div>

        <DeliverySlotCalendar productId={params.productId} />
      </div>
    </div>
  )
}