import React from 'react';
import { render, screen, fireEvent } from '../../../tests/utils/test-utils';
import { ProductCard } from '../product-card';
import { createMockProduct } from '../../../tests/utils/test-utils';

describe('ProductCard', () => {
  const mockProduct = createMockProduct();

  it('renders product information correctly', () => {
    render(<ProductCard product={mockProduct} />);

    expect(screen.getByText('Test Product')).toBeInTheDocument();
    expect(screen.getByText('$99.99')).toBeInTheDocument();
    expect(screen.getByText('$129.99')).toBeInTheDocument();
    expect(screen.getByText('4.5')).toBeInTheDocument();
    expect(screen.getByText('(10)')).toBeInTheDocument();
  });

  it('displays trend score when available', () => {
    render(<ProductCard product={mockProduct} />);
    
    expect(screen.getByText('85')).toBeInTheDocument();
    expect(screen.getByText('Trending')).toBeInTheDocument();
  });

  it('shows sold out badge when inventory is 0', () => {
    const soldOutProduct = createMockProduct({
      inventory: 0,
    });

    render(<ProductCard product={soldOutProduct} />);
    
    expect(screen.getByText('Sold Out')).toBeInTheDocument();
  });

  it('navigates to product page on click', () => {
    render(<ProductCard product={mockProduct} />);
    
    const productLink = screen.getByRole('link');
    expect(productLink).toHaveAttribute('href', '/products/test-product');
  });

  it('handles add to cart action', async () => {
    const { user } = render(<ProductCard product={mockProduct} />);
    
    const addToCartButton = screen.getByRole('button', { name: /add to cart/i });
    await user.click(addToCartButton);
    
    // Test cart functionality would be implemented here
    expect(addToCartButton).toBeInTheDocument();
  });

  it('handles add to wishlist action', async () => {
    const { user } = render(<ProductCard product={mockProduct} />);
    
    const wishlistButton = screen.getByRole('button', { name: /wishlist/i });
    await user.click(wishlistButton);
    
    // Test wishlist functionality would be implemented here
    expect(wishlistButton).toBeInTheDocument();
  });

  it('displays featured badge when product is featured', () => {
    const featuredProduct = createMockProduct({
      featured: true,
    });

    render(<ProductCard product={featuredProduct} />);
    
    expect(screen.getByText('Featured')).toBeInTheDocument();
  });

  it('calculates and displays discount percentage', () => {
    render(<ProductCard product={mockProduct} />);
    
    // With price 99.99 and compareAtPrice 129.99, discount should be ~23%
    expect(screen.getByText(/23% off/i)).toBeInTheDocument();
  });

  it('handles missing image gracefully', () => {
    const productWithoutImage = createMockProduct({
      images: { data: [] },
    });

    render(<ProductCard product={productWithoutImage} />);
    
    const image = screen.getByRole('img');
    expect(image).toHaveAttribute('alt', 'Test Product');
  });

  it('applies hover effects', async () => {
    const { user } = render(<ProductCard product={mockProduct} />);
    
    const card = screen.getByTestId('product-card');
    await user.hover(card);
    
    // Quick view button should appear on hover
    expect(screen.getByRole('button', { name: /quick view/i })).toBeVisible();
  });
});