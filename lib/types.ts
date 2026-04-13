export interface Profile {
  id: string;
  username: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface Stall {
  id: string;
  name: string;
  category: string;
  photo_url: string | null;
  avg_rating: number;
  total_ratings: number;
  created_by: string | null;
  created_at: string;
  lat: number;
  lng: number;
  distance_meters?: number;
  district_name?: string;
  upazila_id?: string;
  union_id?: string;
  area_id?: string;
}

export interface Post {
  id: string;
  user_id: string;
  stall_id: string;
  photo_url: string | null;
  caption: string | null;
  rating: number | null;
  likes_count: number;
  created_at: string;
  profiles?: Profile;
  stalls?: Stall;
}

export interface Rating {
  id: string;
  stall_id: string;
  user_id: string;
  rating: number;
  note: string | null;
  created_at: string;
  profiles?: Profile;
}

export interface Like {
  id: string;
  post_id: string;
  user_id: string;
  created_at: string;
}

export type Category = 'fuchka' | 'chotpoti' | 'tea' | 'grill' | 'snacks';

export const CATEGORIES: { value: Category; label: string; icon: string }[] = [
  { value: 'fuchka', label: 'Fuchka', icon: '/icons/fuchka.png' },
  { value: 'chotpoti', label: 'Chotpoti', icon: '/icons/chotpoti.png' },
  { value: 'tea', label: 'Tea', icon: '/icons/tea.png' },
  { value: 'grill', label: 'Grill', icon: '/icons/grill.png' },
  { value: 'snacks', label: 'Snacks', icon: '/icons/snacks.png' },
];
