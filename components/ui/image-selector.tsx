// components/ui/image-selector.tsx
'use client'

import { useState } from 'react';
import { Upload, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getPresetImagesByCategory, CATEGORY_LABELS } from '@/types/images';
import { ProductType } from '@prisma/client';

interface ImageSelectorProps {
  onSelectImage: (imageValue: string | File | null) => void;
  selectedPreset: string | null;
  className?: string;
}

export function ImageSelector({ 
  onSelectImage, 
  selectedPreset,
  className 
}: ImageSelectorProps) {
  const [useCustomImage, setUseCustomImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const presetImagesByCategory = getPresetImagesByCategory();

  function handleCustomImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("L'image ne doit pas dépasser 5MB");
        return;
      }

      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        alert("Format d'image non supporté. Utilisez JPG, PNG ou WebP");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      onSelectImage(file);
    }
  }

  function handlePresetSelect(presetId: string) {
    setUseCustomImage(false);
    setImagePreview(null);
    onSelectImage(presetId);
  }

  // Rendu des images d'une catégorie
  function renderCategoryImages(category: ProductType) {
    const images = presetImagesByCategory[category] || [];
    if (images.length === 0) return null;

    return (
      <div key={category} className="space-y-3">
        <h3 className="text-lg font-montserrat text-foreground font-semibold">
          {CATEGORY_LABELS[category]}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {images.map((image) => (
            <div
              key={image.id}
              className={cn(
                "relative cursor-pointer group rounded-lg overflow-hidden border-2 transition-all duration-200",
                selectedPreset === image.id
                  ? "border-primary shadow-hover"
                  : "border-border hover:border-foreground/30 hover:shadow-card"
              )}
              onClick={() => handlePresetSelect(image.id)}
            >
              <img
                src={image.src}
                alt={image.alt}
                className="w-full aspect-square object-cover transition-transform duration-200 group-hover:scale-105"
              />
              {selectedPreset === image.id && (
                <div className="absolute inset-0 bg-primary/20 flex items-center justify-center backdrop-blur-sm">
                  <div className="bg-primary text-primary-foreground rounded-full p-2">
                    <Check className="w-6 h-6" />
                  </div>
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-background/90 backdrop-blur-sm text-foreground p-2 text-sm text-center border-t border-border">
                {image.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Toggle entre preset et upload personnalisé */}
      <div className="flex gap-2 p-1 bg-muted rounded-lg">
        <button
          type="button"
          onClick={() => setUseCustomImage(false)}
          className={cn(
            "flex-1 py-2 px-4 rounded-md transition-all duration-200 text-sm font-medium",
            !useCustomImage
              ? "bg-primary text-primary-foreground shadow-minimal"
              : "text-muted-foreground hover:text-foreground hover:bg-background"
          )}
        >
          Images prédéfinies
        </button>
        <button
          type="button"
          onClick={() => setUseCustomImage(true)}
          className={cn(
            "flex-1 py-2 px-4 rounded-md transition-all duration-200 text-sm font-medium",
            useCustomImage
              ? "bg-primary text-primary-foreground shadow-minimal"
              : "text-muted-foreground hover:text-foreground hover:bg-background"
          )}
        >
          Upload personnalisé
        </button>
      </div>

      {useCustomImage ? (
        <div className="space-y-4">
          <div className="flex items-center justify-center w-full">
            <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer border-border bg-background hover:bg-accent hover:border-foreground/30 transition-all duration-200 group">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-8 h-8 mb-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                <p className="mb-2 text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                  <span className="font-semibold">Cliquez pour uploader</span> ou glissez-déposez
                </p>
                <p className="text-xs text-muted-foreground">PNG, JPG ou WebP (MAX. 5MB)</p>
              </div>
              <input
                type="file"
                className="hidden"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleCustomImageChange}
              />
            </label>
          </div>
          {imagePreview && (
            <div className="relative w-full max-w-xs mx-auto">
              <img
                src={imagePreview}
                alt="Aperçu"
                className="rounded-lg border border-border shadow-card"
              />
              <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground rounded-full p-1">
                <Check className="w-4 h-4" />
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {/* Afficher les images par catégorie */}
          {Object.values(ProductType).map((category) => 
            renderCategoryImages(category)
          )}
        </div>
      )}
    </div>
  );
}