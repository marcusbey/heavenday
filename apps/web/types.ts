// API Response Types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// Product Types
export interface ProductFilters {
  category?: string
  priceRange?: [number, number]
  tags?: string[]
  trending?: boolean
  searchQuery?: string
}

export interface TrendData {
  keyword: string
  score: number
  volume: number
  competition: 'LOW' | 'MEDIUM' | 'HIGH'
  relatedQueries: string[]
  timestamp: Date
}

// Scraping Types
export interface ScrapedProduct {
  name: string
  price: number
  imageUrl?: string
  description?: string
  sourceUrl: string
  category: string
  tags: string[]
  rating?: number
  reviewCount?: number
}

export interface ScrapeConfig {
  site: 'amazon' | 'ebay' | 'etsy' | 'aliexpress'
  searchQuery: string
  maxResults?: number
  filters?: Record<string, any>
}

// Google Trends Types
export interface TrendQuery {
  keyword: string
  timeframe?: string
  geo?: string
  category?: number
}

export interface TrendResult {
  keyword: string
  interest: number[]
  relatedTopics: string[]
  risingQueries: string[]
  avgInterest: number
}

// Google Sheets Integration
export interface SheetConfig {
  spreadsheetId: string
  range: string
  valueInputOption?: 'RAW' | 'USER_ENTERED'
}

export interface ProductRow {
  name: string
  price: number
  category: string
  trendScore: number
  lastUpdated: string
  sourceUrl: string
  status: 'active' | 'inactive' | 'pending'
}

// Analytics Types
export interface AnalyticsData {
  totalProducts: number
  trendingProducts: number
  totalRevenue: number
  conversionRate: number
  topCategories: Array<{ category: string; count: number }>
  revenueByMonth: Array<{ month: string; revenue: number }>
}

// Enhanced Frontend Types

// Media Types
export interface MediaFormat {
  ext: string
  url: string
  hash: string
  mime: string
  name: string
  path: string | null
  size: number
  width: number
  height: number
  sizeInBytes?: number
  provider_metadata: any
}

export interface Media {
  id: number
  attributes: {
    name: string
    alternativeText?: string
    caption?: string
    width: number
    height: number
    formats?: {
      thumbnail?: MediaFormat
      small?: MediaFormat
      medium?: MediaFormat
      large?: MediaFormat
    }
    hash: string
    ext: string
    mime: string
    size: number
    url: string
    previewUrl?: string
    provider: string
    provider_metadata: any
    createdAt: string
    updatedAt: string
  }
}

// Component Types
export interface Dimensions {
  id: number
  length?: number
  width?: number
  height?: number
  unit: 'cm' | 'in' | 'mm'
}

export interface Specification {
  id: number
  name: string
  value: string
  unit?: string
}

export interface Material {
  id: number
  name: string
  percentage?: number
  category: 'primary' | 'secondary' | 'accent'
}

export interface ShippingInfo {
  id: number
  weight?: number
  dimensions?: Dimensions
  shippingClass?: string
  freeShipping: boolean
  estimatedDays: number
  restrictions?: string[]
}

export interface VariantAttribute {
  id: number
  name: string
  value: string
  type: 'color' | 'size' | 'material' | 'style'
}

// Brand Type
export interface Brand {
  id: number
  attributes: {
    name: string
    slug: string
    description?: string
    logo?: { data: Media }
    website?: string
    isActive: boolean
    createdAt: string
    updatedAt: string
    publishedAt?: string
  }
}

// Category Types
export interface Category {
  id: number
  attributes: {
    name: string
    slug: string
    description?: string
    shortDescription?: string
    image?: { data: Media }
    icon?: { data: Media }
    banner?: { data: Media }
    parentCategory?: { data: Category }
    childCategories?: { data: Category[] }
    level: number
    sortOrder: number
    isActive: boolean
    isFeatured: boolean
    showInNavigation: boolean
    seoTitle?: string
    seoDescription?: string
    seoKeywords?: string
    productCount: number
    path?: string
    createdAt: string
    updatedAt: string
    publishedAt?: string
  }
}

export interface SubCategory {
  id: number
  attributes: {
    name: string
    slug: string
    description?: string
    category: { data: Category }
    isActive: boolean
    createdAt: string
    updatedAt: string
    publishedAt?: string
  }
}

