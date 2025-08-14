export interface TrendKeyword {
  keyword: string;
  score: number;
  geo: string;
  timestamp: Date;
  relatedQueries: string[];
  category: string;
}

export interface GeographicTrend {
  geo: string;
  geoName: string;
  score: number;
  keyword: string;
}

export interface TrendSummary {
  totalKeywords: number;
  averageScore: number;
  topRegions: Array<{
    geo: string;
    geoName: string;
    score: number;
  }>;
}

export interface TrendData {
  timestamp: Date;
  keywords: TrendKeyword[];
  geographicTrends: GeographicTrend[];
  summary: TrendSummary;
}

export interface ProductTrend {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  sourceUrl: string;
  platform: 'amazon' | 'ebay' | 'etsy' | 'aliexpress';
  price: number;
  rating: number;
  reviewCount: number;
  trendScore: number;
  keywords: string[];
  scrapedAt: Date;
}

export interface SocialMediaTrend {
  platform: 'tiktok' | 'instagram';
  hashtag: string;
  postCount: number;
  engagementRate: number;
  trendScore: number;
  relatedProducts: string[];
  scrapedAt: Date;
}

export interface TrendAnalysisResult {
  googleTrends: TrendData;
  socialMediaTrends: SocialMediaTrend[];
  productOpportunities: ProductTrend[];
  recommendations: string[];
  generatedAt: Date;
}