'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Image from 'next/image';
import styles from './AddModal.module.css';
import RatingStars from '@/components/RatingStars/RatingStars';
import { CATEGORIES, type Category } from '@/lib/types';
import { DEFAULT_LOCATION, getCurrentPosition, type Coordinates } from '@/lib/geo';
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
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
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
    async (newFiles: FileList | File[]) => {
      const remainingSlots = 3 - photos.length;
      if (remainingSlots <= 0) {
        setError('Maximum 3 images allowed');
        return;
      }

      const filesToAdd = Array.from(newFiles).slice(0, remainingSlots);
      const newPhotos = [...photos];
      const newPreviews = [...photoPreviews];

      for (const file of filesToAdd) {
        try {
          const compressed = await imageCompression(file, {
            maxSizeMB: 0.5,
            maxWidthOrHeight: 1200,
            useWebWorker: true,
          });
          newPhotos.push(compressed);
          newPreviews.push(URL.createObjectURL(compressed));
        } catch {
          newPhotos.push(file);
          newPreviews.push(URL.createObjectURL(file));
        }
      }

      setPhotos(newPhotos);
      setPhotoPreviews(newPreviews);
      setError(null);
    },
    [photos, photoPreviews]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) handlePhotoSelect(e.target.files);
    },
    [handlePhotoSelect]
  );


  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
    setPhotoPreviews(photoPreviews.filter((_, i) => i !== index));
  };

  // Handle "Use My Location"
  const handleUseMyLocation = useCallback(async () => {
    try {
      const coords = await getCurrentPosition();
      setLocation(coords);
      if (mapInstanceRef.current && markerRef.current) {
        mapInstanceRef.current.flyTo([coords.lat, coords.lng], 17);
        markerRef.current.setLatLng([coords.lat, coords.lng]);
      }
    } catch {
      setError('Could not get your location');
    }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

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
      const photoUrls: string[] = [];

      // Upload photos
      for (const photo of photos) {
        const ext = photo.name.split('.').pop() || 'jpg';
        const filePath = `posts/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('photos')
          .upload(filePath, photo, { contentType: photo.type });

        if (uploadError) throw uploadError;

        const {
          data: { publicUrl },
        } = supabase.storage.from('photos').getPublicUrl(filePath);
        photoUrls.push(publicUrl);
      }
      
      const primaryPhotoUrl = photoUrls[0] || null;

      // Create stall
      const { data: stallData, error: stallError } = await supabase
        .from('stalls')
        .insert({
          name: name.trim(),
          category,
          lat: location.lat,
          long: location.lng,
          created_by: userId,
          photo_url: primaryPhotoUrl,
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
      await supabase.from('posts')
        .insert({
          stall_id: stallData.id,
          user_id: userId,
          photo_url: primaryPhotoUrl,
          caption: note.trim() || `Added ${name.trim()}`,
          rating,
          // Support multiple photos in the future if we add a column, 
          // but for now let's just use the first/main photo for the post
        });

      onSuccess();
      onClose();
    } catch (err: unknown) {
      console.error('Failed to add stall:', err);
      if (err instanceof Error) {
        setError(err.message || 'Failed to add stall');
      } else {
        setError('Failed to add stall');
      }
    }

    setSubmitting(false);
  }, [name, category, location, rating, note, photos, userId, onSuccess, onClose]);

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
            <h3 className={styles.stepTitle}>Upload Photos (Max 3)</h3>
            
            <div className={styles.photoGrid}>
              {photoPreviews.map((url, i) => (
                <div key={url} className={styles.previewItem}>
                  <img src={url} alt="Preview" className={styles.preview} />
                  <button className={styles.removePhoto} onClick={() => removePhoto(i)}>×</button>
                </div>
              ))}
              
              {photos.length < 3 && (
                <div
                  className={styles.dropzone}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className={styles.dropzoneContent}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                    <span>Add Photo</span>
                  </div>
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
              hidden
            />

            {error && <p className={styles.error}>{error}</p>}
            
            <div className={styles.footer}>
              <button
                className="btn btn-primary"
                onClick={() => setStep(2)}
                disabled={photos.length === 0}
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Location */}
        {step === 2 && (
          <div className={styles.body}>
            <div className={styles.stepHeaderRow}>
              <h3 className={styles.stepTitle}>Pick Location</h3>
              <button 
                className={`${styles.locateBtn} glass`}
                onClick={handleUseMyLocation}
              >
                📍 Use My Location
              </button>
            </div>
            <p className={styles.stepDesc}>
              Click the map or drag the marker to set the stall location.
            </p>
            <div ref={miniMapRef} className={styles.miniMap} />
            <div className={styles.coords}>
              <span className="mono">
                {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
              </span>
            </div>
            {error && <p className={styles.error}>{error}</p>}
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
