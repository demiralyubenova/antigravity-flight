export type ClothingCategory = 'tops' | 'bottoms' | 'outerwear' | 'shoes' | 'accessories' | 'dresses';

export interface ClothingItem {
  id: string;
  user_id: string;
  name: string;
  category: ClothingCategory;
  image_url: string;
  color?: string;
  brand?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

export interface Outfit {
  id: string;
  user_id: string;
  name: string;
  occasion?: string;
  item_ids: string[];
  notes?: string;
  worn_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  user_id: string;
  display_name?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export const CATEGORY_LABELS: Record<ClothingCategory, string> = {
  tops: 'Tops',
  bottoms: 'Bottoms',
  outerwear: 'Outerwear',
  shoes: 'Shoes',
  accessories: 'Accessories',
  dresses: 'Dresses',
};

export const ALL_CATEGORIES: ClothingCategory[] = [
  'tops',
  'bottoms',
  'outerwear',
  'shoes',
  'accessories',
  'dresses',
];