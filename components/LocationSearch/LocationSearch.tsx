'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import styles from './LocationSearch.module.css';

// Manual data as requested
const DIVISIONS = [
  'Barisal', 'Chattogram', 'Dhaka', 'Khulna', 'Mymensingh', 'Rajshahi', 'Rangpur', 'Sylhet'
];

const DISTRICTS_BY_DIVISION: Record<string, string[]> = {
  'Dhaka': ['Dhaka District', 'Faridpur District', 'Gazipur District', 'Gopalganj District', 'Kishoreganj District', 'Madaripur District', 'Manikganj District', 'Munshiganj District', 'Narayanganj District', 'Narsingdi District', 'Rajbari District', 'Shariatpur District', 'Tangail District'],
  'Khulna': ['Bagerhat District', 'Chuadanga District', 'Jashore District', 'Jhenaidah District', 'Khulna District', 'Kushtia District', 'Magura District', 'Meherpur District', 'Narail District', 'Satkhira District'],
  'Chattogram': ['Bandarban District', 'Brahmanbaria District', 'Chandpur District', 'Chattogram District', 'Cumilla District', "Cox's Bazar District", 'Feni District', 'Khagrachhari District', 'Lakshmipur District', 'Noakhali District', 'Rangamati District'],
  'Rajshahi': ['Bogura District', 'Joypurhat District', 'Naogaon District', 'Natore District', 'Chapainawabganj District', 'Pabna District', 'Rajshahi District', 'Sirajganj District'],
  'Sylhet': ['Habiganj District', 'Moulvibazar District', 'Sunamganj District', 'Sylhet District'],
  'Rangpur': ['Dinajpur District', 'Gaibandha District', 'Kurigram District', 'Lalmonirhat District', 'Nilphamari District', 'Panchagarh District', 'Rangpur District', 'Thakurgaon District'],
  'Mymensingh': ['Jamalpur District', 'Mymensingh District', 'Netrakona District', 'Sherpur District'],
  'Barisal': ['Jhalokati District', 'Barguna District', 'Barisal District', 'Bhola District', 'Patuakhali District', 'Pirojpur District']
};

interface LocationSearchProps {
  onLocationChange: (location: {
    division?: string;
    district?: string;
    upazilaId?: string;
    unionId?: string;
    areaId?: string;
    upazilaName?: string;
    unionName?: string;
    areaName?: string;
  }) => void;
}

export default function LocationSearch({ onLocationChange }: LocationSearchProps) {
  const [division, setDivision] = useState('');
  const [district, setDistrict] = useState('');
  
  const [upazilaId, setUpazilaId] = useState('');
  const [unionId, setUnionId] = useState('');

  const [upazilas, setUpazilas] = useState<any[]>([]);
  const [unions, setUnions] = useState<any[]>([]);

  const [loading, setLoading] = useState(false);

  // Fetch Upazilas when District changes
  useEffect(() => {
    if (!district) {
      setUpazilas([]);
      setUpazilaId('');
      return;
    }

    const fetchUpazilas = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('upazilas')
        .select('id, name')
        .eq('district_name', district)
        .order('name');
      
      if (!error && data) setUpazilas(data);
      setLoading(false);
    };

    fetchUpazilas();
  }, [district]);

  // Fetch Unions when Upazila changes
  useEffect(() => {
    if (!upazilaId) {
      setUnions([]);
      setUnionId('');
      return;
    }

    const fetchUnions = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('unions')
        .select('id, name')
        .eq('upazila_id', upazilaId)
        .order('name');
      
      if (!error && data) setUnions(data);
      setLoading(false);
    };

    fetchUnions();
  }, [upazilaId]);

  const handleConfirm = () => {
    const selectedUpazila = upazilas.find(u => u.id === upazilaId)?.name;
    const selectedUnion = unions.find(u => u.id === unionId)?.name;

    onLocationChange({
      division: division || undefined,
      district: district || undefined,
      upazilaId: upazilaId || undefined,
      unionId: unionId || undefined,
      upazilaName: selectedUpazila,
      unionName: selectedUnion,
    });
  };

  const handleClear = () => {
    setDivision('');
    setDistrict('');
    setUpazilaId('');
    setUnionId('');
  };

  const currentSelectionSummary = () => {
    if (!division) return null;
    const parts = [division];
    if (district) parts.push(district.replace(' District', ''));
    if (upazilaId) {
      const u = upazilas.find(u => u.id === upazilaId)?.name;
      if (u) parts.push(u);
    }
    if (unionId) {
      const un = unions.find(u => u.id === unionId)?.name;
      if (un) parts.push(un);
    }
    return parts.join(' > ');
  };

  return (
    <div className={styles.modalContent}>
      {division && (
        <div className={styles.summary}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <span className={styles.summaryText}>{currentSelectionSummary()}</span>
        </div>
      )}

      {/* Division */}
      <div className={styles.group}>
        <label className={styles.label}>Division</label>
        <select 
          className={styles.select}
          value={division}
          onChange={(e) => {
            setDivision(e.target.value);
            setDistrict('');
          }}
        >
          <option value="">Select Division</option>
          {DIVISIONS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      {/* District */}
      <div className={styles.group}>
        <label className={styles.label}>District</label>
        <select 
          className={styles.select}
          value={district}
          onChange={(e) => setDistrict(e.target.value)}
          disabled={!division}
        >
          <option value="">Select District</option>
          {division && DISTRICTS_BY_DIVISION[division]?.map(d => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>

      {/* Upazila */}
      <div className={styles.group}>
        <label className={styles.label}>Upazila / Thana</label>
        <select 
          className={styles.select}
          value={upazilaId}
          onChange={(e) => setUpazilaId(e.target.value)}
          disabled={!district || loading}
        >
          <option value="">Select Upazila</option>
          {upazilas.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
      </div>

      {/* Union */}
      <div className={styles.group}>
        <label className={styles.label}>Union / Ward</label>
        <select 
          className={styles.select}
          value={unionId}
          onChange={(e) => setUnionId(e.target.value)}
          disabled={!upazilaId || loading}
        >
          <option value="">Select Union</option>
          {unions.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
      </div>

      {loading && (
        <div className={styles.loading}>
          <div className={styles.loadingIcon} />
          <span>Updating...</span>
        </div>
      )}

      <div className={styles.actions}>
        {(division || district || upazilaId || unionId) && (
          <button className={styles.clearBtn} onClick={handleClear}>
            Reset
          </button>
        )}
        <button 
          className={`${styles.confirmBtn} ${!division ? styles.disabled : ''}`} 
          onClick={handleConfirm}
          disabled={!division}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" width="20" height="20">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Confirm
        </button>
      </div>
    </div>
  );
}
