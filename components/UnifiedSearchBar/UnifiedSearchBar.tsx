'use client';

import { useState, useRef, useEffect } from 'react';
import styles from './UnifiedSearchBar.module.css';
import LocationSearch from '@/components/LocationSearch/LocationSearch';

export interface LocationFilterState {
  division?: string;
  district?: string;
  upazilaId?: string;
  unionId?: string;
  areaId?: string;
  upazilaName?: string;
  unionName?: string;
  areaName?: string;
}

interface UnifiedSearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  locationFilter: LocationFilterState;
  onLocationChange: (location: LocationFilterState) => void;
  onModalToggle?: (isOpen: boolean) => void;
  placeholder?: string;
}

export default function UnifiedSearchBar({
  searchQuery,
  onSearchChange,
  locationFilter,
  onLocationChange,
  onModalToggle,
  placeholder = "Search stalls..."
}: UnifiedSearchBarProps) {
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMounted(true);
  }, []);

  // Notify parent of modal state
  useEffect(() => {
    onModalToggle?.(isLocationOpen);
  }, [isLocationOpen, onModalToggle]);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setIsLocationOpen(false);
      }
    }
    if (isLocationOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isLocationOpen]);

  // Format current location text
  const getLocationText = () => {
    const isSmallScreen = isMounted && window.innerWidth < 480;
    
    if (!locationFilter.district) {
      return isSmallScreen ? "Location" : "Explore Location";
    }
    
    // On mobile screens, just show the most specific part to save space
    if (isSmallScreen) {
      if (locationFilter.areaName) return locationFilter.areaName;
      if (locationFilter.unionName) return locationFilter.unionName;
      if (locationFilter.upazilaName) return locationFilter.upazilaName;
      return locationFilter.district.replace(' District', '');
    }

    const parts = [];
    if (locationFilter.district) parts.push(locationFilter.district.replace(' District', ''));
    if (locationFilter.upazilaName) parts.push(locationFilter.upazilaName);
    return parts.join(' > ');
  };

  return (
    <div className={styles.wrapper}>
      <div className={`${styles.container} glass`}>
        {/* Left Side: Search */}
        <div className={styles.searchZone}>
          <div className={styles.iconWrapper}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
          </div>
          <input
            type="text"
            className={styles.input}
            placeholder={placeholder}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          <span className={styles.microLabel}>Search</span>
        </div>

        {/* Vertical Divider */}
        <div className={styles.divider} />

        {/* Right Side: Location */}
        <button 
          className={styles.locationZone}
          onClick={() => setIsLocationOpen(!isLocationOpen)}
          aria-label="Filter by location"
        >
          <div className={styles.iconWrapper}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          </div>
          <div className={styles.locationContent}>
            <span className={styles.locationText}>{getLocationText()}</span>
          </div>
          <span className={styles.microLabel}>Location</span>
        </button>
      </div>

      {/* Location Modal / Overlay */}
      {isLocationOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsLocationOpen(false)}>
          <div 
            className={`${styles.modal} glass`} 
            onClick={(e) => e.stopPropagation()}
            ref={modalRef}
          >
            <div className={styles.modalHeader}>
              <h3>Select Location</h3>
              <button 
                className={styles.closeBtn}
                onClick={() => setIsLocationOpen(false)}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className={styles.modalBody}>
              <LocationSearch 
                onLocationChange={(loc) => {
                  onLocationChange(loc);
                  setIsLocationOpen(false);
                }} 
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
