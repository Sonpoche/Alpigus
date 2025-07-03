
// components/wishlist/wishlist-button.tsx
'use client'

import { useState, useEffect } from 'react'
import { Heart } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'

interface WishlistButtonProps {
  productId: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'ghost' | 'outline'
  className?: string
  showLabel?: boolean
  onToggle?: (isFavorite: boolean) => void
}

export function WishlistButton({ 
  productId, 
  size = 'md', 
  variant = 'ghost',
  className,
  showLabel = false,
  onToggle
}: WishlistButtonProps) {
  const { data: session } = useSession()
  const { toast } = useToast()
  const router = useRouter()
  const [isFavorite, setIsFavorite] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isCheckingStatus, setIsCheckingStatus] = useState(true)

  // Vérifier si le produit est déjà en favori
  useEffect(() => {
    if (!session?.user?.id) {
      setIsCheckingStatus(false)
      return
    }

    const checkFavoriteStatus = async () => {
      try {
        const response = await fetch(`/api/wishlist/${productId}`)
        if (response.ok) {
          const data = await response.json()
          setIsFavorite(data.isFavorite)
        }
      } catch (error) {
        console.error('Erreur lors de la vérification des favoris:', error)
      } finally {
        setIsCheckingStatus(false)
      }
    }

    checkFavoriteStatus()
  }, [productId, session?.user?.id])

  const handleToggleFavorite = async (e?: React.MouseEvent) => {
    // Empêcher la propagation pour éviter les conflits avec les liens parents
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }

    if (!session?.user?.id) {
      toast({
        title: "Connexion requise",
        description: "Vous devez être connecté pour ajouter des favoris",
        variant: "destructive"
      })
      router.push('/login')
      return
    }

    setIsLoading(true)

    try {
      if (isFavorite) {
        // Supprimer des favoris
        const response = await fetch(`/api/wishlist/${productId}`, {
          method: 'DELETE'
        })

        if (response.ok) {
          setIsFavorite(false)
          onToggle?.(false)
          toast({
            title: "Retiré des favoris",
            description: "Le produit a été retiré de vos favoris",
            duration: 2000
          })
        } else {
          const errorText = await response.text()
          throw new Error(errorText || 'Erreur lors de la suppression')
        }
      } else {
        // Ajouter aux favoris
        const response = await fetch('/api/wishlist', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ productId })
        })

        if (response.ok) {
          setIsFavorite(true)
          onToggle?.(true)
          toast({
            title: "Ajouté aux favoris",
            description: "Le produit a été ajouté à vos favoris",
            duration: 2000
          })
        } else if (response.status === 409) {
          // Produit déjà dans les favoris
          setIsFavorite(true)
          onToggle?.(true)
          toast({
            title: "Déjà dans les favoris",
            description: "Ce produit est déjà dans vos favoris"
          })
        } else {
          const errorText = await response.text()
          throw new Error(errorText || 'Erreur lors de l\'ajout')
        }
      }
    } catch (error: any) {
      console.error('Erreur:', error)
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue. Veuillez réessayer.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Classes de taille
  const sizeClasses = {
    sm: showLabel ? 'h-8 px-3' : 'h-8 w-8',
    md: showLabel ? 'h-10 px-4' : 'h-10 w-10',
    lg: showLabel ? 'h-12 px-6' : 'h-12 w-12'
  }

  // Classes d'icône
  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  }

  // Classes de variante
  const variantClasses = {
    default: 'bg-background hover:bg-muted border border-input',
    ghost: 'hover:bg-background/80 border-0',
    outline: 'border border-input hover:bg-accent hover:text-accent-foreground'
  }

  // Classes d'état du cœur
  const heartClasses = cn(
    iconSizes[size],
    "transition-all duration-200",
    isFavorite 
      ? "fill-red-500 text-red-500 scale-110" 
      : "text-muted-foreground hover:text-red-500 hover:scale-105"
  )

  return (
    <motion.button
      onClick={handleToggleFavorite}
      disabled={isLoading || isCheckingStatus}
      className={cn(
        "inline-flex items-center justify-center rounded-md font-medium transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",
        "relative overflow-hidden",
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
      title={
        isCheckingStatus 
          ? "Vérification..." 
          : isFavorite 
            ? "Retirer des favoris" 
            : "Ajouter aux favoris"
      }
      whileTap={{ scale: 0.95 }}
      whileHover={{ scale: 1.05 }}
    >
      {/* Animation de chargement */}
      {(isLoading || isCheckingStatus) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-md"
        >
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-muted border-t-custom-accent" />
        </motion.div>
      )}

      {/* Icône du cœur */}
      <motion.div
        initial={false}
        animate={{
          scale: isFavorite ? [1, 1.2, 1] : 1,
          rotate: isFavorite ? [0, -10, 10, 0] : 0
        }}
        transition={{ duration: 0.3 }}
      >
        <Heart className={heartClasses} />
      </motion.div>

      {/* Label optionnel */}
      {showLabel && (
        <span className="ml-2 text-sm">
          {isFavorite ? 'Favori' : 'Ajouter'}
        </span>
      )}

      {/* Animation de particules lors de l'ajout */}
      {isFavorite && (
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: [0, 1, 0], scale: [0, 1.5, 0] }}
          transition={{ duration: 0.6 }}
          className="absolute inset-0 pointer-events-none"
        >
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ 
                opacity: [0, 1, 0], 
                scale: [0, 1, 0],
                x: [0, (Math.random() - 0.5) * 40],
                y: [0, (Math.random() - 0.5) * 40]
              }}
              transition={{ 
                duration: 0.8, 
                delay: i * 0.1,
                ease: "easeOut"
              }}
              className="absolute top-1/2 left-1/2 w-1 h-1 bg-red-500 rounded-full transform -translate-x-1/2 -translate-y-1/2"
            />
          ))}
        </motion.div>
      )}
    </motion.button>
  )
}