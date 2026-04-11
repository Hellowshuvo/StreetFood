'use client';

import { useState, useCallback } from 'react';
import styles from './PostCard.module.css';
import RatingStars from '@/components/RatingStars/RatingStars';
import type { Post } from '@/lib/types';
import { getRelativeTime } from '@/lib/geo';
import { supabase } from '@/lib/supabase';

interface PostCardProps {
  post: Post;
  userId: string | null;
  onStallClick?: (stallId: string) => void;
}

export default function PostCard({ post, userId, onStallClick }: PostCardProps) {
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likes_count);
  const [likeLoading, setLikeLoading] = useState(false);

  const handleLike = useCallback(async () => {
    if (!userId || likeLoading) return;
    setLikeLoading(true);

    try {
      if (liked) {
        await supabase
          .from('likes')
          .delete()
          .eq('post_id', post.id)
          .eq('user_id', userId);
        setLikesCount((c) => Math.max(0, c - 1));
        setLiked(false);
      } else {
        await supabase
          .from('likes')
          .insert({ post_id: post.id, user_id: userId });
        setLikesCount((c) => c + 1);
        setLiked(true);
      }
    } catch (err) {
      console.error('Like failed:', err);
    }

    setLikeLoading(false);
  }, [userId, liked, likeLoading, post.id]);

  const profile = post.profiles;
  const stallName = post.stalls?.name;

  return (
    <article className={styles.card}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.avatar}>
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt={profile.username || ''} />
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          )}
        </div>
        <div className={styles.userInfo}>
          <span className={styles.username}>
            {profile?.username || 'Anonymous'}
          </span>
          {stallName && (
            <button
              className={styles.stallLink}
              onClick={() => onStallClick?.(post.stall_id)}
            >
              at {stallName}
            </button>
          )}
        </div>
        <span className={styles.time}>{getRelativeTime(post.created_at)}</span>
      </div>

      {/* Image */}
      {post.photo_url && (
        <div className={styles.imageWrapper}>
          <img src={post.photo_url} alt="Post" className={styles.image} />
        </div>
      )}

      {/* Rating */}
      {post.rating && (
        <div className={styles.rating}>
          <RatingStars rating={post.rating} size="sm" />
        </div>
      )}

      {/* Caption */}
      {post.caption && <p className={styles.caption}>{post.caption}</p>}

      {/* Footer */}
      <div className={styles.footer}>
        <button
          className={`${styles.likeBtn} ${liked ? styles.liked : ''}`}
          onClick={handleLike}
          disabled={!userId}
        >
          <svg
            viewBox="0 0 24 24"
            fill={liked ? 'var(--error)' : 'none'}
            stroke={liked ? 'var(--error)' : 'currentColor'}
            strokeWidth="2"
          >
            <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
          </svg>
          <span>{likesCount}</span>
        </button>
      </div>
    </article>
  );
}
