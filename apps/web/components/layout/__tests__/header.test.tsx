import React from 'react';
import { render, screen, fireEvent, waitFor } from '../../../tests/utils/test-utils';
import { Header } from '../header';
import { useRouter } from 'next/navigation';

jest.mock('next/navigation');

describe('Header', () => {
  const mockPush = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      pathname: '/',
    });
  });

  it('renders logo and navigation links', () => {
    render(<Header />);

    expect(screen.getByAltText('Heaven Dolls')).toBeInTheDocument();
    expect(screen.getByText('Shop')).toBeInTheDocument();
    expect(screen.getByText('Categories')).toBeInTheDocument();
    expect(screen.getByText('About')).toBeInTheDocument();
  });

  it('renders search bar', () => {
    render(<Header />);

    const searchInput = screen.getByPlaceholderText(/search products/i);
    expect(searchInput).toBeInTheDocument();
  });

  it('handles search submission', async () => {
    const { user } = render(<Header />);

    const searchInput = screen.getByPlaceholderText(/search products/i);
    await user.type(searchInput, 'test product');
    
    const searchForm = screen.getByRole('search');
    fireEvent.submit(searchForm);

    expect(mockPush).toHaveBeenCalledWith('/search?q=test%20product');
  });

  it('displays cart button with item count', () => {
    // Mock cart context or state
    render(<Header cartItemCount={3} />);

    const cartButton = screen.getByRole('button', { name: /cart/i });
    expect(cartButton).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('opens cart drawer on cart button click', async () => {
    const { user } = render(<Header />);

    const cartButton = screen.getByRole('button', { name: /cart/i });
    await user.click(cartButton);

    expect(screen.getByRole('dialog', { name: /shopping cart/i })).toBeInTheDocument();
  });

  it('displays wishlist button', () => {
    render(<Header />);

    const wishlistButton = screen.getByRole('button', { name: /wishlist/i });
    expect(wishlistButton).toBeInTheDocument();
  });

  it('handles mobile menu toggle', async () => {
    const { user } = render(<Header />);

    const mobileMenuButton = screen.getByRole('button', { name: /menu/i });
    await user.click(mobileMenuButton);

    // Mobile menu should be visible
    expect(screen.getByTestId('mobile-menu')).toBeVisible();
  });

  it('shows user menu when authenticated', () => {
    render(<Header isAuthenticated={true} user={{ name: 'John Doe' }} />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.queryByText('Sign In')).not.toBeInTheDocument();
  });

  it('shows sign in button when not authenticated', () => {
    render(<Header isAuthenticated={false} />);

    expect(screen.getByText('Sign In')).toBeInTheDocument();
    expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
  });

  it('highlights active navigation link', () => {
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      pathname: '/categories',
    });

    render(<Header />);

    const categoriesLink = screen.getByText('Categories');
    expect(categoriesLink).toHaveClass('active');
  });

  it('handles sticky header on scroll', () => {
    render(<Header />);

    // Simulate scroll
    fireEvent.scroll(window, { target: { scrollY: 100 } });

    const header = screen.getByRole('banner');
    expect(header).toHaveClass('sticky');
  });

  it('shows search suggestions', async () => {
    const { user } = render(<Header />);

    const searchInput = screen.getByPlaceholderText(/search products/i);
    await user.type(searchInput, 'doll');

    await waitFor(() => {
      expect(screen.getByText('Trending: dolls for adults')).toBeInTheDocument();
      expect(screen.getByText('Popular: wellness dolls')).toBeInTheDocument();
    });
  });

  it('clears search on escape key', async () => {
    const { user } = render(<Header />);

    const searchInput = screen.getByPlaceholderText(/search products/i);
    await user.type(searchInput, 'test');
    
    expect(searchInput).toHaveValue('test');

    fireEvent.keyDown(searchInput, { key: 'Escape' });
    
    expect(searchInput).toHaveValue('');
  });

  it('opens category dropdown on hover', async () => {
    const { user } = render(<Header />);

    const categoriesLink = screen.getByText('Categories');
    await user.hover(categoriesLink);

    await waitFor(() => {
      expect(screen.getByRole('menu', { name: /categories/i })).toBeVisible();
    });
  });

  it('navigates to category page from dropdown', async () => {
    const { user } = render(<Header />);

    const categoriesLink = screen.getByText('Categories');
    await user.hover(categoriesLink);

    const categoryItem = await screen.findByText('Wellness Products');
    await user.click(categoryItem);

    expect(mockPush).toHaveBeenCalledWith('/categories/wellness-products');
  });

  it('shows promotional banner when enabled', () => {
    render(<Header showPromo={true} promoText="Free shipping on orders over $50!" />);

    expect(screen.getByText('Free shipping on orders over $50!')).toBeInTheDocument();
  });

  it('closes promotional banner', async () => {
    const { user } = render(<Header showPromo={true} promoText="Sale!" />);

    const closeButton = screen.getByRole('button', { name: /close/i });
    await user.click(closeButton);

    expect(screen.queryByText('Sale!')).not.toBeInTheDocument();
  });
});