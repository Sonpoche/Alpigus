// Chemin du fichier: app/(protected)/admin/categories/page.tsx
'use client'

import CategoryManagement from '@/components/admin/category-management'

export default function CategoriesPage() {
  return (
    <div className="p-8">
      <CategoryManagement />
    </div>
  )
}