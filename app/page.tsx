// app/page.tsx
import Image from "next/image"
import Link from "next/link"
import { PublicHeader } from "@/components/layout/public-header"
import { Footer } from "@/components/layout/footer"
import FeaturedProducts from "@/components/home/featured-products"
import HowItWorks from "@/components/home/how-it-works"
import Testimonials from "@/components/home/testimonials"
import { ArrowRight, Truck, Shield, Award, Leaf } from "lucide-react"

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-background overflow-x-hidden">
      <PublicHeader />

      <main className="flex-1">
        {/* Hero Section avec animation */}
        <section className="relative py-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-custom-accentLight to-transparent opacity-30 dark:opacity-20"></div>
          
          <div className="max-w-7xl mx-auto relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div className="animate-slideIn">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold font-montserrat text-custom-title mb-6">
                  La Marketplace 
                  <span className="text-custom-accent block">des Champignons</span>
                </h1>
                <p className="text-xl font-roboto text-custom-text max-w-xl mb-8">
                  Connectez-vous avec les meilleurs producteurs de champignons en Suisse et développez votre activité de manière durable.
                </p>
                <div className="flex flex-wrap gap-4 items-center">
                  <Link
                    href="/register"
                    className="rounded-md bg-custom-accent text-white transition-all hover:bg-custom-accentHover px-6 py-3 text-base font-medium hover-lift"
                  >
                    Rejoindre la plateforme
                  </Link>
                  <Link
                    href="/products"
                    className="rounded-md border border-foreground/10 transition-colors hover:bg-foreground/5 px-6 py-3 text-base font-medium text-custom-text flex items-center gap-2 group"
                  >
                    Explorer le catalogue
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </div>
              </div>
              
              <div className="relative h-[400px] w-full rounded-2xl overflow-hidden shadow-2xl animate-fadeIn">
                <Image
                  src="/images/hero-mushrooms.jpg"
                  alt="Variété de champignons frais"
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  className="object-cover"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                
                <div className="absolute bottom-6 left-6 right-6 bg-white/90 dark:bg-black/80 p-4 rounded-lg backdrop-blur-sm">
                  <p className="text-sm font-medium">
                    Plus de <span className="text-custom-accent">50+ producteurs</span> et <span className="text-custom-accent">200+ variétés</span> de champignons disponibles
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Trust Badges */}
        <section className="py-10 bg-foreground/5 dark:bg-foreground/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-custom-accentLight flex items-center justify-center mb-3">
                  <Truck className="h-6 w-6 text-custom-accent" />
                </div>
                <h3 className="text-sm font-semibold mb-1">Livraison Rapide</h3>
                <p className="text-xs text-muted-foreground">Dans toute la Suisse</p>
              </div>
              
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center mb-3">
                  <Leaf className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-sm font-semibold mb-1">100% Naturel</h3>
                <p className="text-xs text-muted-foreground">Sans pesticides</p>
              </div>
              
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center mb-3">
                  <Shield className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-sm font-semibold mb-1">Paiement Sécurisé</h3>
                <p className="text-xs text-muted-foreground">Transactions protégées</p>
              </div>
              
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center mb-3">
                  <Award className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                </div>
                <h3 className="text-sm font-semibold mb-1">Qualité Premium</h3>
                <p className="text-xs text-muted-foreground">Goût et fraîcheur garantis</p>
              </div>
            </div>
          </div>
        </section>

        {/* Produits en vedette */}
        <FeaturedProducts />

        {/* Comment ça marche */}
        <HowItWorks />

        {/* Témoignages */}
        <Testimonials />

        {/* CTA Section (améliorée) */}
        <section className="py-20 bg-custom-accentLight dark:bg-custom-accent/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold font-montserrat text-custom-title mb-6">
              Prêt à développer votre business ?
            </h2>
            <p className="text-lg text-custom-text mb-8 max-w-2xl mx-auto">
              Rejoignez notre communauté de professionnels passionnés par les champignons et faites passer votre activité au niveau supérieur.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register"
                className="inline-flex items-center justify-center rounded-md bg-custom-accent px-6 py-3 text-base font-medium text-white hover:bg-custom-accentHover transition-all hover-lift"
              >
                Créer un compte
              </Link>
              <Link
                href="/about"
                className="inline-flex items-center justify-center rounded-md border border-foreground/10 bg-background/80 backdrop-blur-sm px-6 py-3 text-base font-medium transition-colors hover:bg-foreground/5"
              >
                En savoir plus
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}