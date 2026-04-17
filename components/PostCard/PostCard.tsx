'use client';

import { useState, useCallback, useEffect } from 'react';
import styles from './PostCard.module.css';
import type { Post } from '@/lib/types';
import { getRelativeTime } from '@/lib/geo';
import { supabase } from '@/lib/supabase';
import UserAvatar from '@/components/UserAvatar/UserAvatar';

interface PostCardProps {
  post: Post;
  userId: string | null;
  onStallClick?: (stallId: string) => void;
  index?: number;
}



// Star rating display
function StarRating({ rating }: { rating: number }) {
  return (
    <div className={styles.stars} aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          viewBox="0 0 24 24"
          fill={i <= rating ? 'var(--rating-gold)' : 'none'}
          stroke={i <= rating ? 'var(--rating-gold)' : 'currentColor'}
          strokeWidth="1.5"
          className={styles.star}
        >
          <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
        </svg>
      ))}
    </div>
  );
}

export default function PostCard({ post, userId, onStallClick, index = 0 }: PostCardProps) {
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likes_count ?? 0);
  const [likeLoading, setLikeLoading] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [showHeartAnim, setShowHeartAnim] = useState(false);
  const [saved, setSaved] = useState(false);

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
    setLiked(!wasLiked);
    setLikesCount((c) => (wasLiked ? Math.max(0, c - 1) : c + 1));
    if (!wasLiked) {
      setShowHeartAnim(true);
      setTimeout(() => setShowHeartAnim(false), 700);
    }

    try {
      if (wasLiked) {
        await supabase.from('likes').delete().eq('post_id', post.id).eq('user_id', userId);
      } else {
        await supabase.from('likes').insert({ post_id: post.id, user_id: userId });
      }
    } catch {
      setLiked(wasLiked);
      setLikesCount((c) => (wasLiked ? c + 1 : Math.max(0, c - 1)));
    }

    setLikeLoading(false);
  }, [userId, liked, likeLoading, post.id]);

  // Double-tap to like on mobile
  const handleDoubleTap = useCallback(() => {
    if (!liked) handleLike();
  }, [liked, handleLike]);

  const profile = post.profiles;
  const stallName = post.stalls?.name;
  const username = profile?.username || 'Anonymous';

  return (
    <article
      className={styles.card}
      style={{ animationDelay: `${Math.min(index * 40, 200)}ms` }}
    >
      {/* ── Header ── */}
      <div className={styles.header}>
        {/* Avatar */}
        <div className={styles.avatar}>
          <UserAvatar 
            name={username} 
            src={profile?.avatar_url} 
            size={34} 
          />
        </div>

        <div className={styles.userMeta}>
          <span className={styles.username}>{username}</span>
          {stallName && (
            <button
              className={styles.stallTag}
              onClick={() => onStallClick?.(post.stall_id)}
              aria-label={`View ${stallName} on map`}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              {stallName}
            </button>
          )}
        </div>

        {/* Three-dot menu placeholder — shows time */}
        <span className={styles.time}>{getRelativeTime(post.created_at)}</span>
      </div>

      {/* ── Image ── */}
      {post.photo_url && (
        <div
          className={styles.imageWrapper}
          onDoubleClick={handleDoubleTap}
          role="img"
          aria-label={post.caption ? `Photo: ${post.caption.slice(0, 60)}` : `Street food at ${stallName || 'a stall'}`}
        >
          {!imgLoaded && <div className={`${styles.imagePlaceholder} skeleton`} />}
          <img
            src={post.photo_url}
            alt={post.caption ? post.caption.slice(0, 100) : `Street food at ${stallName || 'a stall'}`}
            className={`${styles.image} ${imgLoaded ? styles.imageVisible : ''}`}
            loading="lazy"
            onLoad={() => setImgLoaded(true)}
            decoding="async"
          />
          {/* Double-tap heart burst */}
          {showHeartAnim && (
            <div className={styles.heartBurst} aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="var(--heartRed)" width="72" height="72">
                <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
              </svg>
            </div>
          )}
        </div>
      )}

      {/* ── Actions Row ── */}
      <div className={styles.actions}>
        {/* Like */}
        <div className={styles.actionItem}>
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
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </button>
        </div>
 
        {/* Map link */}
        <div className={styles.actionItem}>
          {onStallClick && post.stall_id && (
            <button
              className={styles.actionBtn}
              onClick={() => onStallClick(post.stall_id)}
              aria-label="View on map"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
                <line x1="8" y1="2" x2="8" y2="18" />
                <line x1="16" y1="6" x2="16" y2="22" />
              </svg>
            </button>
          )}
        </div>
 
        {/* Save/Bookmark */}
        <div className={styles.actionItem}>
          <button
            className={`${styles.actionBtn} ${saved ? styles.actionBtnSaved : ''}`}
            onClick={() => setSaved(!saved)}
            aria-label={saved ? 'Unsave post' : 'Save post'}
          >
            <svg viewBox="0 0 24 24" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
          </button>
        </div>
 
        {/* Rating — aligned to grid */}
        <div className={styles.actionItem}>
          {post.rating && (
            <div className={styles.ratingMinimal}>
              <StarRating rating={post.rating} />
            </div>
          )}
        </div>
      </div>

      {/* ── Likes count ── */}
      {likesCount > 0 && (
        <div className={styles.likesRow}>
          {likesCount.toLocaleString()} {likesCount === 1 ? 'like' : 'likes'}
        </div>
      )}

      {/* ── Caption ── */}
      {post.caption && (
        <div className={styles.captionRow}>
          <span className={styles.captionUsername}>{username}</span>
          <span className={styles.caption}>{post.caption}</span>
        </div>
      )}

    </article>
  );
}
