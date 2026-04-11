'use client';

import { usePathname, useRouter } from 'next/navigation';
import styles from './BottomNav.module.css';

interface BottomNavProps {
  onAddClick: () => void;
  onProfileClick: () => void;
}

export default function BottomNav({ onAddClick, onProfileClick }: BottomNavProps) {
  const router = useRouter();
  const pathname = usePathname();

  // Assuming active if on map (home)
  const isMapActive = pathname === '/';
  const isFeedActive = pathname === '/feed';

  return (
    <nav className={styles.container} aria-label="Bottom Navigation">
      {/* Home (Map) Tab */}
      <button 
        className={`${styles.tab} ${isMapActive ? styles.tabActive : ''}`}
        onClick={() => router.push('/')}
        aria-label="Home map view"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline strokeLinecap="round" strokeLinejoin="round" points="9 22 9 12 15 12 15 22" />
        </svg>
        <span className={styles.label}>Map</span>
      </button>

      {/* Feed Tab */}
      <button 
        className={`${styles.tab} ${isFeedActive ? styles.tabActive : ''}`}
        onClick={() => router.push('/feed')}
        aria-label="Feed stream"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10l4 4v10a2 2 0 01-2 2z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h4M7 12h8M7 16h8" />
        </svg>
        <span className={styles.label}>Feed</span>
      </button>

      {/* Add Stall Tab */}
      <button 
        className={styles.tab}
        onClick={onAddClick}
        aria-label="Add new stall"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="12" cy="12" r="10" strokeLinecap="round" strokeLinejoin="round" />
          <line x1="12" y1="8" x2="12" y2="16" strokeLinecap="round" strokeLinejoin="round" />
          <line x1="8" y1="12" x2="16" y2="12" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className={styles.label}>Add</span>
      </button>

      {/* Profile Tab */}
      <button 
        className={styles.tab}
        onClick={onProfileClick}
        aria-label="User profile"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className={styles.label}>Profile</span>
      </button>
    </nav>
  );
}
