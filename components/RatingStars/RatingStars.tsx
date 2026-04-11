'use client';

import { useState } from 'react';
import styles from './RatingStars.module.css';

interface RatingStarsProps {
  rating: number;
  maxStars?: number;
  interactive?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onChange?: (rating: number) => void;
}

export default function RatingStars({
  rating,
  maxStars = 5,
  interactive = false,
  size = 'md',
  onChange,
}: RatingStarsProps) {
  const [hoverRating, setHoverRating] = useState(0);
  const displayRating = hoverRating || rating;

  return (
    <div
      className={`${styles.stars} ${styles[`stars-${size}`]} ${
        interactive ? styles.interactive : ''
      }`}
    >
      {Array.from({ length: maxStars }, (_, i) => {
        const starValue = i + 1;
        const filled = displayRating >= starValue;
        const halfFilled = !filled && displayRating >= starValue - 0.5;

        return (
          <button
            key={i}
            type="button"
            className={`${styles.star} ${filled ? styles.filled : ''} ${
              halfFilled ? styles.half : ''
            }`}
            onClick={() => interactive && onChange?.(starValue)}
            onMouseEnter={() => interactive && setHoverRating(starValue)}
            onMouseLeave={() => interactive && setHoverRating(0)}
            disabled={!interactive}
            aria-label={`${starValue} star${starValue !== 1 ? 's' : ''}`}
          >
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
                fill={filled || halfFilled ? 'var(--rating-gold)' : 'transparent'}
                stroke={filled || halfFilled ? 'var(--rating-gold)' : 'var(--gray-600)'}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        );
      })}
    </div>
  );
}
