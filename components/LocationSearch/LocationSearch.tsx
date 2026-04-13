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
  const [areaId, setAreaId] = useState('');

  const [upazilas, setUpazilas] = useState<any[]>([]);
  const [unions, setUnions] = useState<any[]>([]);
  const [areas, setAreas] = useState<any[]>([]);

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

  // Fetch Areas when Union changes
  useEffect(() => {
    if (!unionId) {
      setAreas([]);
      setAreaId('');
      return;
    }

    const fetchAreas = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('areas')
        .select('id, name')
        .eq('union_id', unionId)
        .order('name');
      
      if (!error && data) setAreas(data);
      setLoading(false);
    };

    fetchAreas();
  }, [unionId]);

  // Notify parent
  useEffect(() => {
    const selectedUpazila = upazilas.find(u => u.id === upazilaId)?.name;
    const selectedUnion = unions.find(u => u.id === unionId)?.name;
    const selectedArea = areas.find(a => a.id === areaId)?.name;

    onLocationChange({
      division: division || undefined,
      district: district || undefined,
      upazilaId: upazilaId || undefined,
      unionId: unionId || undefined,
      areaId: areaId || undefined,
      upazilaName: selectedUpazila,
      unionName: selectedUnion,
      areaName: selectedArea
    });
  }, [division, district, upazilaId, unionId, areaId, upazilas, unions, areas]);

  const handleClear = () => {
    setDivision('');
    setDistrict('');
    setUpazilaId('');
    setUnionId('');
    setAreaId('');
  };

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Filter by Location</h3>
      
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

      {/* Area */}
      <div className={styles.group}>
        <label className={styles.label}>Village / Mahalla</label>
        <select 
          className={styles.select}
          value={areaId}
          onChange={(e) => setAreaId(e.target.value)}
          disabled={!unionId || loading}
        >
          <option value="">Select Area</option>
          {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </div>

      {loading && (
        <div className={styles.loading}>
          <div className={styles.loadingIcon} />
          <span>Updating...</span>
        </div>
      )}

      {(division || district || upazilaId || unionId || areaId) && (
        <button className={styles.clearBtn} onClick={handleClear}>
          Clear Location Filter
        </button>
      )}
    </div>
  );
}