// Tag Type
export interface Tag {
  id: number
  attributes: {
    name: string
    slug: string
    color?: string
    isActive: boolean
    createdAt: string
    updatedAt: string
    publishedAt?: string
  }
}

// Product Variant Type
export interface ProductVariant {
  id: number
  attributes: {
    name: string
    sku: string
    price: number
    originalPrice?: number
    stockQuantity: number
    images?: { data: Media[] }
    attributes?: VariantAttribute[]
    isActive: boolean
    product: { data: Product }
    createdAt: string
    updatedAt: string
    publishedAt?: string
  }
}

// Review Type
export interface Review {
  id: number
  attributes: {
    rating: number
    title?: string
    content: string
    reviewerName: string
    reviewerEmail?: string
    isVerified: boolean
    isApproved: boolean
    helpfulCount: number
    product: { data: Product }
    createdAt: string
    updatedAt: string
    publishedAt?: string
  }
}

// Main Product Type
export interface Product {
  id: number
  attributes: {
    name: string
    slug: string
    description: string
    shortDescription?: string
    price: number
    originalPrice?: number
    discountPercentage?: number
    sku: string
    barcode?: string
    weight?: number
    dimensions?: Dimensions
    stockQuantity: number
    lowStockThreshold: number
    trackInventory: boolean
    allowBackorder: boolean
    status: 'draft' | 'active' | 'inactive' | 'out_of_stock' | 'discontinued'
    featured: boolean
    trending: boolean
    trendingScore?: number
    images: { data: Media[] }
    videos?: { data: Media[] }
    mainImage: { data: Media }
    category?: { data: Category }
    subCategories?: { data: SubCategory[] }
    brand?: { data: Brand }
    variants?: { data: ProductVariant[] }
    tags?: { data: Tag[] }
    reviews?: { data: Review[] }
    averageRating?: number
    reviewCount: number
    specifications?: Specification[]
    materials?: Material[]
    careInstructions?: string
    seoTitle?: string
    seoDescription?: string
    seoKeywords?: string
    canonicalUrl?: string
    metaRobots: string
    sourceUrl?: string
    sourceMarketplace: 'amazon' | 'ebay' | 'etsy' | 'shopify' | 'custom'
    externalId?: string
    viewCount: number
    purchaseCount: number
    wishlistCount: number
    relatedProducts?: { data: Product[] }
    crossSellProducts?: { data: Product[] }
    upSellProducts?: { data: Product[] }
    shippingInfo?: ShippingInfo
    returnPolicy?: string
    warrantyInfo?: string
    isActive: boolean
    createdAt: string
    updatedAt: string
    publishedAt?: string
  }
}

// API Response Types for Strapi
export interface StrapiResponse<T> {
  data: T
  meta: {
    pagination?: {
      page: number
      pageSize: number
      pageCount: number
      total: number
    }
  }
}

export interface StrapiListResponse<T> {
  data: T[]
  meta: {
    pagination: {
      page: number
      pageSize: number
      pageCount: number
      total: number
    }
  }
}

// Frontend State Types
export interface CartItem {
  id: string
  product: Product
  variant?: ProductVariant
  quantity: number
  price: number
}

export interface Cart {
  items: CartItem[]
  total: number
  itemCount: number
}

export interface WishlistItem {
  id: string
  product: Product
  addedAt: string
}

export interface Wishlist {
  items: WishlistItem[]
  count: number
}

// Filter and Search Types
export interface ProductSort {
  field: 'name' | 'price' | 'createdAt' | 'averageRating' | 'purchaseCount' | 'trendingScore'
  direction: 'asc' | 'desc'
}

export interface ExtendedProductFilters extends ProductFilters {
  category?: string
  subCategory?: string
  brand?: string
  priceRange?: [number, number]
  rating?: number
  inStock?: boolean
  featured?: boolean
  trending?: boolean
  tags?: string[]
  searchQuery?: string
  sort?: ProductSort
}

export interface SearchResult {
  products: Product[]
  categories: Category[]
  brands: Brand[]
  total: number
  searchTime: number
}

// UI State Types
export interface LoadingState {
  [key: string]: boolean
}

export interface ErrorState {
  [key: string]: string | null
}

// Theme Types
export type Theme = 'light' | 'dark' | 'system'

export interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
}