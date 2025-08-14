import { setupStrapi, cleanupStrapi } from '../helpers/strapi';
import { Strapi } from '@strapi/strapi';

describe('Review Content Model', () => {
  let strapi: Strapi;
  let testProduct: any;

  beforeAll(async () => {
    strapi = await setupStrapi();
  });

  afterAll(async () => {
    await cleanupStrapi(strapi);
  });

  beforeEach(async () => {
    // Clear reviews table for each test
    await strapi.db.query('api::review.review').deleteMany({});
    
    // Create a test product for review association
    testProduct = await strapi.entityService.create('api::product.product', {
      data: {
        name: 'Test Product for Reviews',
        description: 'Product used for review testing',
        price: 99.99,
        sku: 'TEST-REVIEW-PROD'
      }
    });
  });

  afterEach(async () => {
    // Clean up test product
    if (testProduct) {
      await strapi.entityService.delete('api::product.product', testProduct.id);
    }
  });

  describe('Schema Validation', () => {
    it('should create review with required fields', async () => {
      const reviewData = {
        product: testProduct.id,
        customerName: 'John Doe',
        customerEmail: 'john.doe@example.com',
        rating: 5,
        comment: 'Excellent product! Highly recommend it.'
      };

      const review = await strapi.entityService.create('api::review.review', {
        data: reviewData
      });

      expect(review).toBeDefined();
      expect(review.customerName).toBe('John Doe');
      expect(review.customerEmail).toBe('john.doe@example.com');
      expect(review.rating).toBe(5);
      expect(review.comment).toBe('Excellent product! Highly recommend it.');
    });

    it('should fail validation with missing required fields', async () => {
      const incompleteReview = {
        customerName: 'Jane Doe'
        // Missing required fields: product, customerEmail, rating, comment
      };

      await expect(
        strapi.entityService.create('api::review.review', {
          data: incompleteReview
        })
      ).rejects.toThrow();
    });

    it('should validate rating constraints (1-5)', async () => {
      const invalidRatings = [0, 6, -1, 10];

      for (const rating of invalidRatings) {
        const invalidReview = {
          product: testProduct.id,
          customerName: 'Test Customer',
          customerEmail: 'test@example.com',
          rating: rating,
          comment: 'Test comment'
        };

        await expect(
          strapi.entityService.create('api::review.review', {
            data: invalidReview
          })
        ).rejects.toThrow();
      }
    });

    it('should accept valid ratings (1-5)', async () => {
      const validRatings = [1, 2, 3, 4, 5];

      for (const rating of validRatings) {
        const validReview = {
          product: testProduct.id,
          customerName: `Customer ${rating}`,
          customerEmail: `customer${rating}@example.com`,
          rating: rating,
          comment: `Rating ${rating} review`
        };

        const review = await strapi.entityService.create('api::review.review', {
          data: validReview
        });

        expect(review.rating).toBe(rating);
      }
    });

    it('should validate email format', async () => {
      const invalidEmail = {
        product: testProduct.id,
        customerName: 'Invalid Email Customer',
        customerEmail: 'not-an-email',
        rating: 4,
        comment: 'Test comment'
      };

      await expect(
        strapi.entityService.create('api::review.review', {
          data: invalidEmail
        })
      ).rejects.toThrow();
    });

    it('should validate field length constraints', async () => {
      const longCustomerName = {
        product: testProduct.id,
        customerName: 'a'.repeat(101), // Exceeds 100 char limit
        customerEmail: 'test@example.com',
        rating: 4,
        comment: 'Test comment'
      };

      const longTitle = {
        product: testProduct.id,
        customerName: 'Test Customer',
        customerEmail: 'test@example.com',
        rating: 4,
        title: 'a'.repeat(201), // Exceeds 200 char limit
        comment: 'Test comment'
      };

      const longComment = {
        product: testProduct.id,
        customerName: 'Test Customer',
        customerEmail: 'test@example.com',
        rating: 4,
        comment: 'a'.repeat(2001) // Exceeds 2000 char limit
      };

      await expect(
        strapi.entityService.create('api::review.review', {
          data: longCustomerName
        })
      ).rejects.toThrow();

      await expect(
        strapi.entityService.create('api::review.review', {
          data: longTitle
        })
      ).rejects.toThrow();

      await expect(
        strapi.entityService.create('api::review.review', {
          data: longComment
        })
      ).rejects.toThrow();
    });

    it('should validate status enumeration', async () => {
      const invalidStatus = {
        product: testProduct.id,
        customerName: 'Status Test Customer',
        customerEmail: 'status@example.com',
        rating: 4,
        comment: 'Status test comment',
        status: 'invalid_status' // Not in enum
      };

      await expect(
        strapi.entityService.create('api::review.review', {
          data: invalidStatus
        })
      ).rejects.toThrow();
    });

    it('should accept valid status values', async () => {
      const validStatuses = ['pending', 'approved', 'rejected', 'spam'];

      for (const status of validStatuses) {
        const review = await strapi.entityService.create('api::review.review', {
          data: {
            product: testProduct.id,
            customerName: `${status} Customer`,
            customerEmail: `${status}@example.com`,
            rating: 4,
            comment: `${status} review comment`,
            status: status
          }
        });

        expect(review.status).toBe(status);
      }
    });

    it('should validate review source enumeration', async () => {
      const validSources = ['website', 'amazon', 'google', 'facebook', 'imported'];

      for (const source of validSources) {
        const review = await strapi.entityService.create('api::review.review', {
          data: {
            product: testProduct.id,
            customerName: `${source} Customer`,
            customerEmail: `${source}@example.com`,
            rating: 4,
            comment: `Review from ${source}`,
            reviewSource: source
          }
        });

        expect(review.reviewSource).toBe(source);
      }
    });

    it('should validate sentiment enumeration', async () => {
      const validSentiments = ['positive', 'neutral', 'negative'];

      for (const sentiment of validSentiments) {
        const review = await strapi.entityService.create('api::review.review', {
          data: {
            product: testProduct.id,
            customerName: `${sentiment} Customer`,
            customerEmail: `${sentiment}@example.com`,
            rating: sentiment === 'positive' ? 5 : sentiment === 'neutral' ? 3 : 1,
            comment: `${sentiment} review comment`,
            sentiment: sentiment
          }
        });

        expect(review.sentiment).toBe(sentiment);
      }
    });

    it('should validate sentiment score constraints', async () => {
      const invalidScores = [-1.1, 1.1, -2, 2];

      for (const score of invalidScores) {
        const invalidReview = {
          product: testProduct.id,
          customerName: 'Sentiment Test Customer',
          customerEmail: 'sentiment@example.com',
          rating: 3,
          comment: 'Sentiment test comment',
          sentimentScore: score
        };

        await expect(
          strapi.entityService.create('api::review.review', {
            data: invalidReview
          })
        ).rejects.toThrow();
      }
    });

    it('should accept valid sentiment scores (-1 to 1)', async () => {
      const validScores = [-1.0, -0.5, 0, 0.5, 1.0];

      for (const score of validScores) {
        const review = await strapi.entityService.create('api::review.review', {
          data: {
            product: testProduct.id,
            customerName: `Score ${score} Customer`,
            customerEmail: `score${score}@example.com`,
            rating: 3,
            comment: `Sentiment score ${score} review`,
            sentimentScore: score
          }
        });

        expect(review.sentimentScore).toBe(score);
      }
    });
  });

  describe('Default Values', () => {
    it('should set correct default values', async () => {
      const minimalReview = {
        product: testProduct.id,
        customerName: 'Minimal Customer',
        customerEmail: 'minimal@example.com',
        rating: 4,
        comment: 'Minimal review'
      };

      const review = await strapi.entityService.create('api::review.review', {
        data: minimalReview
      });

      expect(review.status).toBe('pending');
      expect(review.isVerifiedPurchase).toBe(false);
      expect(review.helpfulCount).toBe(0);
      expect(review.notHelpfulCount).toBe(0);
      expect(review.reviewSource).toBe('website');
      expect(review.isHighlighted).toBe(false);
    });
  });

  describe('Product Relationship', () => {
    it('should establish relationship with product', async () => {
      const review = await strapi.entityService.create('api::review.review', {
        data: {
          product: testProduct.id,
          customerName: 'Relationship Test Customer',
          customerEmail: 'relationship@example.com',
          rating: 5,
          comment: 'Great product relationship test'
        },
        populate: ['product']
      });

      expect(review.product).toBeDefined();
      expect(review.product.id).toBe(testProduct.id);
      expect(review.product.name).toBe('Test Product for Reviews');
    });

    it('should fail with non-existent product', async () => {
      const invalidReview = {
        product: 99999, // Non-existent product ID
        customerName: 'Invalid Product Customer',
        customerEmail: 'invalid@example.com',
        rating: 4,
        comment: 'Review for non-existent product'
      };

      await expect(
        strapi.entityService.create('api::review.review', {
          data: invalidReview
        })
      ).rejects.toThrow();
    });
  });

  describe('Moderation Fields', () => {
    let adminUser: any;

    beforeEach(async () => {
      // Create a test admin user for moderation testing
      adminUser = await strapi.admin.services.user.create({
        email: 'moderator@example.com',
        password: 'Moderator123!',
        firstname: 'Test',
        lastname: 'Moderator',
        isActive: true
      });
    });

    afterEach(async () => {
      if (adminUser) {
        await strapi.admin.services.user.deleteById(adminUser.id);
      }
    });

    it('should handle moderation workflow', async () => {
      const review = await strapi.entityService.create('api::review.review', {
        data: {
          product: testProduct.id,
          customerName: 'Moderation Test Customer',
          customerEmail: 'moderation@example.com',
          rating: 4,
          comment: 'This review needs moderation',
          status: 'pending'
        }
      });

      // Moderate the review
      const moderatedReview = await strapi.entityService.update('api::review.review', review.id, {
        data: {
          status: 'approved',
          moderatorNotes: 'Review approved after verification',
          moderatedBy: adminUser.id,
          moderatedAt: new Date()
        },
        populate: ['moderatedBy']
      });

      expect(moderatedReview.status).toBe('approved');
      expect(moderatedReview.moderatorNotes).toBe('Review approved after verification');
      expect(moderatedReview.moderatedBy.id).toBe(adminUser.id);
      expect(moderatedReview.moderatedAt).toBeDefined();
    });

    it('should handle review rejection', async () => {
      const review = await strapi.entityService.create('api::review.review', {
        data: {
          product: testProduct.id,
          customerName: 'Rejected Review Customer',
          customerEmail: 'rejected@example.com',
          rating: 1,
          comment: 'This is inappropriate content',
          status: 'pending'
        }
      });

      const rejectedReview = await strapi.entityService.update('api::review.review', review.id, {
        data: {
          status: 'rejected',
          moderatorNotes: 'Rejected due to inappropriate content',
          moderatedBy: adminUser.id,
          moderatedAt: new Date()
        }
      });

      expect(rejectedReview.status).toBe('rejected');
      expect(rejectedReview.moderatorNotes).toBe('Rejected due to inappropriate content');
    });

    it('should mark spam reviews', async () => {
      const spamReview = await strapi.entityService.create('api::review.review', {
        data: {
          product: testProduct.id,
          customerName: 'Spam Customer',
          customerEmail: 'spam@example.com',
          rating: 5,
          comment: 'Click here for amazing deals! www.spam.com',
          status: 'spam',
          moderatorNotes: 'Detected as spam - contains promotional links',
          moderatedBy: adminUser.id,
          moderatedAt: new Date()
        }
      });

      expect(spamReview.status).toBe('spam');
      expect(spamReview.moderatorNotes).toContain('spam');
    });
  });

  describe('Helpful Voting System', () => {
    let review: any;

    beforeEach(async () => {
      review = await strapi.entityService.create('api::review.review', {
        data: {
          product: testProduct.id,
          customerName: 'Helpful Test Customer',
          customerEmail: 'helpful@example.com',
          rating: 4,
          comment: 'This is a helpful review for testing voting',
          status: 'approved'
        }
      });
    });

    it('should track helpful votes', async () => {
      const updatedReview = await strapi.entityService.update('api::review.review', review.id, {
        data: {
          helpfulCount: 5,
          notHelpfulCount: 1
        }
      });

      expect(updatedReview.helpfulCount).toBe(5);
      expect(updatedReview.notHelpfulCount).toBe(1);
    });

    it('should not allow negative vote counts', async () => {
      await expect(
        strapi.entityService.update('api::review.review', review.id, {
          data: {
            helpfulCount: -1
          }
        })
      ).rejects.toThrow();

      await expect(
        strapi.entityService.update('api::review.review', review.id, {
          data: {
            notHelpfulCount: -1
          }
        })
      ).rejects.toThrow();
    });
  });

  describe('Review Enhancement Features', () => {
    it('should handle comprehensive review data', async () => {
      const comprehensiveReview = {
        product: testProduct.id,
        customerName: 'Comprehensive Reviewer',
        customerEmail: 'comprehensive@example.com',
        customerId: 'CUST-12345',
        rating: 4,
        title: 'Great product with minor issues',
        comment: 'Overall very satisfied with the purchase. Quality is excellent and delivery was fast.',
        pros: 'High quality materials, fast shipping, good packaging',
        cons: 'Slightly expensive, could use better instructions',
        isVerifiedPurchase: true,
        isRecommended: true,
        status: 'approved',
        reviewSource: 'website',
        externalId: 'REV-EXT-789',
        reviewDate: new Date('2024-01-15'),
        isHighlighted: true,
        sentiment: 'positive',
        sentimentScore: 0.7
      };

      const review = await strapi.entityService.create('api::review.review', {
        data: comprehensiveReview
      });

      expect(review.customerName).toBe('Comprehensive Reviewer');
      expect(review.customerId).toBe('CUST-12345');
      expect(review.title).toBe('Great product with minor issues');
      expect(review.pros).toBe('High quality materials, fast shipping, good packaging');
      expect(review.cons).toBe('Slightly expensive, could use better instructions');
      expect(review.isVerifiedPurchase).toBe(true);
      expect(review.isRecommended).toBe(true);
      expect(review.reviewSource).toBe('website');
      expect(review.externalId).toBe('REV-EXT-789');
      expect(review.isHighlighted).toBe(true);
      expect(review.sentiment).toBe('positive');
      expect(review.sentimentScore).toBe(0.7);
    });

    it('should handle verified purchase flag', async () => {
      const verifiedReview = await strapi.entityService.create('api::review.review', {
        data: {
          product: testProduct.id,
          customerName: 'Verified Customer',
          customerEmail: 'verified@example.com',
          rating: 5,
          comment: 'Verified purchase review',
          isVerifiedPurchase: true,
          customerId: 'VERIFIED-CUST-001'
        }
      });

      const unverifiedReview = await strapi.entityService.create('api::review.review', {
        data: {
          product: testProduct.id,
          customerName: 'Unverified Customer',
          customerEmail: 'unverified@example.com',
          rating: 3,
          comment: 'Unverified review'
        }
      });

      expect(verifiedReview.isVerifiedPurchase).toBe(true);
      expect(unverifiedReview.isVerifiedPurchase).toBe(false);
    });

    it('should handle recommendation flag', async () => {
      const recommendedReview = await strapi.entityService.create('api::review.review', {
        data: {
          product: testProduct.id,
          customerName: 'Recommending Customer',
          customerEmail: 'recommends@example.com',
          rating: 5,
          comment: 'Highly recommend this product!',
          isRecommended: true
        }
      });

      const notRecommendedReview = await strapi.entityService.create('api::review.review', {
        data: {
          product: testProduct.id,
          customerName: 'Not Recommending Customer',
          customerEmail: 'notrecommends@example.com',
          rating: 2,
          comment: 'Would not recommend',
          isRecommended: false
        }
      });

      expect(recommendedReview.isRecommended).toBe(true);
      expect(notRecommendedReview.isRecommended).toBe(false);
    });
  });

  describe('External Review Integration', () => {
    it('should handle imported reviews from external sources', async () => {
      const sources = ['amazon', 'google', 'facebook', 'imported'];

      for (const source of sources) {
        const externalReview = await strapi.entityService.create('api::review.review', {
          data: {
            product: testProduct.id,
            customerName: `${source} Customer`,
            customerEmail: `${source}@external.com`,
            rating: 4,
            comment: `Review imported from ${source}`,
            reviewSource: source,
            externalId: `${source.toUpperCase()}-EXT-123`,
            reviewDate: new Date('2024-01-10')
          }
        });

        expect(externalReview.reviewSource).toBe(source);
        expect(externalReview.externalId).toBe(`${source.toUpperCase()}-EXT-123`);
      }
    });
  });

  describe('Review Analytics and Sentiment', () => {
    it('should analyze sentiment and scoring', async () => {
      const sentimentTests = [
        { rating: 5, sentiment: 'positive', score: 0.8, comment: 'Amazing product! Love it!' },
        { rating: 3, sentiment: 'neutral', score: 0.0, comment: 'It\'s okay, nothing special' },
        { rating: 1, sentiment: 'negative', score: -0.6, comment: 'Terrible quality, waste of money' }
      ];

      for (const test of sentimentTests) {
        const review = await strapi.entityService.create('api::review.review', {
          data: {
            product: testProduct.id,
            customerName: `${test.sentiment} Customer`,
            customerEmail: `${test.sentiment}@example.com`,
            rating: test.rating,
            comment: test.comment,
            sentiment: test.sentiment,
            sentimentScore: test.score
          }
        });

        expect(review.rating).toBe(test.rating);
        expect(review.sentiment).toBe(test.sentiment);
        expect(review.sentimentScore).toBe(test.score);
      }
    });
  });

  describe('Review Highlighting', () => {
    it('should manage highlighted reviews', async () => {
      const highlightedReview = await strapi.entityService.create('api::review.review', {
        data: {
          product: testProduct.id,
          customerName: 'Highlighted Customer',
          customerEmail: 'highlighted@example.com',
          rating: 5,
          comment: 'This review should be highlighted as it\'s exceptional',
          status: 'approved',
          isHighlighted: true
        }
      });

      const regularReview = await strapi.entityService.create('api::review.review', {
        data: {
          product: testProduct.id,
          customerName: 'Regular Customer',
          customerEmail: 'regular@example.com',
          rating: 4,
          comment: 'Regular review not highlighted'
        }
      });

      expect(highlightedReview.isHighlighted).toBe(true);
      expect(regularReview.isHighlighted).toBe(false);

      // Test filtering highlighted reviews
      const highlightedReviews = await strapi.entityService.findMany('api::review.review', {
        filters: { isHighlighted: true }
      });

      expect(highlightedReviews.length).toBe(1);
      expect(highlightedReviews[0].customerName).toBe('Highlighted Customer');
    });
  });
});