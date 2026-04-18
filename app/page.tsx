'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import styles from './page.module.css';
import PostCard from '@/components/PostCard/PostCard';
import AuthModal from '@/components/AuthModal/AuthModal';
import BottomNav from '@/components/BottomNav/BottomNav';
import DesktopNav from '@/components/DesktopNav/DesktopNav';

import type { Post } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import { getCurrentPosition, type Coordinates } from '@/lib/geo';

const AddModal = dynamic(() => import('@/components/AddModal/AddModal'), { ssr: false });

type FeedTab = 'local' | 'bangladesh';

export default function FeedPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [currentTab, setCurrentTab] = useState<FeedTab>('local');
  const [showAuth, setShowAuth] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const router = useRouter();
  const loadingRef = useRef(false);
  const pageRef = useRef(0);
  const feedRef = useRef<HTMLDivElement>(null);
  const PAGE_SIZE = 12;

  // Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Header scroll shadow
  useEffect(() => {
    const el = feedRef.current;
    if (!el) return;
    const onScroll = () => setScrolled(el.scrollTop > 2);
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  // Load posts
  const loadPosts = useCallback(async (page: number, tabOverride?: FeedTab) => {
    const tab = tabOverride ?? currentTab;
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);

    try {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let data: unknown, error: unknown;

      if (tab === 'local') {
        let loc = userLocation;
        if (!loc) {
          try {
            loc = await getCurrentPosition();
            setUserLocation(loc);
          } catch {
            // Geolocation declined — fall through to global feed
          }
        }

        if (loc) {
          const result = await supabase
            .rpc('get_nearby_posts', { user_lat: loc.lat, user_lng: loc.lng, radius_km: 20.0 })
            .range(from, to);
          data = result.data;
          error = result.error;
        } else {
          const result = await supabase
            .from('posts')
            .select('*, profiles(username, avatar_url), stalls(name, category, avg_rating)')
            .order('created_at', { ascending: false })
            .range(from, to);
          data = result.data;
          error = result.error;
        }
      } else {
        const result = await supabase
          .from('posts')
          .select('*, profiles(username, avatar_url), stalls(name, category, avg_rating)')
          .order('created_at', { ascending: false })
          .range(from, to);
        data = result.data;
        error = result.error;
      }

      if (data && !error) {
        const resultData = data as any[];
        if (resultData.length < PAGE_SIZE) setHasMore(false);
        setPosts((prev) => (page === 0 ? (resultData as Post[]) : [...prev, ...(resultData as Post[])]));
      } else if (error) {
        console.error('Query error:', error);
      }
    } catch (e) {
      console.error('Failed to load posts:', e);
    }

    setLoading(false);
    loadingRef.current = false;
  }, [currentTab, userLocation]);

  const handleTabChange = useCallback((newTab: FeedTab) => {
    if (newTab === currentTab) return;
    setCurrentTab(newTab);
    setPosts([]);
    setHasMore(true);
    pageRef.current = 0;
    loadPosts(0, newTab);
  }, [currentTab, loadPosts]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadPosts(0); }, [loadPosts]);

  // Infinite scroll
  useEffect(() => {
    const el = feedRef.current;
    if (!el) return;
    const handleScroll = () => {
      if (!hasMore || loadingRef.current) return;
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 400) {
        pageRef.current += 1;
        loadPosts(pageRef.current);
      }
    };
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [hasMore, loadPosts]);

  const handleAddClick = useCallback(() => {
    if (!userId) { setShowAuth(true); return; }
    setShowAddModal(true);
  }, [userId]);

  const handleStallClick = useCallback((stallId: string) => {
    router.push(`/map?stall=${stallId}`);
  }, [router]);

  return (
    <div className={styles.page}>
      {/* ── Instagram-style Header ── */}
      <header className={`${styles.header} ${scrolled ? styles.headerScrolled : ''}`}>
        {/* Logo — left on desktop, centered on mobile */}
        <div className={styles.headerLogo}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={styles.headerLogoIcon}>
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <span className={styles.headerLogoText}>StreetFood</span>
        </div>

        {/* Feed tabs — Instagram style center indicator */}
        <div className={styles.headerTabs}>
          <button
            id="tab-local"
            className={`${styles.headerTab} ${currentTab === 'local' ? styles.headerTabActive : ''}`}
            onClick={() => handleTabChange('local')}
          >
            Local Food
          </button>
          <button
            id="tab-bangladesh"
            className={`${styles.headerTab} ${currentTab === 'bangladesh' ? styles.headerTabActive : ''}`}
            onClick={() => handleTabChange('bangladesh')}
          >
            Explore Bangladesh
          </button>
        </div>

        <div className={styles.headerRight}>
          <DesktopNav
            activeTab="feed"
            userId={userId}
            onAddClick={handleAddClick}
            onSignInRequired={() => setShowAuth(true)}
          />
        </div>
      </header>

      {/* ── Feed ── */}
      <main className={styles.feed} ref={feedRef} id="feed-scroll-container">

        {/* Skeleton loading */}
        {loading && posts.length === 0 && (
          <div className={styles.posts}>
            {[...Array(3)].map((_, i) => (
              <div key={i} className={styles.skeleton}>
                <div className={styles.skeletonHeader}>
                  <div className={`${styles.skeletonAvatar} skeleton`} />
                  <div className={styles.skeletonLines}>
                    <div className={`${styles.skeletonLine} skeleton`} />
                    <div className={`${styles.skeletonLineShort} skeleton`} />
                  </div>
                </div>
                <div className={`${styles.skeletonImage} skeleton`} />
                <div className={styles.skeletonFooter}>
                  <div className={`${styles.skeletonLine} skeleton`} style={{ width: '40%' }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Posts */}
        {posts.length > 0 && (
          <div className={styles.posts}>
            {posts.map((post, index) => (
              <PostCard
                key={post.id}
                post={post}
                userId={userId}
                onStallClick={handleStallClick}
                index={index}
              />
            ))}
          </div>
        )}

        {/* Load more spinner */}
        {loading && posts.length > 0 && (
          <div className={styles.loader}>
            <div className={styles.spinner} />
          </div>
        )}

        {/* Empty state */}
        {!loading && posts.length === 0 && (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>🍜</div>
            <h2 className={styles.emptyTitle}>No posts near you</h2>
            <p className={styles.emptyHint}>
              Be the first to discover and share a street food stall!
            </p>
            <button
              id="empty-add-btn"
              className={`${styles.emptyBtn} btn btn-primary`}
              onClick={handleAddClick}
            >
              Add a Stall
            </button>
          </div>
        )}

        {/* End of feed */}
        {!hasMore && posts.length > 0 && (
          <p className={styles.end}>✦ You&apos;ve seen it all ✦</p>
        )}

        <div className={styles.bottomSpacer} />
      </main>

      {/* Modals */}
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
      {showAddModal && userId && (
        <AddModal
          onClose={() => setShowAddModal(false)}
          userId={userId}
          userLocation={userLocation}
          onSuccess={() => { setPosts([]); setHasMore(true); pageRef.current = 0; loadPosts(0); }}
        />
      )}

      <BottomNav
        activeTab="feed"
        userId={userId}
        onAddClick={handleAddClick}
        onSignInRequired={() => setShowAuth(true)}
      />
    </div>
  );
}
