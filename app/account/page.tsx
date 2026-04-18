'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import styles from './account.module.css';
import AuthModal from '@/components/AuthModal/AuthModal';
import BottomNav from '@/components/BottomNav/BottomNav';
import DesktopNav from '@/components/DesktopNav/DesktopNav';
import UserAvatar from '@/components/UserAvatar/UserAvatar';
import { supabase } from '@/lib/supabase';
import type { Profile, Post } from '@/lib/types';
import { getRelativeTime } from '@/lib/geo';

interface UserStats {
  postsCount: number;
  stallsCount: number;
  reviewsCount: number;
}

interface Review {
  id: string;
  rating: number;
  note: string | null;
  created_at: string;
  stall_id: string;
  stalls: { name: string; category: string };
}



// Star rating
function Stars({ rating }: { rating: number }) {
  return (
    <div className={styles.reviewStars}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          viewBox="0 0 24 24"
          fill={i <= rating ? 'var(--rating-gold)' : 'none'}
          stroke={i <= rating ? 'var(--rating-gold)' : 'var(--gray-600)'}
          strokeWidth="1.5"
          width="13"
          height="13"
        >
          <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
        </svg>
      ))}
    </div>
  );
}

export default function AccountPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<UserStats>({ postsCount: 0, stallsCount: 0, reviewsCount: 0 });
  const [posts, setPosts] = useState<Post[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAuth, setShowAuth] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [activeSection, setActiveSection] = useState<'posts' | 'reviews'>('posts');

  const loadProfile = useCallback(async (uid: string) => {
    setLoading(true);
    try {
      // Profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', uid)
        .single();
      setProfile(profileData ?? null);

      // Stats + content in parallel
      const [postsRes, stallsRes, reviewsRes, postsData, userReviews] = await Promise.all([
        supabase.from('posts').select('id', { count: 'exact', head: true }).eq('user_id', uid),
        supabase.from('stalls').select('id', { count: 'exact', head: true }).eq('created_by', uid),
        supabase.from('ratings').select('id', { count: 'exact', head: true }).eq('user_id', uid),
        supabase
          .from('posts')
          .select('*, stalls(name, category, avg_rating)')
          .eq('user_id', uid)
          .not('photo_url', 'is', null)
          .order('created_at', { ascending: false })
          .limit(30),
        supabase
          .from('ratings')
          .select('id, rating, note, created_at, stall_id, stalls(name, category)')
          .eq('user_id', uid)
          .order('created_at', { ascending: false })
          .limit(20),
      ]);

      setStats({
        postsCount: postsRes.count ?? 0,
        stallsCount: stallsRes.count ?? 0,
        reviewsCount: reviewsRes.count ?? 0,
      });
      setPosts((postsData.data as Post[]) ?? []);
      setReviews((userReviews.data as unknown as Review[]) ?? []);
    } catch (err) {
      console.error('Failed to load profile:', err);
    }
    setLoading(false);
  }, []);

  // Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const uid = session?.user?.id ?? null;
      setUserId(uid);
      if (uid) loadProfile(uid);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      const uid = session?.user?.id ?? null;
      setUserId(uid);
      if (uid) loadProfile(uid);
      else { setProfile(null); setPosts([]); setReviews([]); setLoading(false); }
    });

    return () => subscription.unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps


  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  // ── Not logged in ──
  if (!loading && !userId) {
    return (
      <div className={styles.page}>
        <header className={styles.header}>
          <button className={styles.backBtn} onClick={() => router.push('/')} aria-label="Go back">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <span className={styles.headerTitle}>Account</span>
          <div className={styles.headerRight}>
            <DesktopNav
              activeTab="account"
              userId={null}
              onAddClick={() => setShowAuth(true)}
              onSignInRequired={() => setShowAuth(true)}
            />
          </div>
          <div className={styles.headerSpacer} />
        </header>

        <div className={styles.signInPrompt}>
          <div className={styles.signInIconWrap}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" className={styles.signInSvg}>
              <path strokeLinecap="round" d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <h1 className={styles.signInTitle}>Sign in to your profile</h1>
          <p className={styles.signInHint}>Share street food discoveries, rate stalls, and build your foodie identity.</p>
          <button
            id="account-signin-btn"
            className={`btn btn-primary ${styles.signInBtn}`}
            onClick={() => setShowAuth(true)}
          >
            Sign In
          </button>
        </div>

        {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}

        <BottomNav
          activeTab="account"
          userId={null}
          onAddClick={() => setShowAuth(true)}
          onSignInRequired={() => setShowAuth(true)}
        />
      </div>
    );
  }

  const displayName = profile?.username || 'Foodie';

  return (
    <div className={styles.page}>
      {/* ── Header ── */}
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => router.push('/')} aria-label="Go back">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span className={styles.headerTitle}>{displayName}</span>
        <div className={styles.headerRight}>
          <DesktopNav
            activeTab="account"
            userId={userId}
            onAddClick={() => router.push('/?add=true')}
            onSignInRequired={() => setShowAuth(true)}
          />
          <button id="signout-btn" className={styles.signOutBtn} onClick={handleSignOut} aria-label="Sign out">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18">
              <path strokeLinecap="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </header>

      <div className={styles.scroll}>
        {/* ── Profile Hero ── */}
        <section className={styles.profileSection}>
          {/* Avatar */}
          <div className={styles.avatarWrapper}>
            <UserAvatar 
              name={displayName} 
              src={profile?.avatar_url} 
              size={88} 
            />
          </div>

          {/* Name */}
          <div className={styles.profileInfo}>
            <h1 className={styles.displayName}>{displayName}</h1>
            {Boolean(profile?.bio) && <p className={styles.bio}>{profile?.bio}</p>}
          </div>

          {/* Stats row */}
          <div className={styles.statsRow}>
            <div className={styles.stat}>
              <span className={styles.statNumber}>{stats.postsCount}</span>
              <span className={styles.statLabel}>Posts</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.stat}>
              <span className={styles.statNumber}>{stats.stallsCount}</span>
              <span className={styles.statLabel}>Stalls</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.stat}>
              <span className={styles.statNumber}>{stats.reviewsCount}</span>
              <span className={styles.statLabel}>Reviews</span>
            </div>
          </div>
        </section>

        {/* ── Section Toggle ── */}
        <div className={styles.sectionToggle}>
          <button
            className={`${styles.toggleBtn} ${activeSection === 'posts' ? styles.toggleBtnActive : ''}`}
            onClick={() => setActiveSection('posts')}
            aria-label="Show posts"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="20" height="20">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
            </svg>
          </button>
          <button
            className={`${styles.toggleBtn} ${activeSection === 'reviews' ? styles.toggleBtnActive : ''}`}
            onClick={() => setActiveSection('reviews')}
            aria-label="Show reviews"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="20" height="20">
              <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
            </svg>
          </button>
        </div>

        {/* ── Posts Grid ── */}
        {activeSection === 'posts' && (
          <>
            {loading ? (
              <div className={styles.postsGrid}>
                {[...Array(9)].map((_, i) => (
                  <div key={i} className={`${styles.gridItemSkeleton} skeleton`} />
                ))}
              </div>
            ) : posts.length > 0 ? (
              <div className={styles.postsGrid}>
                {posts.map((post) => (
                  <button
                    key={post.id}
                    id={`post-grid-${post.id}`}
                    className={styles.gridItem}
                    onClick={() => setSelectedPost(post)}
                    aria-label={post.caption || 'View post'}
                  >
                    <img
                      src={post.photo_url!}
                      alt={post.caption || 'Post photo'}
                      className={styles.gridImg}
                      loading="lazy"
                    />
                    {post.rating && (
                      <div className={styles.gridRating}>
                        <svg viewBox="0 0 24 24" fill="var(--rating-gold)" width="10" height="10">
                          <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
                        </svg>
                        {post.rating}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div className={styles.noContent}>
                <span className={styles.noContentIcon}>📸</span>
                <p className={styles.noContentText}>No posts yet</p>
                <p className={styles.noContentHint}>Share your first street food discovery!</p>
              </div>
            )}
          </>
        )}

        {/* ── Reviews List ── */}
        {activeSection === 'reviews' && (
          <>
            {loading ? (
              <div className={styles.reviewsList}>
                {[...Array(4)].map((_, i) => (
                  <div key={i} className={`${styles.reviewSkeleton} skeleton`} />
                ))}
              </div>
            ) : reviews.length > 0 ? (
              <div className={styles.reviewsList}>
                {reviews.map((review) => (
                  <div key={review.id} className={styles.reviewCard}>
                    <div className={styles.reviewTop}>
                      <div className={styles.reviewLeft}>
                        <span className={styles.reviewStallName}>{review.stalls?.name ?? 'Unknown Stall'}</span>
                        <span className={styles.reviewCategory}>{review.stalls?.category}</span>
                      </div>
                      <div className={styles.reviewRight}>
                        <Stars rating={review.rating} />
                        <span className={styles.reviewTime}>{getRelativeTime(review.created_at)}</span>
                      </div>
                    </div>
                    {review.note && (
                      <p className={styles.reviewComment}>{review.note}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.noContent}>
                <span className={styles.noContentIcon}>⭐</span>
                <p className={styles.noContentText}>No reviews yet</p>
                <p className={styles.noContentHint}>Rate stalls you&apos;ve visited on the map!</p>
              </div>
            )}
          </>
        )}

        <div className={styles.bottomSpacer} />
      </div>

      {/* Post detail overlay */}
      {selectedPost && (
        <div className={styles.postOverlay} onClick={() => setSelectedPost(null)}>
          <div className={styles.postDetail} onClick={(e) => e.stopPropagation()}>
            <button className={styles.postDetailClose} onClick={() => setSelectedPost(null)} aria-label="Close">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            {selectedPost.photo_url && (
              <img src={selectedPost.photo_url} alt="Post" className={styles.postDetailImg} />
            )}
            {selectedPost.caption && <p className={styles.postDetailCaption}>{selectedPost.caption}</p>}
            {selectedPost.rating && (
              <div className={styles.postDetailRating}>
                <Stars rating={selectedPost.rating} />
              </div>
            )}
          </div>
        </div>
      )}

      <BottomNav
        activeTab="account"
        userId={userId}
        onAddClick={() => router.push('/')}
        onSignInRequired={() => setShowAuth(true)}
      />

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </div>
  );
}
