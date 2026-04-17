import { useState, useEffect, useCallback, useRef } from 'react';

const STORAGE_KEY = 'streetfood_saved_stalls';

export function useSavedStalls() {
  const [savedStallIds, setSavedStallIds] = useState<string[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  // Initialize state from localStorage after mount to avoid hydration mismatch
  useEffect(() => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) setSavedStallIds(JSON.parse(data));
    } catch (e) {
      console.error('Failed to load initial saved stalls:', e);
    }
    setIsHydrated(true);
  }, []);

  // Track the current IDs in a ref to avoid stale closure issues in event listeners
  const savedIdsRef = useRef<string[]>([]);
  useEffect(() => {
    savedIdsRef.current = savedStallIds;
  }, [savedStallIds]);

  // Listen for storage changes from other tabs/instances
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setSavedStallIds(parsed);
        } catch (e) {
          console.error('Failed to parse saved stalls sync:', e);
        }
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const toggleSave = useCallback((stallId: string) => {
    const currentIds = savedIdsRef.current;
    let newIds: string[];
    
    if (currentIds.includes(stallId)) {
      newIds = currentIds.filter(id => id !== stallId);
    } else {
      newIds = [...currentIds, stallId];
    }
    
    // Update state and localStorage
    setSavedStallIds(newIds);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newIds));
    
    // Explicitly dispatch event for same-window listeners
    window.dispatchEvent(new StorageEvent('storage', {
      key: STORAGE_KEY,
      newValue: JSON.stringify(newIds),
      storageArea: localStorage
    }));
  }, []);

  const isSaved = useCallback((stallId: string) => {
    return savedStallIds.includes(stallId);
  }, [savedStallIds]);

  return { savedStallIds, toggleSave, isSaved, isHydrated };
}
