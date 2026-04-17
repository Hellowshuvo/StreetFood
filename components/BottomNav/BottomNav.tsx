'use client';

import React, { memo } from 'react';
import { useRouter } from 'next/navigation';
import styles from './BottomNav.module.css';

interface BottomNavProps {
  activeTab: 'feed' | 'map' | 'account';
  userId: string | null;
  onAddClick: () => void;
  onSignInRequired: () => void;
}

const BottomNav = memo(function BottomNav({
  activeTab,
  userId,
  onAddClick,
  onSignInRequired,
}: BottomNavProps) {
  const router = useRouter();

  const handleAccountClick = () => {
    if (!userId) {
      onSignInRequired();
      return;
    }
    router.push('/account');
  };

  return (
    <nav className={styles.container} aria-label="Bottom Navigation">
      {/* Feed */}
      <button
        id="nav-feed"
        className={`${styles.tab} ${activeTab === 'feed' ? styles.tabActive : ''}`}
        onClick={() => router.push('/')}
        aria-label="Feed"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
        </svg>
        <span className={styles.label}>Feed</span>
      </button>

      {/* Map */}
      <button
        id="nav-map"
        className={`${styles.tab} ${activeTab === 'map' ? styles.tabActive : ''}`}
        onClick={() => router.push('/map')}
        aria-label="Map"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
          <line x1="8" y1="2" x2="8" y2="18" />
          <line x1="16" y1="6" x2="16" y2="22" />
        </svg>
        <span className={styles.label}>Map</span>
      </button>

      {/* Add — centre hero button */}
      <button
        id="nav-add"
        className={styles.addBtn}
        onClick={onAddClick}
        aria-label="Add a new stall"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>

      {/* Account */}
      <button
        id="nav-account"
        className={`${styles.tab} ${activeTab === 'account' ? styles.tabActive : ''}`}
        onClick={handleAccountClick}
        aria-label="My account"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
        <span className={styles.label}>Account</span>
      </button>
    </nav>
  );
});

export default BottomNav;
