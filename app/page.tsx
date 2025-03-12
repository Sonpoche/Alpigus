// app/page.tsx
import Image from "next/image"
import Link from "next/link"
import { PublicHeader } from "@/components/layout/public-header"
import { Footer } from "@/components/layout/footer"

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicHeader />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold font-montserrat text-custom-title mb-6">
                Bienvenue sur Mushroom Marketplace
              </h1>
              <p className="text-xl text-center font-roboto text-custom-text max-w-2xl mx-auto mb-8">
                La première plateforme B2B dédiée aux champignons en Suisse. 
                Connectons producteurs et professionnels pour une filière plus durable.
              </p>
              <div className="flex gap-4 items-center justify-center">
                <Link
                  href="/register"
                  className="rounded-md bg-custom-accent text-white transition-opacity hover:opacity-90 px-6 py-3 text-base font-medium"
                >
                  Rejoindre la plateforme
                </Link>
                <Link
                  href="/about"
                  className="rounded-md border border-foreground/10 transition-colors hover:bg-foreground/5 px-6 py-3 text-base font-medium text-custom-text"
                >
                  En savoir plus
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16 bg-foreground/5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-center font-montserrat text-custom-title mb-12">
              Pourquoi nous rejoindre ?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="bg-background p-6 rounded-lg border border-foreground/10">
                <h3 className="text-xl font-semibold font-montserrat text-custom-title mb-4">
                  Pour les Producteurs
                </h3>
                <p className="text-custom-text">
                  Accédez à un réseau de professionnels qualifiés et développez votre activité.
                </p>
              </div>
              {/* Feature 2 */}
              <div className="bg-background p-6 rounded-lg border border-foreground/10">
                <h3 className="text-xl font-semibold font-montserrat text-custom-title mb-4">
                  Pour les Acheteurs
                </h3>
                <p className="text-custom-text">
                  Trouvez des produits de qualité et gérez vos commandes efficacement.
                </p>
              </div>
              {/* Feature 3 */}
              <div className="bg-background p-6 rounded-lg border border-foreground/10">
                <h3 className="text-xl font-semibold font-montserrat text-custom-title mb-4">
                  Simplicité
                </h3>
                <p className="text-custom-text">
                  Une plateforme intuitive pour faciliter vos échanges commerciaux.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold font-montserrat text-custom-title mb-6">
              Prêt à nous rejoindre ?
            </h2>
            <p className="text-lg text-custom-text mb-8 max-w-2xl mx-auto">
              Créez votre compte gratuitement et commencez à développer votre activité dès aujourd'hui.
            </p>
            <Link
              href="/register"
              className="inline-flex items-center justify-center rounded-md bg-custom-accent px-6 py-3 text-base font-medium text-white hover:opacity-90 transition-opacity"
            >
              Créer un compte
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}