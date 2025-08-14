import React from 'react';
import { render, screen, fireEvent, waitFor } from '../../../tests/utils/test-utils';
import { ProductFilters } from '../product-filters';
import { useCategories } from '../../../hooks/use-categories';

jest.mock('../../../hooks/use-categories');

describe('ProductFilters', () => {
  const mockOnFilterChange = jest.fn();
  const mockCategories = [
    { id: '1', name: 'Category 1', slug: 'category-1', productCount: 10 },
    { id: '2', name: 'Category 2', slug: 'category-2', productCount: 5 },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (useCategories as jest.Mock).mockReturnValue({
      data: { data: mockCategories },
      isLoading: false,
      error: null,
    });
  });

  it('renders all filter sections', () => {
    render(<ProductFilters onFilterChange={mockOnFilterChange} />);

    expect(screen.getByText('Categories')).toBeInTheDocument();
    expect(screen.getByText('Price Range')).toBeInTheDocument();
    expect(screen.getByText('Availability')).toBeInTheDocument();
    expect(screen.getByText('Rating')).toBeInTheDocument();
  });

  it('displays categories from API', () => {
    render(<ProductFilters onFilterChange={mockOnFilterChange} />);

    expect(screen.getByText('Category 1 (10)')).toBeInTheDocument();
    expect(screen.getByText('Category 2 (5)')).toBeInTheDocument();
  });

  it('handles category selection', async () => {
    const { user } = render(<ProductFilters onFilterChange={mockOnFilterChange} />);

    const category1Checkbox = screen.getByRole('checkbox', { name: /category 1/i });
    await user.click(category1Checkbox);

    expect(mockOnFilterChange).toHaveBeenCalledWith({
      categories: ['1'],
      priceRange: undefined,
      inStock: undefined,
      rating: undefined,
    });
  });

  it('handles multiple category selections', async () => {
    const { user } = render(<ProductFilters onFilterChange={mockOnFilterChange} />);

    const category1Checkbox = screen.getByRole('checkbox', { name: /category 1/i });
    const category2Checkbox = screen.getByRole('checkbox', { name: /category 2/i });

    await user.click(category1Checkbox);
    await user.click(category2Checkbox);

    expect(mockOnFilterChange).toHaveBeenLastCalledWith({
      categories: ['1', '2'],
      priceRange: undefined,
      inStock: undefined,
      rating: undefined,
    });
  });

  it('handles price range filter', async () => {
    const { user } = render(<ProductFilters onFilterChange={mockOnFilterChange} />);

    const minPriceInput = screen.getByPlaceholderText('Min');
    const maxPriceInput = screen.getByPlaceholderText('Max');

    await user.type(minPriceInput, '10');
    await user.type(maxPriceInput, '100');

    // Simulate blur or apply button click
    fireEvent.blur(maxPriceInput);

    await waitFor(() => {
      expect(mockOnFilterChange).toHaveBeenCalledWith({
        categories: [],
        priceRange: [10, 100],
        inStock: undefined,
        rating: undefined,
      });
    });
  });

  it('validates price range input', async () => {
    const { user } = render(<ProductFilters onFilterChange={mockOnFilterChange} />);

    const minPriceInput = screen.getByPlaceholderText('Min');
    const maxPriceInput = screen.getByPlaceholderText('Max');

    // Invalid: max < min
    await user.type(minPriceInput, '100');
    await user.type(maxPriceInput, '50');
    fireEvent.blur(maxPriceInput);

    expect(screen.getByText('Max price must be greater than min price')).toBeInTheDocument();
  });

  it('handles availability filter', async () => {
    const { user } = render(<ProductFilters onFilterChange={mockOnFilterChange} />);

    const inStockCheckbox = screen.getByRole('checkbox', { name: /in stock only/i });
    await user.click(inStockCheckbox);

    expect(mockOnFilterChange).toHaveBeenCalledWith({
      categories: [],
      priceRange: undefined,
      inStock: true,
      rating: undefined,
    });
  });

  it('handles rating filter', async () => {
    const { user } = render(<ProductFilters onFilterChange={mockOnFilterChange} />);

    const fourStarsButton = screen.getByRole('button', { name: /4 stars & up/i });
    await user.click(fourStarsButton);

    expect(mockOnFilterChange).toHaveBeenCalledWith({
      categories: [],
      priceRange: undefined,
      inStock: undefined,
      rating: 4,
    });
  });

  it('clears all filters', async () => {
    const { user } = render(
      <ProductFilters 
        onFilterChange={mockOnFilterChange}
        initialFilters={{
          categories: ['1'],
          priceRange: [10, 100],
          inStock: true,
          rating: 4,
        }}
      />
    );

    const clearButton = screen.getByRole('button', { name: /clear all/i });
    await user.click(clearButton);

    expect(mockOnFilterChange).toHaveBeenCalledWith({
      categories: [],
      priceRange: undefined,
      inStock: undefined,
      rating: undefined,
    });
  });

  it('shows loading state for categories', () => {
    (useCategories as jest.Mock).mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
    });

    render(<ProductFilters onFilterChange={mockOnFilterChange} />);

    expect(screen.getByTestId('categories-skeleton')).toBeInTheDocument();
  });

  it('handles categories error state', () => {
    (useCategories as jest.Mock).mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error('Failed to load categories'),
    });

    render(<ProductFilters onFilterChange={mockOnFilterChange} />);

    expect(screen.getByText('Failed to load categories')).toBeInTheDocument();
  });

  it('persists filter state', () => {
    const initialFilters = {
      categories: ['1'],
      priceRange: [20, 80] as [number, number],
      inStock: true,
      rating: 3,
    };

    render(
      <ProductFilters 
        onFilterChange={mockOnFilterChange}
        initialFilters={initialFilters}
      />
    );

    // Check that initial filters are applied
    expect(screen.getByRole('checkbox', { name: /category 1/i })).toBeChecked();
    expect(screen.getByDisplayValue('20')).toBeInTheDocument();
    expect(screen.getByDisplayValue('80')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /in stock only/i })).toBeChecked();
  });

  it('collapses and expands filter sections', async () => {
    const { user } = render(<ProductFilters onFilterChange={mockOnFilterChange} />);

    const categoriesHeader = screen.getByRole('button', { name: /categories/i });
    
    // Initially expanded
    expect(screen.getByText('Category 1 (10)')).toBeVisible();

    // Collapse
    await user.click(categoriesHeader);
    expect(screen.queryByText('Category 1 (10)')).not.toBeVisible();

    // Expand again
    await user.click(categoriesHeader);
    expect(screen.getByText('Category 1 (10)')).toBeVisible();
  });

  it('shows active filter count', () => {
    render(
      <ProductFilters 
        onFilterChange={mockOnFilterChange}
        initialFilters={{
          categories: ['1', '2'],
          priceRange: [10, 100],
          inStock: true,
        }}
      />
    );

    expect(screen.getByText('4 active filters')).toBeInTheDocument();
  });
});