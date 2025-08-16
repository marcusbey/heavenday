import type { Metadata } from 'next';
import type { Product, Category } from '@heaven-dolls/types';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://heavendolls.com';

export const defaultMetadata: Metadata = {
  title: 'Heaven Dolls - Premium Adult Products Marketplace',
  description: 'Discover premium adult products with sophisticated taste. Elegant, discreet, and tastefully curated for discerning customers seeking quality and elegance.',
  keywords: 'adult products, premium marketplace, discreet shopping, adult toys, intimate products, quality adult products',
  authors: [{ name: 'Heaven Dolls' }],
  creator: 'Heaven Dolls',
  publisher: 'Heaven Dolls',
  robots: 'index, follow',
  alternates: {
    canonical: baseUrl,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: baseUrl,
    title: 'Heaven Dolls - Premium Adult Products Marketplace',
    description: 'Discover premium adult products with sophisticated taste.',
    siteName: 'Heaven Dolls',
    images: [
      {
        url: `${baseUrl}/og-image.jpg`,
        width: 1200,
        height: 630,
        alt: 'Heaven Dolls - Premium Adult Products',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Heaven Dolls - Premium Adult Products Marketplace',
    description: 'Discover premium adult products with sophisticated taste.',
    images: [`${baseUrl}/og-image.jpg`],
  },
};

export function generateProductMetadata(product: Product): Metadata {
  const { 
    name, 
    shortDescription, 
    description, 
    slug,
    price,
    mainImage,
    seoTitle,
    seoDescription,
    seoKeywords,
    canonicalUrl,
  } = product.attributes;

  const title = seoTitle || `${name} - Heaven Dolls`;
  const desc = seoDescription || shortDescription || description.substring(0, 160);
  const url = `${baseUrl}/products/${slug}`;
  const imageUrl = mainImage?.data?.attributes?.url ? 
    `${baseUrl}${mainImage.data.attributes.url}` : 
    `${baseUrl}/og-image.jpg`;

  return {
    title,
    description: desc,
    keywords: seoKeywords || `${name}, adult products, premium quality`,
    alternates: {
      canonical: url,
    },
    openGraph: {
      type: 'article',
      url,
      title,
      description: desc,
      siteName: 'Heaven Dolls',
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: name,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: desc,
      images: [imageUrl],
    },
  };
}

export function generateCategoryMetadata(category: Category): Metadata {
  const { 
    name, 
    shortDescription, 
    description, 
    slug,
    seoTitle,
    seoDescription,
    seoKeywords,
    image,
  } = category.attributes;

  const title = seoTitle || `${name} - Heaven Dolls`;
  const desc = seoDescription || shortDescription || `Explore our ${name} collection`;
  const url = `${baseUrl}/categories/${slug}`;
  const imageUrl = image?.data?.attributes?.url ? 
    `${baseUrl}${image.data.attributes.url}` : 
    `${baseUrl}/og-image.jpg`;

  return {
    title,
    description: desc,
    keywords: seoKeywords || `${name}, adult products, premium collection`,
    alternates: {
      canonical: url,
    },
    openGraph: {
      type: 'website',
      url,
      title,
      description: desc,
      siteName: 'Heaven Dolls',
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: name,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: desc,
      images: [imageUrl],
    },
  };
}

export function generateStructuredData(product: Product) {
  const { 
    name, 
    description, 
    price,
    originalPrice,
    averageRating,
    reviewCount,
    stockQuantity,
    mainImage,
    brand,
    category,
  } = product.attributes;

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    description,
    image: mainImage?.data?.attributes?.url ? [mainImage.data.attributes.url] : [],
    brand: {
      '@type': 'Brand',
      name: brand?.data?.attributes?.name || 'Heaven Dolls',
    },
    category: category?.data?.attributes?.name,
    offers: {
      '@type': 'Offer',
      price: price.toString(),
      priceCurrency: 'USD',
      availability: stockQuantity > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      seller: {
        '@type': 'Organization',
        name: 'Heaven Dolls',
      },
    },
    ...(averageRating && reviewCount && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: averageRating.toString(),
        reviewCount: reviewCount.toString(),
        bestRating: '5',
        worstRating: '1',
      },
    }),
  };
}