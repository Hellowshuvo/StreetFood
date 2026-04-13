'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import styles from './page.module.css';
import Sidebar from '@/components/Sidebar/Sidebar';
import StallPanel from '@/components/StallPanel/StallPanel';
import AuthModal from '@/components/AuthModal/AuthModal';
import BottomNav from '@/components/BottomNav/BottomNav';
import ThemeToggle from '@/components/ThemeToggle/ThemeToggle';
import UnifiedSearchBar from '@/components/UnifiedSearchBar/UnifiedSearchBar';
import type { Stall, Category } from '@/lib/types';
import type { Coordinates } from '@/lib/geo';
import { supabase } from '@/lib/supabase';
import { resolveLocationCoordinates } from '@/lib/geocoding';

// Dynamic imports (SSR-incompatible)
const MapView = dynamic(() => import('@/components/Map/Map'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: 'var(--gray-950)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-tertiary)',
        fontSize: 'var(--text-sm)',
      }}
    >
      Loading map…
    </div>
  ),
});

const AddModal = dynamic(() => import('@/components/AddModal/AddModal'), {
  ssr: false,
});

export default function HomePage() {
  // Auth
  const [userId, setUserId] = useState<string | null>(null);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [showAuth, setShowAuth] = useState(false);

  // Navigation
  const [activePage, setActivePage] = useState<'map' | 'feed'>('map');

  // Map data
  const [stalls, setStalls] = useState<Stall[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [selectedStall, setSelectedStall] = useState<Stall | null>(null);
  const [activeCategory, setActiveCategory] = useState<Category | null>(null);
  const [sortMode, setSortMode] = useState<'nearby' | 'top-rated' | null>(null);

  // Add flow
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLocationActive, setIsLocationActive] = useState(false);

  // Search
  // Search
  const [searchQuery, setSearchQuery] = useState('');

  // Location filter
  const [locationFilter, setLocationFilter] = useState<{
    division?: string;
    district?: string;
    upazilaId?: string;
    unionId?: string;
  }>({});

  const [mapView, setMapView] = useState<{
    center: [number, number];
    zoom: number;
  } | null>(null);

  // Bounds ref
  const boundsRef = useRef<{
    minLat: number;
    minLng: number;
    maxLat: number;
    maxLng: number;
  } | null>(null);

  // Init auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
      setUserAvatar(session?.user?.user_metadata?.avatar_url ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, session) => {
      setUserId(session?.user?.id ?? null);
      setUserAvatar(session?.user?.user_metadata?.avatar_url ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load stalls
  const loadStalls = useCallback(
    async (
      bounds?: {
        minLat: number;
        minLng: number;
        maxLat: number;
        maxLng: number;
      }
    ) => {
      setLoading(true);

      try {
        if (userLocation) {
          const { data, error } = await supabase.rpc('nearby_stalls', {
            p_lat: userLocation.lat,
            p_long: userLocation.lng,
            p_max_results: 100,
          });

          if (data && !error) {
            const mapped: Stall[] = data.map((s: any) => ({
              id: s.id,
              name: s.name,
              category: s.category,
              lat: s.lat,
              lng: s.long,
              photo_url: s.photo_url,
              avg_rating: s.avg_rating,
              total_ratings: s.total_ratings,
              created_by: s.created_by,
              created_at: s.created_at,
              distance_meters: s.dist_meters,
              district_name: s.district_name,
              upazila_id: s.upazila_id,
              union_id: s.union_id,
              area_id: s.area_id,
            }));
            setStalls(mapped);
          }
        } else if (bounds) {
          const { data, error } = await supabase.rpc('stalls_in_view', {
            p_min_lat: bounds.minLat,
            p_min_long: bounds.minLng,
            p_max_lat: bounds.maxLat,
            p_max_long: bounds.maxLng,
          });

          if (data && !error) {
            const mapped: Stall[] = data.map((s: any) => ({
              id: s.id,
              name: s.name,
              category: s.category,
              lat: s.lat,
              lng: s.long,
              photo_url: s.photo_url,
              avg_rating: s.avg_rating,
              total_ratings: s.total_ratings,
              created_by: s.created_by,
              created_at: s.created_at,
              district_name: s.district_name,
              upazila_id: s.upazila_id,
              union_id: s.union_id,
              area_id: s.area_id,
            }));
            setStalls(mapped);
          }
        }
      } catch (e) {
        console.error('Failed to load stalls:', e);
      }

      setLoading(false);
    },
    [userLocation]
  );

  // Reload on user location change
  useEffect(() => {
    if (userLocation) {
      loadStalls();
    }
  }, [userLocation]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleMapMove = useCallback(
    (bounds: {
      minLat: number;
      minLng: number;
      maxLat: number;
      maxLng: number;
    }) => {
      boundsRef.current = bounds;
      if (!userLocation) {
        loadStalls(bounds);
      }
    },
    [userLocation, loadStalls]
  );

  const handleUserLocationFound = useCallback((coords: Coordinates) => {
    setUserLocation(coords);
  }, []);

  const handleStallSelect = useCallback((stall: Stall) => {
    setSelectedStall(stall);
  }, []);

  const handleAddClick = useCallback(() => {
    if (!userId) {
      setShowAuth(true);
      return;
    }
    setShowAddModal(true);
  }, [userId]);

  const handleAddSuccess = useCallback(() => {
    loadStalls(boundsRef.current || undefined);
  }, [loadStalls]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const handleLocationChange = useCallback(async (location: any) => {
    setLocationFilter(location);

    // Resolve coordinates and update map view
    const geo = await resolveLocationCoordinates({
      division: location.division,
      district: location.district,
      upazilaId: location.upazilaId,
      unionId: location.unionId,
      upazilaName: location.upazilaName,
      unionName: location.unionName
    });

    if (geo) {
      setMapView({
        center: [geo.lat, geo.lng],
        zoom: geo.zoom
      });
    }
  }, []);

  const handlePageChange = useCallback((page: 'map' | 'feed') => {
    setActivePage(page);
    if (page === 'feed') {
      window.location.href = '/feed';
    }
  }, []);

  // Filter + sort stalls
  const filteredStalls = stalls
    .filter((s) => {
      const matchCategory = !activeCategory || s.category === activeCategory;
      const matchSearch =
        !searchQuery ||
        s.name.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchLocation = !locationFilter.district || (
        s.district_name === locationFilter.district &&
        (!locationFilter.upazilaId || s.upazila_id === locationFilter.upazilaId) &&
        (!locationFilter.unionId || s.union_id === locationFilter.unionId)
      );

      return matchCategory && matchSearch && matchLocation;
    })
    .sort((a, b) => {
      if (sortMode === 'top-rated') {
        return Number(b.avg_rating) - Number(a.avg_rating);
      }
      if (sortMode === 'nearby' && a.distance_meters && b.distance_meters) {
        return a.distance_meters - b.distance_meters;
      }
      return 0;
    });

  return (
    <div className={styles.layout}>
      {/* Map area */}
      <main className={styles.mapArea}>
        {/* Mobile Header */}
        <div className={styles.mobileHeader}>
          <div className={styles.mobileBrand}>
            <div className={styles.mobileHeaderLeft}>
              <button 
                className={styles.mobileMenuBtn}
                onClick={() => setIsSidebarOpen(true)}
                aria-label="Open menu"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              </button>
              
              <div className={styles.mobileLogo}>
                <svg className={styles.mobileLogoIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <span className={styles.mobileBrandText}>Street Food</span>
              </div>
            </div>

            <div className={styles.mobileHeaderRight}>
              <ThemeToggle />
            </div>
          </div>

          <UnifiedSearchBar 
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            locationFilter={locationFilter}
            onLocationChange={handleLocationChange}
            onModalToggle={setIsLocationActive}
          />
        </div>

        {/* Desktop search */}
        <div className={styles.desktopSearch}>
          <UnifiedSearchBar 
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            locationFilter={locationFilter}
            onLocationChange={handleLocationChange}
            onModalToggle={setIsLocationActive}
          />
        </div>

        <div className={styles.desktopThemeToggle}>
          <ThemeToggle />
        </div>

        <MapView
          stalls={filteredStalls}
          selectedStallId={selectedStall?.id ?? null}
          onStallSelect={handleStallSelect}
          onMapMove={handleMapMove}
          userLocation={userLocation}
          onUserLocationFound={handleUserLocationFound}
          focusView={mapView}
          hideControls={isLocationActive}
        />

        {/* FAB — Add stall */}
        {!isLocationActive && (
          <button
            className={styles.fab}
            onClick={handleAddClick}
            aria-label="Add stall"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        )}
      </main>

      {/* Stall Panel — conditionally rendered */}
      {selectedStall && (
        <StallPanel
          stall={selectedStall}
          onClose={() => setSelectedStall(null)}
          userId={userId}
          onSignIn={() => setShowAuth(true)}
        />
      )}

      {/* Modals */}
      {showAddModal && userId && (
        <AddModal
          onClose={() => setShowAddModal(false)}
          userId={userId}
          userLocation={userLocation}
          onSuccess={handleAddSuccess}
        />
      )}

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}

      {!isLocationActive && (
        <BottomNav 
          onAddClick={handleAddClick} 
          onProfileClick={() => {
            if (!userId) {
              setShowAuth(true);
            } else {
              setIsSidebarOpen(true);
            }
          }} 
        />
      )}

      {/* Sidebar moved to bottom for better z-index stacking */}
      <Sidebar
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
        sortMode={sortMode}
        onSortChange={setSortMode}
        activePage={activePage}
        onPageChange={handlePageChange}
        stallCount={filteredStalls.length}
        userId={userId}
        userAvatar={userAvatar}
        onSignIn={() => setShowAuth(true)}
        onSignOut={handleSignOut}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onLocationChange={handleLocationChange}
      />
    </div>
  );
}
