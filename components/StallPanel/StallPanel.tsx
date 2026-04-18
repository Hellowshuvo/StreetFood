 
/* eslint-disable @next/next/no-img-element */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, useDragControls, PanInfo } from 'framer-motion';
import styles from './StallPanel.module.css';
import RatingStars from '@/components/RatingStars/RatingStars';
import type { Stall, Post } from '@/lib/types';
import { formatDistance, openGoogleMaps, getRelativeTime } from '@/lib/geo';
import { supabase } from '@/lib/supabase';
import { useSavedStalls } from '@/lib/useSavedStalls';

interface StallPanelProps {
  stall: Stall;
  onClose: () => void;
  userId: string | null;
  onSignIn: () => void;
}

export default function StallPanel({
  stall,
  onClose,
  userId,
  onSignIn,
}: StallPanelProps) {
  const [recentPosts, setRecentPosts] = useState<Post[]>([]);
  const [showRating, setShowRating] = useState(false);
  const [myRating, setMyRating] = useState(0);
  const [ratingNote, setRatingNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Framer Motion Sheet State
  const [sheetState, setSheetState] = useState<'closed' | 'peek' | 'full'>('peek');
  const [isMobile, setIsMobile] = useState(false);
  const dragControls = useDragControls();

  const { isSaved, toggleSave } = useSavedStalls();
  const saved = isSaved(stall.id);

  const handleToggleSave = () => {
    toggleSave(stall.id);
    setToast(saved ? 'Removed from saved' : 'Saved to your list!');
    setTimeout(() => setToast(null), 2000);
  };

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Scroll lock when full
  useEffect(() => {
    if (isMobile && sheetState === 'full') {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isMobile, sheetState]);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    // Velocity based snapping
    if (info.velocity.y > 500) {
      if (sheetState === 'full') setSheetState('peek');
      else {
        setSheetState('closed');
        setTimeout(onClose, 200);
      }
    } else if (info.velocity.y < -500) {
      if (sheetState === 'peek') setSheetState('full');
    } else {
      // Position based snapping
      if (info.offset.y > 100) {
        if (sheetState === 'full') setSheetState('peek');
        else {
          setSheetState('closed');
          setTimeout(onClose, 200);
        }
      } else if (info.offset.y < -100) {
        if (sheetState === 'peek') setSheetState('full');
      }
    }
  };

  const spring = { type: "spring" as const, stiffness: 300, damping: 30 };
  const variants = {
    closed: { y: '100%' },
    peek: { y: '65%' },
    full: { y: '0%' }
  };

  // Load recent posts
  useEffect(() => {
    async function loadPosts() {
      const { data } = await supabase
        .from('posts')
        .select('*, profiles(username, avatar_url)')
        .eq('stall_id', stall.id)
        .order('created_at', { ascending: false })
        .limit(3);

      if (data) setRecentPosts(data as Post[]);
    }
    loadPosts();
  }, [stall.id]);

  const handleSubmitRating = useCallback(async () => {
    if (!userId || myRating === 0) return;
    setSubmitting(true);

    try {
      // Upsert rating
      const { error: ratingError } = await supabase.from('ratings').upsert(
        {
          stall_id: stall.id,
          user_id: userId,
          rating: myRating,
          note: ratingNote || null,
        },
        { onConflict: 'stall_id,user_id' }
      );

      if (ratingError) throw ratingError;

      setShowRating(false);
      setToast('Rating submitted!');
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      console.error('Failed to submit rating:', err);
      setToast('Failed to submit rating');
      setTimeout(() => setToast(null), 3000);
    }

    setSubmitting(false);
  }, [userId, myRating, ratingNote, stall.id]);

  return (
    <motion.div 
      className={`${styles.panel} ${isMobile && sheetState === 'full' ? styles.panelFull : ''}`}
      variants={isMobile ? variants : {}}
      initial={isMobile ? "closed" : false}
      animate={isMobile ? sheetState : false}
      transition={spring}
      drag={isMobile && sheetState !== 'full' ? 'y' : false}
      dragControls={dragControls}
      dragListener={false}
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={0.2}
      onDragEnd={handleDragEnd}
    >
      {/* Mobile Drag Handle */}
      {isMobile && (
        <div 
          className={styles.dragHandleContainer}
          onPointerDown={(e) => dragControls.start(e)}
          style={{ touchAction: 'none' }}
        >
          <div className={styles.dragHandle} />
        </div>
      )}

      {/* Close button */}
      <div className={styles.headerControls}>
        <button 
          className={`${styles.saveBtn} ${saved ? styles.saveBtnActive : ''}`} 
          onClick={handleToggleSave} 
          aria-label={saved ? "Unsave stall" : "Save stall"}
        >
          <svg viewBox="0 0 24 24" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
        </button>
        <button className={styles.close} onClick={() => { setSheetState('closed'); setTimeout(onClose, 200); }} aria-label="Close panel">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Hero Image */}
      <div className={styles.hero}>
        {stall.photo_url ? (
          <img src={stall.photo_url} alt={stall.name} className={styles['hero-img']} />
        ) : (
          <div className={styles['hero-placeholder']}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            <span>No photo</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className={styles.content}>
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.name}>{stall.name}</h2>
          <div className={styles.meta}>
            <RatingStars rating={Number(stall.avg_rating)} size="sm" />
            <span className={styles.ratingText}>
              {Number(stall.avg_rating).toFixed(1)}
            </span>
            <span className={styles.totalRatings}>
              ({stall.total_ratings})
            </span>
          </div>
        </div>

        {/* Tags */}
        <div className={styles.tags}>
          <span className={styles.tag}>{stall.category}</span>
          {stall.distance_meters && (
            <span className={styles.tag}>
              📍 {formatDistance(stall.distance_meters)}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          <button
            className="btn btn-primary"
            onClick={() => openGoogleMaps(stall.lat, stall.lng, stall.name)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            Open in Google Maps
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => {
              if (!userId) {
                onSignIn();
                return;
              }
              setShowRating(!showRating);
            }}
          >
            ★ Rate this stall
          </button>
        </div>

        {/* Inline Rating Form */}
        {showRating && (
          <div className={styles.ratingForm}>
            <p className={styles.ratingLabel}>Your rating</p>
            <RatingStars
              rating={myRating}
              interactive
              size="lg"
              onChange={setMyRating}
            />
            <textarea
              className={`input-field ${styles.ratingInput}`}
              placeholder="Add a note (optional)..."
              value={ratingNote}
              onChange={(e) => setRatingNote(e.target.value)}
              rows={2}
            />
            <button
              className="btn btn-primary"
              onClick={handleSubmitRating}
              disabled={myRating === 0 || submitting}
            >
              {submitting ? 'Submitting...' : 'Submit Rating'}
            </button>
          </div>
        )}

        {/* Divider */}
        <div className={styles.divider} />

        {/* Recent Posts */}
        <div className={styles.postsSection}>
          <h3 className={styles.postsTitle}>Recent Posts</h3>
          {recentPosts.length > 0 ? (
            <div className={styles.posts}>
              {recentPosts.map((post) => (
                <div key={post.id} className={styles.postItem}>
                  {post.photo_url && (
                    <img
                      src={post.photo_url}
                      alt="Post"
                      className={styles.postImage}
                    />
                  )}
                  <div className={styles.postContent}>
                    <div className={styles.postUser}>
                      {post.profiles?.username || 'Anonymous'}
                    </div>
                    {post.caption && (
                      <p className={styles.postCaption}>{post.caption}</p>
                    )}
                    <span className={styles.postTime}>
                      {getRelativeTime(post.created_at)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className={styles.noPosts}>No posts yet. Be the first!</p>
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`toast ${toast.includes('Failed') ? 'toast-error' : 'toast-success'}`}>
          {toast}
        </div>
      )}
    </motion.div>
  );
}
