import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base-page';

export class SearchPage extends BasePage {
  // Search elements
  readonly searchInput: Locator;
  readonly searchButton: Locator;
  readonly searchResults: Locator;
  readonly resultsCount: Locator;
  readonly noResultsMessage: Locator;
  readonly searchSuggestions: Locator;
  readonly recentSearches: Locator;
  readonly popularSearches: Locator;

  // Search results
  readonly productCards: Locator;
  readonly productCard: Locator;
  readonly resultsPagination: Locator;
  readonly loadMoreButton: Locator;

  // Filters
  readonly filtersPanel: Locator;
  readonly priceFilter: Locator;
  readonly categoryFilter: Locator;
  readonly brandFilter: Locator;
  readonly ratingFilter: Locator;
  readonly availabilityFilter: Locator;
  readonly clearFiltersButton: Locator;
  readonly applyFiltersButton: Locator;
  readonly filterToggle: Locator;

  // Sorting
  readonly sortSelector: Locator;
  readonly sortByRelevance: Locator;
  readonly sortByPrice: Locator;
  readonly sortByRating: Locator;
  readonly sortByNewest: Locator;
  readonly sortByPopular: Locator;

  // Search metadata
  readonly searchQuery: Locator;
  readonly searchTime: Locator;
  readonly appliedFilters: Locator;
  readonly searchHistory: Locator;

  // Search autocomplete
  readonly autocompleteDropdown: Locator;
  readonly autocompleteSuggestions: Locator;
  readonly autocompleteProducts: Locator;
  readonly autocompleteCategories: Locator;

  // View options
  readonly gridViewButton: Locator;
  readonly listViewButton: Locator;
  readonly resultsPerPageSelector: Locator;

  // Mobile search
  readonly mobileSearchToggle: Locator;
  readonly mobileFiltersButton: Locator;
  readonly mobileFiltersDrawer: Locator;

  constructor(page: Page) {
    super(page);

    // Search elements
    this.searchInput = page.getByPlaceholder(/search products|search/i);
    this.searchButton = page.getByRole('button', { name: /search/i });
    this.searchResults = page.locator('[data-testid="search-results"]');
    this.resultsCount = page.locator('[data-testid="results-count"]');
    this.noResultsMessage = page.getByText(/no results found|no products found/i);
    this.searchSuggestions = page.locator('[data-testid="search-suggestions"]');
    this.recentSearches = page.locator('[data-testid="recent-searches"]');
    this.popularSearches = page.locator('[data-testid="popular-searches"]');

    // Search results
    this.productCards = page.locator('[data-testid="product-card"]');
    this.productCard = this.productCards.first();
    this.resultsPagination = page.locator('[data-testid="pagination"]');
    this.loadMoreButton = page.getByRole('button', { name: /load more|show more/i });

    // Filters
    this.filtersPanel = page.locator('[data-testid="filters-panel"]');
    this.priceFilter = page.locator('[data-testid="price-filter"]');
    this.categoryFilter = page.locator('[data-testid="category-filter"]');
    this.brandFilter = page.locator('[data-testid="brand-filter"]');
    this.ratingFilter = page.locator('[data-testid="rating-filter"]');
    this.availabilityFilter = page.locator('[data-testid="availability-filter"]');
    this.clearFiltersButton = page.getByRole('button', { name: /clear filters|reset/i });
    this.applyFiltersButton = page.getByRole('button', { name: /apply filters/i });
    this.filterToggle = page.getByRole('button', { name: /filters|filter/i });

    // Sorting
    this.sortSelector = page.locator('[data-testid="sort-selector"]');
    this.sortByRelevance = page.getByRole('option', { name: /relevance/i });
    this.sortByPrice = page.getByRole('option', { name: /price/i });
    this.sortByRating = page.getByRole('option', { name: /rating/i });
    this.sortByNewest = page.getByRole('option', { name: /newest|latest/i });
    this.sortByPopular = page.getByRole('option', { name: /popular|trending/i });

    // Search metadata
    this.searchQuery = page.locator('[data-testid="search-query"]');
    this.searchTime = page.locator('[data-testid="search-time"]');
    this.appliedFilters = page.locator('[data-testid="applied-filters"]');
    this.searchHistory = page.locator('[data-testid="search-history"]');

    // Search autocomplete
    this.autocompleteDropdown = page.locator('[data-testid="autocomplete-dropdown"]');
    this.autocompleteSuggestions = page.locator('[data-testid="autocomplete-suggestions"]');
    this.autocompleteProducts = page.locator('[data-testid="autocomplete-products"]');
    this.autocompleteCategories = page.locator('[data-testid="autocomplete-categories"]');

    // View options
    this.gridViewButton = page.getByRole('button', { name: /grid view/i });
    this.listViewButton = page.getByRole('button', { name: /list view/i });
    this.resultsPerPageSelector = page.locator('[data-testid="results-per-page"]');

    // Mobile search
    this.mobileSearchToggle = page.getByRole('button', { name: /search/i });
    this.mobileFiltersButton = page.getByRole('button', { name: /filters/i });
    this.mobileFiltersDrawer = page.locator('[data-testid="mobile-filters-drawer"]');
  }

