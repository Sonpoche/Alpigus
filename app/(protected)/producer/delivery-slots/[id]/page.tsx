'use client'

import DeliverySlotCalendar from '@/components/producer/delivery-slot-calendar'

export default function DeliverySlotsPage({ params }: { params: { productId: string } }) {
  return (
    <div className="p-8">
      <DeliverySlotCalendar productId={params.productId} />
    </div>
  )
}