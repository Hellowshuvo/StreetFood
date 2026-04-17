'use client';

import { useState, useCallback, useEffect } from 'react';
import styles from './PostCard.module.css';
import type { Post } from '@/lib/types';
import { getRelativeTime } from '@/lib/geo';
import { supabase } from '@/lib/supabase';

interface PostCardProps {
  post: Post;
  userId: string | null;
  onStallClick?: (stallId: string) => void;
}

// Animated gradient avatar for users without a profile photo
function AnimatedAvatar({ name }: { name: string }) {
  const initial = name ? name.charAt(0).toUpperCase() : '?';
  // Generate a consistent hue from name
  const hue = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
  return (
    <div
      className={styles.animatedAvatar}
      style={{
        background: `linear-gradient(135deg, hsl(${hue}, 65%, 45%), hsl(${(hue + 60) % 360}, 70%, 55%))`,
      }}
    >
      <span>{initial}</span>
    </div>
  );
}

// Star rating display
function StarRating({ rating }: { rating: number }) {
  return (
    <div className={styles.stars}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          viewBox="0 0 24 24"
          fill={i <= rating ? 'var(--rating-gold)' : 'none'}
          stroke={i <= rating ? 'var(--rating-gold)' : 'var(--gray-600)'}
          strokeWidth="1.5"
          className={styles.star}
        >
          <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
        </svg>
      ))}
    </div>
  );
}

export default function PostCard({ post, userId, onStallClick }: PostCardProps) {
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likes_count ?? 0);
  const [likeLoading, setLikeLoading] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  // Check if current user liked this post on mount
  useEffect(() => {
    if (!userId) return;
    supabase
      .from('likes')
      .select('id')
      .eq('post_id', post.id)
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setLiked(true);
      });
  }, [post.id, userId]);

  const handleLike = useCallback(async () => {
    if (!userId || likeLoading) return;
    setLikeLoading(true);

    const wasLiked = liked;
    // Optimistic update
    setLiked(!wasLiked);
    setLikesCount((c) => (wasLiked ? Math.max(0, c - 1) : c + 1));

    try {
      if (wasLiked) {
        await supabase.from('likes').delete().eq('post_id', post.id).eq('user_id', userId);
      } else {
        await supabase.from('likes').insert({ post_id: post.id, user_id: userId });
      }
    } catch (err) {
      // Revert on error
      setLiked(wasLiked);
      setLikesCount((c) => (wasLiked ? c + 1 : Math.max(0, c - 1)));
      console.error('Like failed:', err);
    }

    setLikeLoading(false);
  }, [userId, liked, likeLoading, post.id]);

  const profile = post.profiles;
  const stallName = post.stalls?.name;
  const username = profile?.username || 'Anonymous';

  return (
    <article className={styles.card}>
      {/* ── Header ── */}
      <div className={styles.header}>
        <div className={styles.avatar}>
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={`${username}'s avatar`}
              loading="lazy"
              className={styles.avatarImg}
            />
          ) : (
            <AnimatedAvatar name={username} />
          )}
        </div>

        <div className={styles.userMeta}>
          <span className={styles.username}>{username}</span>
          {stallName && (
            <button
              className={styles.stallTag}
              onClick={() => onStallClick?.(post.stall_id)}
              aria-label={`View ${stallName} on map`}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="10" height="10">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              {stallName}
            </button>
          )}
        </div>

        <span className={styles.time}>{getRelativeTime(post.created_at)}</span>
      </div>

      {/* ── Image ── */}
      {post.photo_url && (
        <div className={styles.imageWrapper}>
          {!imgLoaded && <div className={`${styles.imagePlaceholder} skeleton`} />}
          <img
            src={post.photo_url}
            alt={post.caption ? `Photo: ${post.caption.slice(0, 60)}` : `Street food at ${stallName || 'a stall'}`}
            className={`${styles.image} ${imgLoaded ? styles.imageVisible : ''}`}
            loading="lazy"
            onLoad={() => setImgLoaded(true)}
          />
        </div>
      )}

      {/* ── Actions row (Instagram-style) ── */}
      <div className={styles.actions}>
        <button
          id={`like-${post.id}`}
          className={`${styles.actionBtn} ${liked ? styles.actionBtnLiked : ''}`}
          onClick={handleLike}
          disabled={!userId}
          aria-label={liked ? 'Unlike post' : 'Like post'}
        >
          <svg
            viewBox="0 0 24 24"
            fill={liked ? 'var(--heartRed)' : 'none'}
            stroke={liked ? 'var(--heartRed)' : 'currentColor'}
            strokeWidth="2"
            className={`${styles.heartIcon} ${liked ? styles.heartPop : ''}`}
          >
            <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
          </svg>
          {likesCount > 0 && <span className={styles.actionCount}>{likesCount}</span>}
        </button>

        {onStallClick && post.stall_id && (
          <button
            className={styles.actionBtn}
            onClick={() => onStallClick(post.stall_id)}
            aria-label="View on map"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          </button>
        )}

        {/* Rating badge */}
        {post.rating && (
          <div className={styles.ratingBadge}>
            <StarRating rating={post.rating} />
          </div>
        )}
      </div>

      {/* ── Caption ── */}
      {post.caption && (
        <div className={styles.captionRow}>
          <span className={styles.captionUsername}>{username}</span>
          <span className={styles.caption}>{post.caption}</span>
        </div>
      )}

      {/* ── Time footer (mobile) ── */}
      <div className={styles.timeFooter}>{getRelativeTime(post.created_at)}</div>
    </article>
  );
}
