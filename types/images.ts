import { ProductType } from '@prisma/client'

export interface PresetImage {
  id: string;
  src: string;
  alt: string;
  label: string;
  category: ProductType;
}

export const PRESET_IMAGES: PresetImage[] = [
  // Champignons Frais
  {
    id: 'morel',
    src: '/presets/mushrooms/optimized/morel.jpg',
    alt: 'Morille Fraîche',
    label: 'Morille',
    category: ProductType.FRESH
  },
  {
    id: 'shimeji',
    src: '/presets/mushrooms/optimized/shimeji.jpg',
    alt: 'Shimeji Frais',
    label: 'Shimeji',
    category: ProductType.FRESH
  },
  // Champignons Séchés
  {
    id: 'nameko',
    src: '/presets/mushrooms/optimized/nameko.jpg',
    alt: 'Nameko Séché',
    label: 'Nameko Séché',
    category: ProductType.DRIED
  },
  // Produits Bien-être
  {
    id: 'truffle',
    src: '/presets/mushrooms/optimized/truffle.jpg',
    alt: 'Poudre de Truffe',
    label: 'Poudre de Truffe',
    category: ProductType.WELLNESS
  }
];

// Fonction utilitaire pour grouper les images par catégorie
export function getPresetImagesByCategory(): Record<ProductType, PresetImage[]> {
  return PRESET_IMAGES.reduce((acc, image) => {
    if (!acc[image.category]) {
      acc[image.category] = [];
    }
    acc[image.category].push(image);
    return acc;
  }, {} as Record<ProductType, PresetImage[]>);
}

// Map des labels pour les catégories
export const CATEGORY_LABELS: Record<ProductType, string> = {
  [ProductType.FRESH]: 'Champignons Frais',
  [ProductType.DRIED]: 'Champignons Séchés',
  [ProductType.SUBSTRATE]: 'Substrats',
  [ProductType.WELLNESS]: 'Bien-être'
};