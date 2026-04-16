'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useTheme } from 'next-themes';
import styles from './Map.module.css';
import ThemeToggle from '@/components/ThemeToggle/ThemeToggle';
import type { Stall } from '@/lib/types';
import { CATEGORIES } from '@/lib/types';
import { DEFAULT_LOCATION, getCurrentPosition, type Coordinates } from '@/lib/geo';

interface MapProps {
  stalls: Stall[];
  selectedStallId: string | null;
  onStallSelect: (stall: Stall) => void;
  onMapMove: (bounds: {
    minLat: number;
    minLng: number;
    maxLat: number;
    maxLng: number;
  }) => void;
  userLocation: Coordinates | null;
  onUserLocationFound: (coords: Coordinates) => void;
  focusView?: {
    center: [number, number];
    zoom: number;
  } | null;
  hideControls?: boolean;
}

// CartoDB Dark Matter — dark mode tiles
const DARK_TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
// CartoDB Voyager — light mode colorful tiles
const LIGHT_TILE_URL = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

export default function MapView({
  stalls,
  selectedStallId,
  onStallSelect,
  onMapMove,
  userLocation,
  onUserLocationFound,
  focusView,
  hideControls
}: MapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const { theme } = useTheme();
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [hoveredStall, setHoveredStall] = useState<Stall | null>(null);
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });
  const [zoomLevel, setZoomLevel] = useState(15);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lng],
      zoom: 15,
      zoomControl: false,
      attributionControl: false,
      minZoom: 10,
      maxZoom: 19,
    });

    const tileUrl = theme === 'light' ? LIGHT_TILE_URL : DARK_TILE_URL;
    const tiles = L.tileLayer(tileUrl, {
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    tileLayerRef.current = tiles;

    map.on('moveend', () => {
      const bounds = map.getBounds();
      onMapMove({
        minLat: bounds.getSouth(),
        minLng: bounds.getWest(),
        maxLat: bounds.getNorth(),
        maxLng: bounds.getEast(),
      });
      setZoomLevel(map.getZoom());
    });

    mapRef.current = map;
    setMapReady(true);

    // Request geolocation
    getCurrentPosition()
      .then((coords) => {
        onUserLocationFound(coords);
        map.flyTo([coords.lat, coords.lng], 16, { duration: 1.5 });
      })
      .catch(() => {
        setTimeout(() => {
          try {
            const bounds = map.getBounds();
            onMapMove({
              minLat: bounds.getSouth(),
              minLng: bounds.getWest(),
              maxLat: bounds.getNorth(),
              maxLng: bounds.getEast(),
            });
          } catch {
            // Map not ready yet
          }
        }, 500);
      });

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update tile layer when theme changes
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;
    
    const tileUrl = theme === 'light' ? LIGHT_TILE_URL : DARK_TILE_URL;
    
    if (tileLayerRef.current) {
      tileLayerRef.current.setUrl(tileUrl);
    }
  }, [theme, mapReady]);

  // Update stall markers
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;

    const map = mapRef.current;
    const currentIds = new Set(stalls.map((s) => s.id));

    // Remove old markers
    markersRef.current.forEach((marker, id) => {
      if (!currentIds.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    });

    // Add or update markers
    stalls.forEach((stall) => {
      const isSelected = stall.id === selectedStallId;
      const isHighRated = stall.avg_rating >= 4.0;
      const existingMarker = markersRef.current.get(stall.id);

      if (existingMarker) {
        const el = existingMarker.getElement();
        if (el) {
          const dot = el.querySelector('div');
          if (dot) {
            let cls = styles.markerPin;
            if (isSelected) cls += ` ${styles['marker-selected']}`;
            if (selectedStallId && !isSelected) cls += ` ${styles['marker-dim']}`;
            dot.className = cls;
          }
        }
        return;
      }

      const isNew = !stall.avg_rating || stall.total_ratings === 0;
      const ratingValue = isNew ? '5.0' : Number(stall.avg_rating).toFixed(1);
      
      let cls = styles.markerPin;
      if (isSelected) cls += ` ${styles['marker-selected']}`;
      if (selectedStallId && !isSelected) cls += ` ${styles['marker-dim']}`;
      if (isNew || stall.avg_rating >= 4.5) cls += ` ${styles['marker-gold']}`;

      const categoryInfo = CATEGORIES.find(c => c.value === stall.category);
      const categoryLabel = categoryInfo?.label || stall.category;

      const icon = L.divIcon({
        className: styles.markerWrapper,
        html: `
          <div class="${cls}">
            <div class="${styles.markerContent}">
              <div class="${styles.markerRating}">
                <span class="${styles.star}">★</span>
                <span>${ratingValue}</span>
              </div>
              <span class="${styles.markerDish}">${categoryLabel}</span>
            </div>
            <div class="${styles.markerPointer}"></div>
          </div>
        `,
        iconSize: [0, 0],
      });

      const marker = L.marker([stall.lat, stall.lng], { icon }).addTo(map);

      marker.on('click', () => onStallSelect(stall));
      marker.on('mouseover', (e: L.LeafletMouseEvent) => {
        setHoveredStall(stall);
        const point = map.latLngToContainerPoint(e.latlng);
        setHoverPos({ x: point.x, y: point.y });
      });
      marker.on('mouseout', () => {
        setHoveredStall(null);
      });

      markersRef.current.set(stall.id, marker);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stalls, selectedStallId, mapReady]);

  // Lock map drag when stall is selected (sheet is open)
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;
    if (selectedStallId) {
      mapRef.current.dragging.disable();
      mapRef.current.scrollWheelZoom.disable();
    } else {
      mapRef.current.dragging.enable();
      mapRef.current.scrollWheelZoom.enable();
    }
  }, [selectedStallId, mapReady]);

  // User location marker
  useEffect(() => {
    if (!mapRef.current || !userLocation || !mapReady) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([userLocation.lat, userLocation.lng]);
      return;
    }

    const icon = L.divIcon({
      className: '',
      html: `<div class="${styles['user-dot']}"><div class="${styles['user-dot-pulse']}"></div></div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });

    userMarkerRef.current = L.marker(
      [userLocation.lat, userLocation.lng],
      { icon, zIndexOffset: 1000 }
    ).addTo(mapRef.current);
  }, [userLocation, mapReady]);

  // Handle external focus view changes
  useEffect(() => {
    if (!mapRef.current || !focusView || !mapReady) return;

    mapRef.current.flyTo(focusView.center, focusView.zoom, {
      duration: 1.5,
      easeLinearity: 0.25
    });
  }, [focusView, mapReady]);

  const handleLocate = useCallback(() => {
    if (!mapRef.current || !userLocation) return;
    mapRef.current.flyTo([userLocation.lat, userLocation.lng], 16, {
      duration: 0.8,
    });
  }, [userLocation]);

  return (
    <div className={`${styles.wrapper} ${zoomLevel < 15 ? styles.zoomedOut : ''}`}>
      <div ref={containerRef} className={styles.map} />
      <div className="map-overlay-gradient" />

      {/* Map controls */}
      {!hideControls && (
        <div className={styles.controls}>
          <button
            className={`${styles['control-btn']} glass`}
            onClick={handleLocate}
            aria-label="Center on my location"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2L19 21L12 17L5 21L12 2Z" />
            </svg>
          </button>
        </div>
      )}

      {/* Hover preview card (desktop only) */}
      {hoveredStall && (
        <div
          className={`${styles.preview} glass`}
          style={{
            left: hoverPos.x + 16,
            top: hoverPos.y - 8,
          }}
        >
          <span className={styles['preview-name']}>{hoveredStall.name}</span>
          <span className={styles['preview-meta']}>
            <span className={styles['preview-rating']}>★ {Number(hoveredStall.avg_rating).toFixed(1)}</span>
            <span className={styles['preview-category']}>
              {hoveredStall.category}
            </span>
          </span>
        </div>
      )}
    </div>
  );
}
