'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Expand } from 'lucide-react';
import { Button } from '@heaven-dolls/ui';
import type { Media } from '@heaven-dolls/types';
import { cn } from '@heaven-dolls/ui';

interface ImageGalleryProps {
  images: Media[];
  productName: string;
  className?: string;
}

export function ImageGallery({ images, productName, className }: ImageGalleryProps) {
  const [selectedImage, setSelectedImage] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);

  if (!images.length) {
    return (
      <div className={cn("aspect-square bg-muted rounded-lg flex items-center justify-center", className)}>
        <span className="text-muted-foreground">No image available</span>
      </div>
    );
  }

  const currentImage = images[selectedImage];
  
  const nextImage = () => {
    setSelectedImage((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setSelectedImage((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Main Image */}
      <div className="relative group aspect-square rounded-lg overflow-hidden bg-muted">
        <Image
          src={currentImage.attributes.url}
          alt={currentImage.attributes.alternativeText || productName}
          fill
          className="object-cover transition-transform duration-300"
          sizes="(max-width: 768px) 100vw, 50vw"
          priority
        />

        {/* Navigation Arrows */}
        {images.length > 1 && (
          <>
            <Button
              variant="outline"
              size="icon"
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={prevImage}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={nextImage}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </>
        )}

        {/* Zoom Button */}
        <Button
          variant="outline"
          size="icon"
          className="absolute top-2 right-2 bg-white/90 hover:bg-white opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => setIsZoomed(!isZoomed)}
        >
          <Expand className="h-4 w-4" />
        </Button>

        {/* Image Counter */}
        {images.length > 1 && (
          <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
            {selectedImage + 1} / {images.length}
          </div>
        )}
      </div>

      {/* Thumbnail Gallery */}
      {images.length > 1 && (
        <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
          {images.map((image, index) => (
            <button
              key={image.id}
              onClick={() => setSelectedImage(index)}
              className={cn(
                "relative aspect-square rounded-md overflow-hidden border-2 transition-colors",
                selectedImage === index
                  ? "border-brand-600"
                  : "border-transparent hover:border-muted-foreground"
              )}
            >
              <Image
                src={image.attributes.url}
                alt={image.attributes.alternativeText || `${productName} ${index + 1}`}
                fill
                className="object-cover"
                sizes="100px"
              />
            </button>
          ))}
        </div>
      )}

      {/* Zoom Modal */}
      {isZoomed && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
          <div className="relative max-w-4xl max-h-full">
            <Image
              src={currentImage.attributes.url}
              alt={currentImage.attributes.alternativeText || productName}
              width={currentImage.attributes.width}
              height={currentImage.attributes.height}
              className="object-contain max-w-full max-h-full"
            />
            <Button
              variant="outline"
              size="icon"
              className="absolute top-4 right-4 bg-white"
              onClick={() => setIsZoomed(false)}
            >
              <ChevronRight className="h-4 w-4 rotate-45" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}