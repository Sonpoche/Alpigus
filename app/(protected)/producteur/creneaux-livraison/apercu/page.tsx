// app/(protected)/producteur/creneaux-livraison/apercu/page.tsx
"use client"

import DeliverySlotsOverview from '@/components/producer/delivery-slots-overview'

export default function DeliverySlotsOverviewPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <DeliverySlotsOverview />
    </div>
  )
}