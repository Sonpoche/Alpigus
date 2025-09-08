// Chemin du fichier: app/page.tsx
import { PublicHeader } from "@/components/layout/public-header"
import { Footer } from "@/components/layout/footer"
import ShopHomepage from "@/components/shop/shop-homepage"

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <PublicHeader />
      <main className="flex-1">
        <ShopHomepage />
      </main>
      <Footer />
    </div>
  )
}