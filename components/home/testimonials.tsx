// components/home/testimonials.tsx
'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ArrowLeft, ArrowRight, Star } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const testimonials = [
  {
    id: 1,
    quote: "La qualité des champignons que j'ai pu trouver sur cette plateforme est remarquable. Mes clients sont ravis et mon restaurant gagne en réputation.",
    author: "Marie Dupont",
    role: "Chef de cuisine, Restaurant L'Écrin",
    avatar: "/images/testimonials/chef.jpg"
  },
  {
    id: 2,
    quote: "Depuis que j'ai rejoint Mushroom Marketplace, mes ventes ont augmenté de 40%. La plateforme me permet de toucher facilement de nouveaux clients B2B.",
    author: "Jean-Pierre Martin",
    role: "Producteur de champignons, Fungi Farm",
    avatar: "/images/testimonials/farmer.jpg"
  },
  {
    id: 3,
    quote: "En tant que détaillant spécialisé, j'apprécie la fiabilité et la fraîcheur des produits. Le système de réservation de créneaux est particulièrement efficace.",
    author: "Sophie Leblanc",
    role: "Propriétaire, Épicerie Fine Nature",
    avatar: "/images/testimonials/retailer.jpg"
  }
]

export default function Testimonials() {
  const [currentIndex, setCurrentIndex] = useState(0)
  
  const prevTestimonial = () => {
    setCurrentIndex((currentIndex - 1 + testimonials.length) % testimonials.length)
  }
  
  const nextTestimonial = () => {
    setCurrentIndex((currentIndex + 1) % testimonials.length)
  }
  
  const currentTestimonial = testimonials[currentIndex]
  
  return (
    <section className="py-16 bg-foreground/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-center font-montserrat text-custom-title mb-12">
          Ce que disent nos utilisateurs
        </h2>
        
        <div className="relative overflow-hidden bg-background border border-foreground/10 rounded-2xl p-8 shadow-lg mx-auto max-w-4xl">
          <div className="absolute top-4 right-4 flex">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="h-4 w-4 text-amber-400 fill-amber-400" />
            ))}
          </div>
          
          <AnimatePresence mode="wait">
            <motion.div
              key={currentTestimonial.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col md:flex-row gap-8 items-center"
            >
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden bg-foreground/10 flex-shrink-0 relative">
                <Image
                  src={currentTestimonial.avatar}
                  alt={currentTestimonial.author}
                  fill
                  className="object-cover"
                />
              </div>
              
              <div>
                <blockquote className="text-lg italic mb-4 text-custom-text">
                  "{currentTestimonial.quote}"
                </blockquote>
                
                <div>
                  <p className="font-semibold text-custom-title">{currentTestimonial.author}</p>
                  <p className="text-sm text-muted-foreground">{currentTestimonial.role}</p>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
          
          <div className="flex justify-center mt-8 gap-4">
            <button
              onClick={prevTestimonial}
              className="p-2 rounded-full border border-foreground/10 hover:bg-foreground/5 transition-colors"
              aria-label="Témoignage précédent"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            
            <div className="flex gap-1 items-center">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentIndex(i)}
                  className={`w-2 h-2 rounded-full transition-colors ${i === currentIndex ? 'bg-custom-accent' : 'bg-foreground/20'}`}
                  aria-label={`Aller au témoignage ${i + 1}`}
                />
              ))}
            </div>
            
            <button
              onClick={nextTestimonial}
              className="p-2 rounded-full border border-foreground/10 hover:bg-foreground/5 transition-colors"
              aria-label="Témoignage suivant"
            >
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}