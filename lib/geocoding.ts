import { supabase } from './supabase';

export interface GeoLocation {
  lat: number;
  lng: number;
  zoom: number;
}

const ZOOM_LEVELS: Record<string, number> = {
  division: 8,
  district: 10,
  upazila: 12,
  union: 14
};

/**
 * Resolves the coordinates and zoom level for a given location hierarchy.
 * Priority: 
 * 1. Local Database Lookup (Instant)
 * 2. Nominatim API Fallback
 */
export async function resolveLocationCoordinates(params: {
  division?: string;
  district?: string;
  upazilaName?: string;
  unionName?: string;
  areaName?: string;
  upazilaId?: string;
  unionId?: string;
  areaId?: string;
}): Promise<GeoLocation | null> {
  const { division, district, upazilaName, unionName, areaName, upazilaId, unionId, areaId } = params;

  // 1. Determine the deepest level specified
  let level = '';
  let localId = '';
  let localTable = '';

  if (areaId) {
    level = 'area';
    localId = areaId;
    localTable = 'areas';
  } else if (unionId) {
    level = 'union';
    localId = unionId;
    localTable = 'unions';
  } else if (upazilaId) {
    level = 'upazila';
    localId = upazilaId;
    localTable = 'upazilas';
  } else if (district) {
    level = 'district';
  } else if (division) {
    level = 'division';
  } else {
    return null;
  }

  // 2. Try Local Database Lookup for coordinates (if a table is associated)
  if (localId && localTable) {
    const { data, error } = await supabase
      .from(localTable)
      .select('latitude, longitude')
      .eq('id', localId)
      .single();

    if (!error && data?.latitude && data?.longitude) {
      return {
        lat: Number(data.latitude),
        lng: Number(data.longitude),
        zoom: ZOOM_LEVELS[level]
      };
    }
  }

  // 3. Fallback: Predefined District/Division center points (Simplified Bangladesh Geo)
  // For production, you could add lat/long to a static list if DB is empty
  
  // 4. Fallback: Nominatim Geocoding
  const queryParts = [];
  if (areaName) queryParts.push(areaName);
  if (unionName) queryParts.push(unionName);
  if (upazilaName) queryParts.push(upazilaName);
  if (district) queryParts.push(district);
  if (division) queryParts.push(division);
  queryParts.push('Bangladesh');

  const query = queryParts.join(', ');
  
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
      {
        headers: {
          'User-Agent': 'StreetFoodApp/1.0' // Requirement for Nominatim
        }
      }
    );
    const results = await response.json();

    if (results && results.length > 0) {
      const result = results[0];
      const resolved = {
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon),
        zoom: ZOOM_LEVELS[level]
      };

      // Optional: Update DB with resolved coordinates for next time (Background)
      if (localId && localTable) {
        supabase.from(localTable)
          .update({ latitude: resolved.lat, longitude: resolved.lng })
          .eq('id', localId)
          .then();
      }

      return resolved;
    }
  } catch (err) {
    console.error('Geocoding error:', err);
  }

  return null;
}
