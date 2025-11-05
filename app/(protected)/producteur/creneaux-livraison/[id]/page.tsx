// app/(protected)/producteur/creneaux-livraison/[id]/page.tsx
'use client'

import DeliverySlotCalendar from '@/components/producer/delivery-slot-calendar'

export default function DeliverySlotsPage({ params }: { params: { productId: string } }) {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <DeliverySlotCalendar productId={params.productId} />
    </div>
  )
}