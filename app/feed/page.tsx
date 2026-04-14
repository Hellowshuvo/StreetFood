'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import styles from './feed.module.css';
import PostCard from '@/components/PostCard/PostCard';
import type { Post } from '@/lib/types';
import { supabase } from '@/lib/supabase';

import { DEFAULT_LOCATION, type Coordinates, getCurrentPosition } from '@/lib/geo';

type FeedTab = 'local' | 'bangladesh';

export default function FeedPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState<FeedTab>('local');
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const loadingRef = useRef(false);
  const pageRef = useRef(0);
  const PAGE_SIZE = 10;

  // Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, session) => {
      setUserId(session?.user?.id ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load posts
  const loadPosts = useCallback(async (page: number, tabOverride?: FeedTab) => {
    const tab = tabOverride || currentTab;
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);

    try {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let data, error;

      if (tab === 'local') {
        let loc = userLocation;
        if (!loc) {
          try {
            loc = await getCurrentPosition();
            setUserLocation(loc);
          } catch (e) {
            console.warn('Geolocation failed, falling back to all posts');
          }
        }

        if (loc) {
          const { data: rpcData, error: rpcError } = await supabase.rpc('get_nearby_posts', {
            user_lat: loc.lat,
            user_lng: loc.lng,
            radius_km: 20.0
          }).range(from, to);
          data = rpcData;
          error = rpcError;
        } else {
          // Fallback to all posts if location is unavailable
          const { data: allData, error: allError } = await supabase
            .from('posts')
            .select('*, profiles(username, avatar_url), stalls(name, category, avg_rating)')
            .order('created_at', { ascending: false })
            .range(from, to);
          data = allData;
          error = allError;
        }
      } else {
        // Bangladesh Tab: All posts
        const { data: allData, error: allError } = await supabase
          .from('posts')
          .select('*, profiles(username, avatar_url), stalls(name, category, avg_rating)')
          .order('created_at', { ascending: false })
          .range(from, to);
        data = allData;
        error = allError;
      }

      if (data && !error) {
        if (data.length < PAGE_SIZE) {
          setHasMore(false);
        }
        setPosts((prev) => (page === 0 ? data : [...prev, ...data]) as Post[]);
      } else if (error) {
        console.error('Query error:', error);
      }
    } catch (e) {
      console.error('Failed to load posts:', e);
    }

    setLoading(false);
    loadingRef.current = false;
  }, [currentTab, userLocation]);

  // Handle Tab Change
  const handleTabChange = useCallback((newTab: FeedTab) => {
    if (newTab === currentTab) return;
    setCurrentTab(newTab);
    setPosts([]);
    setHasMore(true);
    pageRef.current = 0;
    loadPosts(0, newTab);
  }, [currentTab, loadPosts]);

  // Initial load
  useEffect(() => {
    loadPosts(0);
  }, [loadPosts]);

  // Infinite scroll
  useEffect(() => {
    const handleScroll = () => {
      const scrollable = document.querySelector(`.${styles.feed}`);
      if (!scrollable || !hasMore || loadingRef.current) return;

      const { scrollTop, scrollHeight, clientHeight } = scrollable;
      if (scrollTop + clientHeight >= scrollHeight - 200) {
        pageRef.current += 1;
        loadPosts(pageRef.current);
      }
    };

    const scrollable = document.querySelector(`.${styles.feed}`);
    scrollable?.addEventListener('scroll', handleScroll);
    return () => scrollable?.removeEventListener('scroll', handleScroll);
  }, [hasMore, loadPosts]);

  const handleStallClick = useCallback((stallId: string) => {
    // Navigate to map with stall focused
    window.location.href = `/?stall=${stallId}`;
  }, []);

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => window.location.href = '/'}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div className={styles.tabs}>
          <button 
            className={`${styles.tab} ${currentTab === 'local' ? styles.tabActive : ''}`}
            onClick={() => handleTabChange('local')}
          >
            Explore Local
          </button>
          <button 
            className={`${styles.tab} ${currentTab === 'bangladesh' ? styles.tabActive : ''}`}
            onClick={() => handleTabChange('bangladesh')}
          >
            Bangladesh
          </button>
        </div>
        <div className={styles.headerSpacer} />
      </header>

      {/* Feed */}
      <div className={styles.feed}>
        <div className={styles.posts}>
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              userId={userId}
              onStallClick={handleStallClick}
            />
          ))}

          {loading && (
            <div className={styles.loader}>
              <div className={styles.spinner} />
            </div>
          )}

          {!loading && posts.length === 0 && (
            <div className={styles.empty}>
              <p>No posts yet</p>
              <p className={styles.emptyHint}>
                Be the first to share a street food discovery!
              </p>
            </div>
          )}

          {!hasMore && posts.length > 0 && (
            <p className={styles.end}>You&apos;ve reached the end</p>
          )}
        </div>
      </div>
    </div>
  );
}
