// components/home/how-it-works.tsx
import { ShoppingCart, Truck, CreditCard, ClipboardCheck } from 'lucide-react'

export default function HowItWorks() {
  const steps = [
    {
      id: 1,
      icon: <ShoppingCart className="h-8 w-8" />,
      title: "Parcourez notre catalogue",
      description: "Découvrez notre sélection de champignons frais, séchés, de substrats et de produits bien-être."
    },
    {
      id: 2,
      icon: <ClipboardCheck className="h-8 w-8" />,
      title: "Réservez vos produits",
      description: "Sélectionnez les produits et quantités désirés, et planifiez votre livraison via notre calendrier."
    },
    {
      id: 3,
      icon: <CreditCard className="h-8 w-8" />,
      title: "Validez votre commande",
      description: "Choisissez votre méthode de paiement et finalisez votre commande en toute sécurité."
    },
    {
      id: 4,
      icon: <Truck className="h-8 w-8" />,
      title: "Recevez votre livraison",
      description: "Vos produits sont livrés frais à la date que vous avez choisie, partout en Suisse."
    }
  ]
  
  return (
    <section className="py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-center font-montserrat text-custom-title mb-4">
          Comment ça marche ?
        </h2>
        <p className="text-center text-custom-text max-w-2xl mx-auto mb-12">
          Achetez et vendez des champignons de qualité en toute simplicité grâce à notre plateforme B2B
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step) => (
            <div 
              key={step.id} 
              className="flex flex-col items-center text-center p-6 bg-background border border-foreground/10 rounded-lg transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
            >
              <div className="w-16 h-16 bg-custom-accentLight rounded-full flex items-center justify-center mb-4">
                <div className="text-custom-accent">
                  {step.icon}
                </div>
              </div>
              <div className="absolute -mt-12 flex items-center justify-center rounded-full w-8 h-8 bg-custom-accent text-white font-bold">
                {step.id}
              </div>
              <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
              <p className="text-sm text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}