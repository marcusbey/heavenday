'use client';

import { useState } from 'react';
import { Star, ThumbsUp, MoreHorizontal } from 'lucide-react';
import { Button, Badge } from '@heaven-dolls/ui';
import { cn } from '@heaven-dolls/ui';

interface ProductReviewsProps {
  productId: number;
}

interface MockReview {
  id: number;
  rating: number;
  title: string;
  content: string;
  reviewerName: string;
  isVerified: boolean;
  helpfulCount: number;
  createdAt: string;
}

// Mock reviews data - replace with actual API call
const mockReviews: MockReview[] = [
  {
    id: 1,
    rating: 5,
    title: "Excellent quality and service",
    content: "Really impressed with the quality of this product. Discrete packaging and fast delivery. Exactly what I was looking for and the material feels premium.",
    reviewerName: "Sarah M.",
    isVerified: true,
    helpfulCount: 12,
    createdAt: "2024-01-15T10:30:00Z",
  },
  {
    id: 2,
    rating: 4,
    title: "Good value for money",
    content: "Great product overall. The quality is good and it arrived quickly. Only minor complaint is that it was smaller than expected, but that might be on me for not reading the dimensions carefully.",
    reviewerName: "Alex K.",
    isVerified: true,
    helpfulCount: 8,
    createdAt: "2024-01-10T14:45:00Z",
  },
  {
    id: 3,
    rating: 5,
    title: "Perfect!",
    content: "Exactly as described. High quality materials and construction. Very satisfied with my purchase and would definitely buy from this store again.",
    reviewerName: "Jamie L.",
    isVerified: false,
    helpfulCount: 5,
    createdAt: "2024-01-05T09:15:00Z",
  },
];

export function ProductReviews({ productId }: ProductReviewsProps) {
  const [showAll, setShowAll] = useState(false);

  // In a real app, you would fetch reviews based on productId
  const reviews = mockReviews;
  const displayedReviews = showAll ? reviews : reviews.slice(0, 3);

  if (reviews.length === 0) {
    return (
      <section id="reviews">
        <h2 className="text-2xl font-bold mb-6">Customer Reviews</h2>
        <div className="text-center py-12 border border-dashed rounded-lg">
          <p className="text-muted-foreground mb-4">No reviews yet</p>
          <Button>Be the first to review</Button>
        </div>
      </section>
    );
  }

  const averageRating = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
  const ratingCounts = [5, 4, 3, 2, 1].map(rating => 
    reviews.filter(review => review.rating === rating).length
  );

  return (
    <section id="reviews">
      <h2 className="text-2xl font-bold mb-6">Customer Reviews</h2>

      {/* Rating Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 p-6 bg-muted/30 rounded-lg">
        <div className="text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
            <span className="text-3xl font-bold">{averageRating.toFixed(1)}</span>
            <div className="flex">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={cn(
                    'h-5 w-5',
                    star <= Math.floor(averageRating)
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-gray-300'
                  )}
                />
              ))}
            </div>
          </div>
          <p className="text-muted-foreground">
            Based on {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
          </p>
        </div>

        <div className="space-y-2">
          {ratingCounts.map((count, index) => {
            const rating = 5 - index;
            const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
            
            return (
              <div key={rating} className="flex items-center gap-2 text-sm">
                <span className="w-12">{rating} star</span>
                <div className="flex-1 bg-muted rounded-full h-2">
                  <div
                    className="bg-yellow-400 h-2 rounded-full transition-all"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="w-8 text-right text-muted-foreground">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Write a Review Button */}
      <div className="mb-8">
        <Button>Write a Review</Button>
      </div>

      {/* Reviews List */}
      <div className="space-y-6">
        {displayedReviews.map((review) => (
          <div key={review.id} className="border-b border-border/50 pb-6">
            <div className="flex items-start justify-between mb-3">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={cn(
                          'h-4 w-4',
                          star <= review.rating
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300'
                        )}
                      />
                    ))}
                  </div>
                  {review.isVerified && (
                    <Badge variant="success" className="text-xs">
                      Verified Purchase
                    </Badge>
                  )}
                </div>
                <h4 className="font-medium">{review.title}</h4>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{review.reviewerName}</span>
                  <span>•</span>
                  <span>{new Date(review.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>
            
            <p className="text-muted-foreground mb-4 leading-relaxed">
              {review.content}
            </p>
            
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" className="text-muted-foreground">
                <ThumbsUp className="h-4 w-4 mr-1" />
                Helpful ({review.helpfulCount})
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Show More Reviews */}
      {reviews.length > 3 && (
        <div className="text-center mt-6">
          <Button 
            variant="outline"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? 'Show Less' : `Show All ${reviews.length} Reviews`}
          </Button>
        </div>
      )}
    </section>
  );
}