import { http, HttpResponse } from 'msw';
import { createMockProduct, createMockCategory, createMockReview, mockApiResponse } from '../utils/test-utils';

// Mock API endpoints
export const handlers = [
  // Products endpoints
  http.get('/api/products', ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || '10');
    const category = url.searchParams.get('category');
    const search = url.searchParams.get('search');
    const sort = url.searchParams.get('sort') || 'createdAt:desc';

    // Generate mock products
    const products = Array.from({ length: pageSize }, (_, i) => 
      createMockProduct({
        id: (page - 1) * pageSize + i + 1,
        attributes: {
          name: search ? `${search} Product ${i + 1}` : `Product ${i + 1}`,
          slug: `product-${(page - 1) * pageSize + i + 1}`,
          price: 50 + (i * 10),
          categories: category ? {
            data: [createMockCategory({ attributes: { slug: category } })]
          } : undefined
        }
      })
    );

    return HttpResponse.json(mockApiResponse(products, {
      pagination: {
        page,
        pageSize,
        pageCount: Math.ceil(100 / pageSize),
        total: 100
      }
    }));
  }),

  http.get('/api/products/:slug', ({ params }) => {
    const product = createMockProduct({
      attributes: {
        slug: params.slug as string,
        name: `Product ${params.slug}`,
        description: 'Detailed product description with specifications and features.',
        reviews: {
          data: Array.from({ length: 5 }, (_, i) => createMockReview({
            id: i + 1,
            attributes: {
              rating: 4 + (i % 2),
              comment: `Review comment ${i + 1}`,
              author: `User ${i + 1}`
            }
          }))
        }
      }
    });

    return HttpResponse.json({ data: product });
  }),

  // Categories endpoints
  http.get('/api/categories', () => {
    const categories = [
      createMockCategory({ 
        id: 1, 
        attributes: { 
          name: 'Electronics', 
          slug: 'electronics',
          productCount: 25
        } 
      }),
      createMockCategory({ 
        id: 2, 
        attributes: { 
          name: 'Fashion', 
          slug: 'fashion',
          productCount: 35
        } 
      }),
      createMockCategory({ 
        id: 3, 
        attributes: { 
          name: 'Home & Garden', 
          slug: 'home-garden',
          productCount: 18
        } 
      }),
    ];

    return HttpResponse.json(mockApiResponse(categories));
  }),

  http.get('/api/categories/:slug', ({ params }) => {
    const category = createMockCategory({
      attributes: {
        slug: params.slug as string,
        name: `Category ${params.slug}`,
        description: `Description for ${params.slug} category`
      }
    });

    return HttpResponse.json({ data: category });
  }),

  // Search endpoints
  http.get('/api/search/suggestions', ({ request }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get('q') || '';
    
    if (query.length < 2) {
      return HttpResponse.json({ data: [] });
    }

    const suggestions = [
      `${query} Product 1`,
      `${query} Product 2`,
      `${query} Category`,
      `Best ${query}`,
      `Popular ${query}`
    ].slice(0, 5);

    return HttpResponse.json({ data: suggestions });
  }),

  // Cart endpoints
  http.get('/api/cart', () => {
    return HttpResponse.json({
      data: {
        items: [
          {
            id: 1,
            product: createMockProduct({ id: 1 }),
            quantity: 2,
            price: 99.99
          },
          {
            id: 2,
            product: createMockProduct({ id: 2 }),
            quantity: 1,
            price: 149.99
          }
        ],
        total: 349.97,
        itemCount: 3
      }
    });
  }),

  http.post('/api/cart/add', async ({ request }) => {
    const body = await request.json() as { productId: number; quantity: number };
    
    return HttpResponse.json({
      data: {
        success: true,
        item: {
          id: Date.now(),
          product: createMockProduct({ id: body.productId }),
          quantity: body.quantity,
          price: 99.99
        }
      }
    });
  }),

  http.put('/api/cart/update/:itemId', async ({ params, request }) => {
    const body = await request.json() as { quantity: number };
    
    return HttpResponse.json({
      data: {
        success: true,
        item: {
          id: parseInt(params.itemId as string),
          quantity: body.quantity
        }
      }
    });
  }),

  http.delete('/api/cart/remove/:itemId', ({ params }) => {
    return HttpResponse.json({
      data: {
        success: true,
        removedItemId: parseInt(params.itemId as string)
      }
    });
  }),

  // Wishlist endpoints
  http.get('/api/wishlist', () => {
    return HttpResponse.json({
      data: {
        items: [
          createMockProduct({ id: 1 }),
          createMockProduct({ id: 2 }),
          createMockProduct({ id: 3 })
        ]
      }
    });
  }),

  http.post('/api/wishlist/add', async ({ request }) => {
    const body = await request.json() as { productId: number };
    
    return HttpResponse.json({
      data: {
        success: true,
        product: createMockProduct({ id: body.productId })
      }
    });
  }),

  http.delete('/api/wishlist/remove/:productId', ({ params }) => {
    return HttpResponse.json({
      data: {
        success: true,
        removedProductId: parseInt(params.productId as string)
      }
    });
  }),

  // Reviews endpoints
  http.get('/api/products/:productId/reviews', ({ params, request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || '5');

    const reviews = Array.from({ length: pageSize }, (_, i) => 
      createMockReview({
        id: (page - 1) * pageSize + i + 1,
        attributes: {
          rating: 3 + (i % 3),
          comment: `Review comment ${i + 1} for product ${params.productId}`,
          author: `User ${i + 1}`,
          verified: i % 2 === 0,
          helpful: i * 2
        }
      })
    );

    return HttpResponse.json(mockApiResponse(reviews, {
      pagination: {
        page,
        pageSize,
        pageCount: Math.ceil(25 / pageSize),
        total: 25
      }
    }));
  }),

  http.post('/api/products/:productId/reviews', async ({ params, request }) => {
    const body = await request.json() as { 
      rating: number; 
      comment: string; 
      author: string 
    };
    
    const review = createMockReview({
      id: Date.now(),
      attributes: {
        ...body,
        verified: false,
        helpful: 0,
        product: {
          data: createMockProduct({ id: parseInt(params.productId as string) })
        }
      }
    });

    return HttpResponse.json({ data: review });
  }),

  // Error scenarios for testing
  http.get('/api/products/error-product', () => {
    return HttpResponse.json(
      { error: 'Product not found' },
      { status: 404 }
    );
  }),

  http.get('/api/server-error', () => {
    return HttpResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }),

  // Slow response for loading state testing
  http.get('/api/slow-response', async () => {
    await new Promise(resolve => setTimeout(resolve, 2000));
    return HttpResponse.json({ data: { message: 'Slow response' } });
  })
];