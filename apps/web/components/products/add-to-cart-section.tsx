'use client';

import { useState } from 'react';
import { Button, Badge } from '@heaven-dolls/ui';
import { ShoppingBag, Plus, Minus } from 'lucide-react';
import type { Product, ProductVariant } from '@heaven-dolls/types';

interface AddToCartSectionProps {
  product: Product;
  isOutOfStock: boolean;
}

export function AddToCartSection({ product, isOutOfStock }: AddToCartSectionProps) {
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);

  const variants = product.attributes.variants?.data || [];
  const hasVariants = variants.length > 0;
  
  // Use variant stock if variant is selected, otherwise use product stock
  const currentStock = selectedVariant 
    ? selectedVariant.attributes.stockQuantity 
    : product.attributes.stockQuantity;
    
  // Use variant price if variant is selected, otherwise use product price
  const currentPrice = selectedVariant 
    ? selectedVariant.attributes.price 
    : product.attributes.price;

  const maxQuantity = Math.min(currentStock, 10); // Limit to 10 or stock quantity
  const canAddToCart = !isOutOfStock && (!hasVariants || selectedVariant) && quantity > 0;

  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity >= 1 && newQuantity <= maxQuantity) {
      setQuantity(newQuantity);
    }
  };

  const handleVariantSelect = (variant: ProductVariant) => {
    setSelectedVariant(variant);
    // Reset quantity if it exceeds the new variant's stock
    if (quantity > variant.attributes.stockQuantity) {
      setQuantity(Math.min(variant.attributes.stockQuantity, 1));
    }
  };

  const handleAddToCart = () => {
    // TODO: Implement add to cart functionality
    console.log('Adding to cart:', {
      product: product,
      variant: selectedVariant,
      quantity: quantity,
      price: currentPrice,
    });
  };

  return (
    <div className="space-y-4">
      {/* Variant Selection */}
      {hasVariants && (
        <div className="space-y-3">
          <p className="font-medium">Available Options:</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {variants.map((variant) => (
              <button
                key={variant.id}
                onClick={() => handleVariantSelect(variant)}
                className={`
                  p-3 border rounded-lg text-sm transition-colors
                  ${selectedVariant?.id === variant.id
                    ? 'border-brand-600 bg-brand-50 text-brand-900'
                    : 'border-border hover:border-brand-300'
                  }
                  ${variant.attributes.stockQuantity === 0 
                    ? 'opacity-50 cursor-not-allowed' 
                    : 'cursor-pointer'
                  }
                `}
                disabled={variant.attributes.stockQuantity === 0}
              >
                <div className="font-medium">{variant.attributes.name}</div>
                <div className="text-xs text-muted-foreground">
                  ${variant.attributes.price}
                </div>
                {variant.attributes.stockQuantity === 0 && (
                  <Badge variant="secondary" className="mt-1 text-xs">
                    Out of Stock
                  </Badge>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Stock Status */}
      <div className="flex items-center gap-2">
        {isOutOfStock ? (
          <Badge variant="destructive">Out of Stock</Badge>
        ) : currentStock <= 5 ? (
          <Badge variant="warning">Only {currentStock} left in stock</Badge>
        ) : (
          <Badge variant="success">In Stock</Badge>
        )}
      </div>

      {/* Quantity Selector */}
      {!isOutOfStock && (
        <div className="flex items-center gap-4">
          <p className="font-medium">Quantity:</p>
          <div className="flex items-center border rounded-lg">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleQuantityChange(quantity - 1)}
              disabled={quantity <= 1}
              className="h-10 w-10 p-0 rounded-r-none"
            >
              <Minus className="h-4 w-4" />
            </Button>
            <div className="h-10 w-16 flex items-center justify-center border-x text-sm font-medium">
              {quantity}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleQuantityChange(quantity + 1)}
              disabled={quantity >= maxQuantity}
              className="h-10 w-10 p-0 rounded-l-none"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <span className="text-sm text-muted-foreground">
            Max: {maxQuantity}
          </span>
        </div>
      )}

      {/* Add to Cart Button */}
      <div className="space-y-2">
        <Button
          size="lg"
          className="w-full"
          onClick={handleAddToCart}
          disabled={!canAddToCart}
        >
          <ShoppingBag className="h-4 w-4 mr-2" />
          {isOutOfStock 
            ? 'Out of Stock' 
            : hasVariants && !selectedVariant
            ? 'Select Options'
            : `Add to Cart - $${(currentPrice * quantity).toFixed(2)}`
          }
        </Button>
        
        {hasVariants && !selectedVariant && (
          <p className="text-xs text-muted-foreground text-center">
            Please select your preferred options above
          </p>
        )}
      </div>
    </div>
  );
}