  /**
   * Navigate to search page
   */
  async navigate(query?: string): Promise<void> {
    const url = query ? `/search?q=${encodeURIComponent(query)}` : '/search';
    await this.goto(url);
  }

  /**
   * Perform search
   */
  async performSearch(query: string): Promise<void> {
    await this.fillInput(this.searchInput, query);
    await this.clickElement(this.searchButton);
    await this.waitForLoadingToComplete();
  }

  /**
   * Perform search with Enter key
   */
  async performSearchWithEnter(query: string): Promise<void> {
    await this.fillInput(this.searchInput, query);
    await this.page.keyboard.press('Enter');
    await this.waitForLoadingToComplete();
  }

  /**
   * Verify search page is loaded
   */
  async verifyPageLoaded(): Promise<void> {
    await expect(this.searchInput).toBeVisible();
    await expect(this.page.getByRole('heading', { name: /search results|results for/i })).toBeVisible();
    await this.waitForLoadingToComplete();
  }

  /**
   * Verify search results
   */
  async verifySearchResults(expectedCount?: number): Promise<void> {
    await expect(this.searchResults).toBeVisible();
    await expect(this.resultsCount).toBeVisible();
    
    if (expectedCount !== undefined) {
      await expect(this.productCards).toHaveCount(expectedCount);
    } else {
      await expect(this.productCards).toHaveCount.greaterThan(0);
    }
  }

  /**
   * Verify no results message
   */
  async verifyNoResults(): Promise<void> {
    await expect(this.noResultsMessage).toBeVisible();
    await expect(this.productCards).toHaveCount(0);
  }

  /**
   * Get results count
   */
  async getResultsCount(): Promise<number> {
    const resultsText = await this.getElementText(this.resultsCount);
    const match = resultsText.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  }

  /**
   * Apply price filter
   */
  async applyPriceFilter(minPrice: number, maxPrice: number): Promise<void> {
    await this.clickElement(this.priceFilter);
    
    const minPriceInput = this.priceFilter.locator('[data-testid="min-price"]');
    const maxPriceInput = this.priceFilter.locator('[data-testid="max-price"]');
    
    await this.fillInput(minPriceInput, minPrice.toString());
    await this.fillInput(maxPriceInput, maxPrice.toString());
    
    await this.clickElement(this.applyFiltersButton);
    await this.waitForLoadingToComplete();
  }

  /**
   * Apply category filter
   */
  async applyCategoryFilter(categoryName: string): Promise<void> {
    await this.clickElement(this.categoryFilter);
    await this.clickElement(this.categoryFilter.getByText(categoryName));
    await this.waitForLoadingToComplete();
  }

  /**
   * Apply brand filter
   */
  async applyBrandFilter(brandName: string): Promise<void> {
    await this.clickElement(this.brandFilter);
    await this.clickElement(this.brandFilter.getByText(brandName));
    await this.waitForLoadingToComplete();
  }

  /**
   * Apply rating filter
   */
  async applyRatingFilter(minRating: number): Promise<void> {
    await this.clickElement(this.ratingFilter);
    await this.clickElement(this.ratingFilter.locator(`[data-rating="${minRating}"]`));
    await this.waitForLoadingToComplete();
  }

  /**
   * Apply availability filter
   */
  async applyAvailabilityFilter(availability: 'in-stock' | 'out-of-stock'): Promise<void> {
    await this.clickElement(this.availabilityFilter);
    await this.clickElement(this.availabilityFilter.locator(`[data-availability="${availability}"]`));
    await this.waitForLoadingToComplete();
  }

  /**
   * Clear all filters
   */
  async clearAllFilters(): Promise<void> {
    await this.clickElement(this.clearFiltersButton);
    await this.waitForLoadingToComplete();
  }

  /**
   * Change sort order
   */
  async changeSortOrder(sortOption: 'relevance' | 'price' | 'rating' | 'newest' | 'popular'): Promise<void> {
    await this.clickElement(this.sortSelector);
    
    const sortMap = {
      relevance: this.sortByRelevance,
      price: this.sortByPrice,
      rating: this.sortByRating,
      newest: this.sortByNewest,
      popular: this.sortByPopular
    };
    
    await this.clickElement(sortMap[sortOption]);
    await this.waitForLoadingToComplete();
  }

  /**
   * Test autocomplete functionality
   */
  async testAutocomplete(query: string): Promise<void> {
    await this.fillInput(this.searchInput, query);
    
    // Wait for autocomplete to appear
    await expect(this.autocompleteDropdown).toBeVisible();
    
    // Verify suggestions are shown
    await expect(this.autocompleteSuggestions).toHaveCount.greaterThan(0);
  }

  /**
   * Select autocomplete suggestion
   */
  async selectAutocompleteSuggestion(index: number = 0): Promise<void> {
    await this.clickElement(this.autocompleteSuggestions.nth(index));
    await this.waitForLoadingToComplete();
  }

