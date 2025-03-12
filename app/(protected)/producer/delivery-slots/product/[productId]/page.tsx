// app/producer/delivery-slots/product/[productId]/page.tsx
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
    <div className="p-8">
      <div className="max-w-5xl mx-auto">
        {/* En-tête */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-foreground/5 rounded-md transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h1 className="text-2xl font-montserrat font-bold text-custom-title">
              Gestion des créneaux de livraison
            </h1>
          </div>
          <Link
            href="/producer"
            className="text-sm text-custom-text hover:text-custom-accent transition-colors"
          >
            Retour aux produits
          </Link>
        </div>

        {/* Calendrier des créneaux */}
        <DeliverySlotCalendar productId={params.productId} />
      </div>
    </div>
  )
}