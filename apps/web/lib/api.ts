import type { 
  Product, 
  Category, 
  Brand, 
  Review,
  StrapiResponse, 
  StrapiListResponse,
  ExtendedProductFilters 
} from '@heaven-dolls/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337/api';

interface ApiClientOptions {
  populate?: string;
  filters?: Record<string, any>;
  sort?: string;
  pagination?: {
    page?: number;
    pageSize?: number;
  };
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private buildQuery(options: ApiClientOptions = {}): string {
    const params = new URLSearchParams();

    if (options.populate) {
      params.append('populate', options.populate);
    }

    if (options.filters) {
      Object.entries(options.filters).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          value.forEach(v => params.append(`filters[${key}][$in]`, v));
        } else if (typeof value === 'object' && value !== null) {
          Object.entries(value).forEach(([op, val]) => {
            params.append(`filters[${key}][${op}]`, String(val));
          });
        } else {
          params.append(`filters[${key}][$eq]`, String(value));
        }
      });
    }

    if (options.sort) {
      params.append('sort', options.sort);
    }

    if (options.pagination) {
      if (options.pagination.page) {
        params.append('pagination[page]', String(options.pagination.page));
      }
      if (options.pagination.pageSize) {
        params.append('pagination[pageSize]', String(options.pagination.pageSize));
      }
    }

    return params.toString();
  }

  private async request<T>(endpoint: string, options: ApiClientOptions = {}): Promise<T> {
    const query = this.buildQuery(options);
    const url = `${this.baseUrl}${endpoint}${query ? `?${query}` : ''}`;

    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // Product methods
  async getProducts(filters?: ExtendedProductFilters, page = 1, pageSize = 12): Promise<StrapiListResponse<Product>> {
    const apiFilters: Record<string, any> = {};
    
    if (filters?.category) apiFilters['category.slug'] = filters.category;
    if (filters?.brand) apiFilters['brand.slug'] = filters.brand;
    if (filters?.featured) apiFilters.featured = true;
    if (filters?.trending) apiFilters.trending = true;
    if (filters?.inStock) apiFilters.stockQuantity = { $gt: 0 };
    if (filters?.priceRange) {
      apiFilters.price = {
        $gte: filters.priceRange[0],
        $lte: filters.priceRange[1],
      };
    }
    if (filters?.rating) apiFilters.averageRating = { $gte: filters.rating };
    if (filters?.searchQuery) {
      apiFilters.$or = [
        { name: { $containsi: filters.searchQuery } },
        { description: { $containsi: filters.searchQuery } },
        { shortDescription: { $containsi: filters.searchQuery } },
      ];
    }

    const sort = filters?.sort 
      ? `${filters.sort.field}:${filters.sort.direction}`
      : 'createdAt:desc';

    return this.request<StrapiListResponse<Product>>('/products', {
      populate: 'mainImage,images,category,brand,tags',
      filters: apiFilters,
      sort,
      pagination: { page, pageSize },
    });
  }

  async getProduct(slug: string): Promise<StrapiResponse<Product>> {
    return this.request<StrapiResponse<Product>>('/products', {
      populate: 'mainImage,images,videos,category,brand,variants,variants.images,tags,reviews,relatedProducts,crossSellProducts,upSellProducts',
      filters: { slug },
    }).then(response => ({
      data: response.data[0],
      meta: response.meta,
    }));
  }

  async getFeaturedProducts(limit = 8): Promise<StrapiListResponse<Product>> {
    return this.request<StrapiListResponse<Product>>('/products', {
      populate: 'mainImage,category,brand',
      filters: { featured: true, status: 'active' },
      sort: 'trendingScore:desc',
      pagination: { pageSize: limit },
    });
  }

  async getTrendingProducts(limit = 8): Promise<StrapiListResponse<Product>> {
    return this.request<StrapiListResponse<Product>>('/products', {
      populate: 'mainImage,category,brand',
      filters: { trending: true, status: 'active' },
      sort: 'trendingScore:desc',
      pagination: { pageSize: limit },
    });
  }

  // Category methods
  async getCategories(): Promise<StrapiListResponse<Category>> {
    return this.request<StrapiListResponse<Category>>('/categories', {
      populate: 'image,icon,childCategories',
      filters: { isActive: true, showInNavigation: true },
      sort: 'sortOrder:asc',
    });
  }

  async getCategory(slug: string): Promise<StrapiResponse<Category>> {
    return this.request<StrapiResponse<Category>>('/categories', {
      populate: 'image,banner,childCategories,parentCategory',
      filters: { slug, isActive: true },
    }).then(response => ({
      data: response.data[0],
      meta: response.meta,
    }));
  }

  async getFeaturedCategories(): Promise<StrapiListResponse<Category>> {
    return this.request<StrapiListResponse<Category>>('/categories', {
      populate: 'image,icon',
      filters: { isFeatured: true, isActive: true },
      sort: 'sortOrder:asc',
    });
  }

  // Brand methods
  async getBrands(): Promise<StrapiListResponse<Brand>> {
    return this.request<StrapiListResponse<Brand>>('/brands', {
      populate: 'logo',
      filters: { isActive: true },
      sort: 'name:asc',
    });
  }

  async getBrand(slug: string): Promise<StrapiResponse<Brand>> {
    return this.request<StrapiResponse<Brand>>('/brands', {
      populate: 'logo',
      filters: { slug, isActive: true },
    }).then(response => ({
      data: response.data[0],
      meta: response.meta,
    }));
  }

  // Search method
  async searchProducts(query: string, filters?: ExtendedProductFilters): Promise<StrapiListResponse<Product>> {
    return this.getProducts({ ...filters, searchQuery: query });
  }

  // Review methods
  async getProductReviews(productId: number, page = 1, pageSize = 10): Promise<StrapiListResponse<Review>> {
    return this.request<StrapiListResponse<Review>>('/reviews', {
      filters: { 
        product: productId, 
        isApproved: true 
      },
      sort: 'createdAt:desc',
      pagination: { page, pageSize },
    });
  }
}

export const apiClient = new ApiClient();
export default apiClient;