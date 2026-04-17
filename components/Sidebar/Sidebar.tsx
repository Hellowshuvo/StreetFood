'use client';

import { useRouter } from 'next/navigation';
import styles from './Sidebar.module.css';
import CategoryFilter from '@/components/CategoryFilter/CategoryFilter';
import UserAvatar from '@/components/UserAvatar/UserAvatar';
import type { Category } from '@/lib/types';

interface SidebarProps {
  activeCategory: Category | null;
  onCategoryChange: (category: Category | null) => void;
  sortMode: 'nearby' | 'top-rated' | null;
  onSortChange: (mode: 'nearby' | 'top-rated' | null) => void;
  activePage: 'map' | 'feed' | 'account';
  onPageChange: (page: 'map' | 'feed' | 'account') => void;
  stallCount: number;
  userId: string | null;
  userAvatar: string | null;
  onSignIn: () => void;
  onSignOut: () => void;
  isOpen: boolean;
  onClose: () => void;
  onLocationChange: (location: any) => void;
}

export default function Sidebar({
  activeCategory,
  onCategoryChange,
  sortMode,
  onSortChange,
  activePage,
  onPageChange,
  stallCount,
  userId,
  userAvatar,
  onSignIn,
  onSignOut,
  isOpen,
  onClose,
  onLocationChange,
}: SidebarProps) {
  const router = useRouter();

  const handleNav = (page: 'map' | 'feed' | 'account') => {
    onPageChange(page);
    if (page === 'feed') router.push('/');
    else if (page === 'map') router.push('/map');
    else if (page === 'account') router.push('/account');
    onClose();
  };

  return (
    <>
      <div 
        className={`${styles.backdrop} ${isOpen ? styles.backdropOpen : ''}`} 
        onClick={onClose} 
      />
      <aside className={`${styles.sidebar} ${isOpen ? styles.open : ''}`}>
      {/* Logo */}
      <div className={styles.logo} onClick={() => handleNav('feed')} style={{ cursor: 'pointer' }}>
        <div className={styles['logo-icon']}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
        </div>
        <div>
          <h1 className={styles['logo-text']}>Street Food</h1>
          <p className={styles['logo-sub']}>Discover local flavors</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className={styles.nav}>
        <button
          className={`${styles['nav-item']} ${activePage === 'feed' ? styles.active : ''}`}
          onClick={() => handleNav('feed')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
          </svg>
          <span>Feed</span>
        </button>
        <button
          className={`${styles['nav-item']} ${activePage === 'map' ? styles.active : ''}`}
          onClick={() => handleNav('map')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
            <line x1="8" y1="2" x2="8" y2="18" />
            <line x1="16" y1="6" x2="16" y2="22" />
          </svg>
          <span>Map</span>
        </button>
        {userId && (
          <button
            className={`${styles['nav-item']} ${activePage === 'account' ? styles.active : ''}`}
            onClick={() => handleNav('account')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <span>Account</span>
          </button>
        )}
      </nav>

      <div className={styles.divider} />

      <div className={styles.divider} />

      {/* Category Filters */}
      <div className={styles.section}>
        <h3 className={styles['section-title']}>Categories</h3>
        <CategoryFilter
          activeCategory={activeCategory}
          onSelect={onCategoryChange}
          layout="vertical"
        />
      </div>

      <div className={styles.divider} />

      {/* Quick Filters */}
      <div className={styles.section}>
        <h3 className={styles['section-title']}>Quick Filters</h3>
        <div className={styles.toggles}>
          <button
            className={`${styles.toggle} ${sortMode === 'top-rated' ? styles['toggle-active'] : ''}`}
            onClick={() =>
              onSortChange(sortMode === 'top-rated' ? null : 'top-rated')
            }
          >
            <span className={styles['toggle-icon']}>★</span>
            <span>Top Rated</span>
          </button>
          <button
            className={`${styles.toggle} ${sortMode === 'nearby' ? styles['toggle-active'] : ''}`}
            onClick={() =>
              onSortChange(sortMode === 'nearby' ? null : 'nearby')
            }
          >
            <span className={styles['toggle-icon']}>📍</span>
            <span>Nearby</span>
          </button>
        </div>
      </div>

      {/* Stall count */}
      <div className={styles.count}>
        <span className={styles['count-number']}>{stallCount}</span>
        <span className={styles['count-label']}>stall{stallCount !== 1 ? 's' : ''} found</span>
      </div>

      {/* Spacer */}
      <div className={styles.spacer} />

      {/* User section */}
      <div className={styles.user}>
        {userId ? (
          <div className={styles['user-info']}>
            <div className={styles.avatar}>
              <UserAvatar 
                name={userId ? 'User' : 'Sign In'} 
                src={userAvatar} 
                size={36} 
              />
            </div>
            <button className={styles['sign-out']} onClick={onSignOut}>
              Sign Out
            </button>
          </div>
        ) : (
          <button className={`btn btn-primary ${styles['sign-in']}`} onClick={onSignIn}>
            Sign In
          </button>
        )}
      </div>
    </aside>
    </>
  );
}
