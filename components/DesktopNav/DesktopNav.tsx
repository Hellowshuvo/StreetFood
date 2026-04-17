import React from 'react';
import { useRouter } from 'next/navigation';
import styles from './DesktopNav.module.css';

interface DesktopNavProps {
  activeTab: 'feed' | 'map' | 'account' | 'saved';
  userId: string | null;
  onAddClick: () => void;
  onSignInRequired: () => void;
}

export default function DesktopNav({
  activeTab,
  userId,
  onAddClick,
  onSignInRequired,
}: DesktopNavProps) {
  const router = useRouter();

  const handleAccountClick = () => {
    if (!userId) {
      onSignInRequired();
      return;
    }
    router.push('/account');
  };

  return (
    <nav className={styles.nav} aria-label="Desktop Navigation">
      <button
        className={`${styles.navItem} ${activeTab === 'feed' ? styles.active : ''}`}
        onClick={() => router.push('/')}
        aria-label="Feed"
        title="Feed"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
        </svg>
      </button>

      <button
        className={`${styles.navItem} ${activeTab === 'map' ? styles.active : ''}`}
        onClick={() => router.push('/map')}
        aria-label="Map"
        title="Map"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
          <line x1="8" y1="2" x2="8" y2="18" />
          <line x1="16" y1="6" x2="16" y2="22" />
        </svg>
      </button>

      <button
        className={`${styles.navItem} ${activeTab === 'saved' ? styles.active : ''}`}
        onClick={() => router.push('/saved')}
        aria-label="Saved stalls"
        title="Saved Stores"
      >
        <svg viewBox="0 0 24 24" fill={activeTab === 'saved' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
      </button>

      <div className={styles.divider} />

      <button
        className={styles.addBtn}
        onClick={onAddClick}
        aria-label="Add a new stall"
        title="Add Stall"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        <span>Add</span>
      </button>

      <button
        className={`${styles.navItem} ${activeTab === 'account' ? styles.active : ''}`}
        onClick={handleAccountClick}
        aria-label="My account"
        title="Account"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      </button>
    </nav>
  );
}
