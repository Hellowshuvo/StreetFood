'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Image from 'next/image';
import styles from './AddModal.module.css';
import RatingStars from '@/components/RatingStars/RatingStars';
import { CATEGORIES, type Category } from '@/lib/types';
import type { Coordinates } from '@/lib/geo';
import { DEFAULT_LOCATION } from '@/lib/geo';
import { supabase } from '@/lib/supabase';
import imageCompression from 'browser-image-compression';

interface AddModalProps {
  onClose: () => void;
  userId: string;
  userLocation: Coordinates | null;
  onSuccess: () => void;
}

type Step = 1 | 2 | 3;

export default function AddModal({
  onClose,
  userId,
  userLocation,
  onSuccess,
}: AddModalProps) {
  const [step, setStep] = useState<Step>(1);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [location, setLocation] = useState<Coordinates>(
    userLocation || DEFAULT_LOCATION
  );
  const [name, setName] = useState('');
  const [category, setCategory] = useState<Category>('snacks');
  const [rating, setRating] = useState(0);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const miniMapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  // Handle photo selection
  const handlePhotoSelect = useCallback(
    async (file: File) => {
      try {
        const compressed = await imageCompression(file, {
          maxSizeMB: 0.5,
          maxWidthOrHeight: 1200,
          useWebWorker: true,
        });
        setPhoto(compressed);
        setPhotoPreview(URL.createObjectURL(compressed));
      } catch {
        setPhoto(file);
        setPhotoPreview(URL.createObjectURL(file));
      }
    },
    []
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handlePhotoSelect(file);
    },
    [handlePhotoSelect]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files?.[0];
      if (file && file.type.startsWith('image/')) {
        handlePhotoSelect(file);
      }
    },
    [handlePhotoSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  // Initialize mini map for step 2
  useEffect(() => {
    if (step !== 2 || !miniMapRef.current || mapInstanceRef.current) return;

    // Dynamic import for leaflet
    import('leaflet').then((L) => {
      if (!miniMapRef.current) return;

      const map = L.map(miniMapRef.current, {
        center: [location.lat, location.lng],
        zoom: 16,
        zoomControl: true,
        attributionControl: false,
      });

      L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        { subdomains: 'abcd', maxZoom: 19 }
      ).addTo(map);

      const marker = L.marker([location.lat, location.lng], {
        draggable: true,
      }).addTo(map);

      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        setLocation({ lat: pos.lat, lng: pos.lng });
      });

      map.on('click', (e: L.LeafletMouseEvent) => {
        marker.setLatLng(e.latlng);
        setLocation({ lat: e.latlng.lat, lng: e.latlng.lng });
      });

      mapInstanceRef.current = map;
      markerRef.current = marker;
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
    };
  }, [step, location.lat, location.lng]);

  // Submit
  const handleSubmit = useCallback(async () => {
    if (!name.trim()) {
      setError('Please enter a stall name');
      return;
    }
    if (rating === 0) {
      setError('Please select a rating');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      let photoUrl: string | null = null;

      // Upload photo
      if (photo) {
        const ext = photo.name.split('.').pop() || 'jpg';
        const filePath = `stalls/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('photos')
          .upload(filePath, photo, { contentType: photo.type });

        if (uploadError) throw uploadError;

        const {
          data: { publicUrl },
        } = supabase.storage.from('photos').getPublicUrl(filePath);
        photoUrl = publicUrl;
      }

      // Create stall
      const { data: stallData, error: stallError } = await supabase
        .from('stalls')
        .insert({
          name: name.trim(),
          category,
          location: `POINT(${location.lng} ${location.lat})`,
          created_by: userId,
          photo_url: photoUrl,
        })
        .select()
        .single();

      if (stallError) throw stallError;

      // Create rating
      await supabase.from('ratings').insert({
        stall_id: stallData.id,
        user_id: userId,
        rating,
        note: note.trim() || null,
      });

      // Create post
      await supabase.from('posts').insert({
        stall_id: stallData.id,
        user_id: userId,
        photo_url: photoUrl,
        caption: note.trim() || `Added ${name.trim()}`,
        rating,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to add stall:', err);
      setError(err.message || 'Failed to add stall');
    }

    setSubmitting(false);
  }, [name, category, location, rating, note, photo, userId, onSuccess, onClose]);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>Add a Stall</h2>
          <button className={styles.closeBtn} onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Step indicator */}
        <div className={styles.steps}>
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`${styles.step} ${s === step ? styles.stepActive : ''} ${
                s < step ? styles.stepDone : ''
              }`}
            >
              {s}
            </div>
          ))}
        </div>

        {/* Step 1: Photo */}
        {step === 1 && (
          <div className={styles.body}>
            <h3 className={styles.stepTitle}>Upload a Photo</h3>
            <div
              className={styles.dropzone}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
            >
              {photoPreview ? (
                <img src={photoPreview} alt="Preview" className={styles.preview} />
              ) : (
                <div className={styles.dropzoneContent}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                  <span>Click or drag to upload</span>
                  <span className={styles.dropzoneHint}>JPG, PNG up to 5MB</span>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                hidden
              />
            </div>
            <div className={styles.footer}>
              <button
                className="btn btn-primary"
                onClick={() => setStep(2)}
              >
                {photo ? 'Next' : 'Skip Photo'}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Location */}
        {step === 2 && (
          <div className={styles.body}>
            <h3 className={styles.stepTitle}>Pick Location</h3>
            <p className={styles.stepDesc}>
              Click the map or drag the marker to set the stall location.
            </p>
            <div ref={miniMapRef} className={styles.miniMap} />
            <div className={styles.coords}>
              <span className="mono">
                {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
              </span>
            </div>
            <div className={styles.footer}>
              <button className="btn btn-ghost" onClick={() => setStep(1)}>
                Back
              </button>
              <button className="btn btn-primary" onClick={() => setStep(3)}>
                Next
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Details */}
        {step === 3 && (
          <div className={styles.body}>
            <h3 className={styles.stepTitle}>Stall Details</h3>

            <div className={styles.field}>
              <label className={styles.label}>Name *</label>
              <input
                className="input-field"
                placeholder="e.g. Rahim's Fuchka Corner"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Category</label>
              <div className={styles.categoryGrid}>
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    className={`${styles.catBtn} ${
                      category === cat.value ? styles.catActive : ''
                    }`}
                    onClick={(e) => {
                      e.preventDefault();
                      setCategory(cat.value);
                    }}
                  >
                    <span className={styles.iconWrapper}>
                      <Image src={cat.icon} alt={cat.label} width={20} height={20} className={styles.categoryIcon} unoptimized />
                    </span>
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Your Rating *</label>
              <RatingStars
                rating={rating}
                interactive
                size="lg"
                onChange={setRating}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Note (optional)</label>
              <textarea
                className={`input-field ${styles.textarea}`}
                placeholder="What makes this stall special?"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
              />
            </div>

            {error && <p className={styles.error}>{error}</p>}

            <div className={styles.footer}>
              <button className="btn btn-ghost" onClick={() => setStep(2)}>
                Back
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? 'Adding...' : 'Add Stall'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