  /**
   * Navigate search results pagination
   */
  async navigateToPage(pageNumber: number): Promise<void> {
    await this.scrollToElement(this.resultsPagination);
    await this.clickElement(this.resultsPagination.getByText(pageNumber.toString()));
    await this.waitForLoadingToComplete();
  }

  /**
   * Load more results (infinite scroll)
   */
  async loadMoreResults(): Promise<void> {
    if (await this.isElementVisible(this.loadMoreButton)) {
      await this.scrollToElement(this.loadMoreButton);
      await this.clickElement(this.loadMoreButton);
      await this.waitForLoadingToComplete();
    }
  }

  /**
   * Switch to grid view
   */
  async switchToGridView(): Promise<void> {
    await this.clickElement(this.gridViewButton);
    await expect(this.searchResults).toHaveClass(/grid/);
  }

  /**
   * Switch to list view
   */
  async switchToListView(): Promise<void> {
    await this.clickElement(this.listViewButton);
    await expect(this.searchResults).toHaveClass(/list/);
  }

  /**
   * Change results per page
   */
  async changeResultsPerPage(count: number): Promise<void> {
    await this.clickElement(this.resultsPerPageSelector);
    await this.clickElement(this.page.getByText(count.toString()));
    await this.waitForLoadingToComplete();
  }

  /**
   * Click product from search results
   */
  async clickProduct(index: number = 0): Promise<void> {
    await this.clickElement(this.productCards.nth(index));
  }

  /**
   * Add product to cart from search results
   */
  async addProductToCartFromResults(index: number = 0): Promise<void> {
    const productCard = this.productCards.nth(index);
    const addToCartButton = productCard.getByRole('button', { name: /add to cart/i });
    await this.clickElement(addToCartButton);
  }

  /**
   * Verify search query in URL
   */
  async verifySearchQueryInUrl(query: string): Promise<void> {
    await this.verifyUrlContains(`q=${encodeURIComponent(query)}`);
  }

  /**
   * Verify applied filters in UI
   */
  async verifyAppliedFilters(): Promise<void> {
    await expect(this.appliedFilters).toBeVisible();
    await expect(this.appliedFilters.locator('[data-testid="applied-filter"]')).toHaveCount.greaterThan(0);
  }

  /**
   * Remove applied filter
   */
  async removeAppliedFilter(filterName: string): Promise<void> {
    const filter = this.appliedFilters.getByText(filterName);
    const removeButton = filter.locator('[data-testid="remove-filter"]');
    await this.clickElement(removeButton);
    await this.waitForLoadingToComplete();
  }

  /**
   * Test mobile search functionality
   */
  async testMobileSearch(query: string): Promise<void> {
    if (await this.isElementVisible(this.mobileSearchToggle)) {
      await this.clickElement(this.mobileSearchToggle);
      await expect(this.searchInput).toBeVisible();
      await this.performSearch(query);
    }
  }

  /**
   * Open mobile filters
   */
  async openMobileFilters(): Promise<void> {
    if (await this.isElementVisible(this.mobileFiltersButton)) {
      await this.clickElement(this.mobileFiltersButton);
      await expect(this.mobileFiltersDrawer).toBeVisible();
    }
  }

  /**
   * Close mobile filters
   */
  async closeMobileFilters(): Promise<void> {
    const closeButton = this.mobileFiltersDrawer.getByRole('button', { name: /close/i });
    if (await this.isElementVisible(closeButton)) {
      await this.clickElement(closeButton);
      await expect(this.mobileFiltersDrawer).not.toBeVisible();
    }
  }

  /**
   * Verify search performance
   */
  async verifySearchPerformance(maxSearchTime: number = 2000): Promise<void> {
    const startTime = Date.now();
    await this.performSearch('test query');
    const searchTime = Date.now() - startTime;
    
    if (searchTime > maxSearchTime) {
      throw new Error(`Search time ${searchTime}ms exceeds maximum ${maxSearchTime}ms`);
    }
  }

  /**
   * Test search with special characters
   */
  async testSpecialCharacterSearch(): Promise<void> {
    const specialQueries = ['test"query', "test'query", 'test&query', 'test+query'];
    
    for (const query of specialQueries) {
      await this.performSearch(query);
      await this.verifySearchQueryInUrl(query);
      await this.page.goBack();
    }
  }

  /**
   * Verify search suggestions
   */
  async verifySearchSuggestions(): Promise<void> {
    if (await this.isElementVisible(this.searchSuggestions)) {
      await expect(this.searchSuggestions).toBeVisible();
      await expect(this.searchSuggestions.locator('[data-testid="suggestion"]')).toHaveCount.greaterThan(0);
    }
  }

  /**
   * Test empty search
   */
  async testEmptySearch(): Promise<void> {
    await this.performSearch('');
    // Should either show all products or show an error message
    const hasResults = await this.productCards.count() > 0;
    const hasNoResultsMessage = await this.isElementVisible(this.noResultsMessage);
    
    expect(hasResults || hasNoResultsMessage).toBeTruthy();
  }
}