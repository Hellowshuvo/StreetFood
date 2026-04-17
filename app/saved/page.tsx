'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './saved.module.css';
import { supabase } from '@/lib/supabase';
import { useSavedStalls } from '@/lib/useSavedStalls';
import type { Stall } from '@/lib/types';
import BottomNav from '@/components/BottomNav/BottomNav';
import DesktopNav from '@/components/DesktopNav/DesktopNav';
import AuthModal from '@/components/AuthModal/AuthModal';

export default function SavedPage() {
  const router = useRouter();
  const { savedStallIds, toggleSave, isHydrated } = useSavedStalls();
  const [stalls, setStalls] = useState<Stall[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    async function loadSavedStalls() {
      if (savedStallIds.length === 0) {
        setStalls([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('stalls')
          .select('*')
          .in('id', savedStallIds);
        
        if (data && !error) {
          // Sort matched stalls based on recently saved order (end of array = newest)
          const sorted = data.sort((a, b) => {
            return savedStallIds.indexOf(b.id) - savedStallIds.indexOf(a.id);
          });
          setStalls(sorted as Stall[]);
        }
      } catch (err) {
        console.error('Error fetching saved stalls:', err);
      }
      setLoading(false);
    }
    if (isHydrated) {
      loadSavedStalls();
    }
  }, [savedStallIds, isHydrated]);

  const handleCardClick = (stallId: string) => {
    router.push(`/map?stall=${stallId}`);
  };

  const handleRemove = (e: React.MouseEvent, stallId: string) => {
    e.stopPropagation();
    toggleSave(stallId);
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.title}>Saved</div>
        <div className={styles.headerRight}>
          <DesktopNav
            activeTab="saved"
            userId={userId}
            onAddClick={() => {
               if (!userId) setShowAuth(true);
               else router.push('/?add=true');
            }}
            onSignInRequired={() => setShowAuth(true)}
          />
        </div>
      </header>

      <main className={styles.main}>
        {!isHydrated || loading ? (
          <div className={styles.loader}>
            <div className={styles.spinner} style={{ width: 24, height: 24, border: '2px solid var(--text-tertiary)', borderTopColor: 'var(--text-primary)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
          </div>
        ) : stalls.length > 0 ? (
          <div className={styles.grid}>
            {stalls.map((stall) => (
              <div key={stall.id} className={styles.card} onClick={() => handleCardClick(stall.id)}>
                <div className={styles.imageWrapper}>
                  {stall.photo_url ? (
                    <img src={stall.photo_url} alt={stall.name} className={styles.image} />
                  ) : (
                    <div className={styles.placeholder}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                      </svg>
                    </div>
                  )}
                </div>
                
                <div className={styles.content}>
                  <div className={styles.infoTop}>
                    <div className={styles.name}>{stall.name}</div>
                    <div className={styles.category}>{stall.category}</div>
                  </div>
                  <div className={styles.infoBottom}>
                    <div className={styles.rating}>★ {Number(stall.avg_rating || 0).toFixed(1)}</div>
                    <button className={styles.removeBtn} onClick={(e) => handleRemove(e, stall.id)} aria-label="Remove from saved">
                      <svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2">
                        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.empty}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
            <div className={styles.emptyText}>No saved stalls yet.</div>
          </div>
        )}
        <div className={styles.bottomSpacer} />
      </main>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}

      <BottomNav
        activeTab="saved"
        userId={userId}
        onAddClick={() => {
          if (!userId) setShowAuth(true);
          // Assuming AddModal would be implemented globally or triggered via context in real app
          else router.push('/?add=true'); // Fallback
        }}
        onSignInRequired={() => setShowAuth(true)}
      />
    </div>
  );
}
