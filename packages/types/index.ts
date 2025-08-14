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