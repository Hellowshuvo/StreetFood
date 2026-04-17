'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import styles from './account.module.css';
import AuthModal from '@/components/AuthModal/AuthModal';
import BottomNav from '@/components/BottomNav/BottomNav';
import { supabase } from '@/lib/supabase';
import type { Profile, Post } from '@/lib/types';

interface UserStats {
  postsCount: number;
  stallsCount: number;
  reviewsCount: number;
}

// Animated gradient avatar with user initials
function AnimatedProfileAvatar({ name, size = 96 }: { name: string; size?: number }) {
  const initial = name ? name.charAt(0).toUpperCase() : '?';
  const hue = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
  return (
    <div
      className={styles.gradientAvatar}
      style={{
        width: size,
        height: size,
        background: `conic-gradient(
          hsl(${hue}, 70%, 50%),
          hsl(${(hue + 90) % 360}, 80%, 60%),
          hsl(${(hue + 180) % 360}, 75%, 55%),
          hsl(${(hue + 270) % 360}, 70%, 50%),
          hsl(${hue}, 70%, 50%)
        )`,
        fontSize: size * 0.38,
      }}
    >
      <div className={styles.gradientAvatarInner}>{initial}</div>
    </div>
  );
}

export default function AccountPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<UserStats>({ postsCount: 0, stallsCount: 0, reviewsCount: 0 });
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAuth, setShowAuth] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

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
      else { setProfile(null); setPosts([]); setLoading(false); }
    });

    return () => subscription.unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

      // Stats in parallel
      const [postsRes, stallsRes, reviewsRes] = await Promise.all([
        supabase.from('posts').select('id', { count: 'exact', head: true }).eq('user_id', uid),
        supabase.from('stalls').select('id', { count: 'exact', head: true }).eq('created_by', uid),
        supabase.from('ratings').select('id', { count: 'exact', head: true }).eq('user_id', uid),
      ]);
      setStats({
        postsCount: postsRes.count ?? 0,
        stallsCount: stallsRes.count ?? 0,
        reviewsCount: reviewsRes.count ?? 0,
      });

      // User's posts with photos
      const { data: postsData } = await supabase
        .from('posts')
        .select('*, stalls(name, category, avg_rating)')
        .eq('user_id', uid)
        .not('photo_url', 'is', null)
        .order('created_at', { ascending: false })
        .limit(30);
      setPosts((postsData as Post[]) ?? []);
    } catch (err) {
      console.error('Failed to load profile:', err);
    }
    setLoading(false);
  }, []);

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
          <div className={styles.headerSpacer} />
        </header>

        <div className={styles.signInPrompt}>
          <div className={styles.signInIcon}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <h2 className={styles.signInTitle}>Sign in to see your profile</h2>
          <p className={styles.signInHint}>Share your street food discoveries, rate stalls, and build your foodie history.</p>
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
        <button id="signout-btn" className={styles.signOutBtn} onClick={handleSignOut}>
          Sign Out
        </button>
      </header>

      <div className={styles.scroll}>
        {/* ── Profile Section ── */}
        <section className={styles.profileSection}>
          {/* Avatar */}
          <div className={styles.avatarWrapper}>
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={`${displayName}'s profile photo`}
                className={styles.avatar}
                loading="lazy"
              />
            ) : (
              <AnimatedProfileAvatar name={displayName} size={96} />
            )}
            <div className={styles.avatarRing} />
          </div>

          {/* Name + bio */}
          <div className={styles.profileInfo}>
            <h1 className={styles.displayName}>{displayName}</h1>
            {(profile as any)?.bio && <p className={styles.bio}>{(profile as any).bio}</p>}
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
              <span className={styles.statLabel}>Stalls Added</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.stat}>
              <span className={styles.statNumber}>{stats.reviewsCount}</span>
              <span className={styles.statLabel}>Reviews</span>
            </div>
          </div>
        </section>

        {/* ── Divider ── */}
        <div className={styles.sectionDivider}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="18" height="18">
            <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
          </svg>
          <span>My Posts</span>
        </div>

        {/* ── Posts Grid ── */}
        {loading ? (
          <div className={styles.gridLoading}>
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
          <div className={styles.noPosts}>
            <div className={styles.noPostsIcon}>📸</div>
            <p className={styles.noPostsText}>No posts yet</p>
            <p className={styles.noPostsHint}>Add your first street food discovery!</p>
          </div>
        )}

        <div className={styles.bottomSpacer} />
      </div>

      {/* Post detail overlay */}
      {selectedPost && (
        <div className={styles.postOverlay} onClick={() => setSelectedPost(null)}>
          <div className={styles.postDetail} onClick={(e) => e.stopPropagation()}>
            <button className={styles.postDetailClose} onClick={() => setSelectedPost(null)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            {selectedPost.photo_url && (
              <img src={selectedPost.photo_url} alt="Post" className={styles.postDetailImg} />
            )}
            {selectedPost.caption && <p className={styles.postDetailCaption}>{selectedPost.caption}</p>}
          </div>
        </div>
      )}

      <BottomNav
        activeTab="account"
        userId={userId}
        onAddClick={() => router.push('/map')}
        onSignInRequired={() => setShowAuth(true)}
      />

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </div>
  );
}
