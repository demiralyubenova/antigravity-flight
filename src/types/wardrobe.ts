export type ClothingCategory = 'tops' | 'bottoms' | 'outerwear' | 'shoes' | 'accessories' | 'dresses';

export type ClothingSubcategory =
  // Tops
  | 't-shirt' | 'shirt' | 'blouse' | 'hoodie' | 'sweater' | 'tank'
  // Bottoms
  | 'jeans' | 'trousers' | 'skirt' | 'shorts' | 'leggings'
  // Shoes
  | 'sneakers' | 'boots' | 'heels' | 'flats' | 'sandals'
  // Outerwear
  | 'jacket' | 'coat' | 'blazer' | 'trench'
  // Accessories
  | 'bag' | 'belt' | 'hat' | 'jewelry' | 'scarf'
  // Dresses
  | 'mini' | 'midi' | 'maxi' | 'cocktail';

export const SUBCATEGORY_OPTIONS: Record<ClothingCategory, { value: ClothingSubcategory; label: string }[]> = {
  tops: [
    { value: 't-shirt', label: 'T-Shirt' },
    { value: 'shirt', label: 'Shirt' },
    { value: 'blouse', label: 'Blouse' },
    { value: 'hoodie', label: 'Hoodie' },
    { value: 'sweater', label: 'Sweater/Knit' },
    { value: 'tank', label: 'Tank/Top' },
  ],
  bottoms: [
    { value: 'jeans', label: 'Jeans' },
    { value: 'trousers', label: 'Trousers' },
    { value: 'skirt', label: 'Skirt' },
    { value: 'shorts', label: 'Shorts' },
    { value: 'leggings', label: 'Leggings' },
  ],
  shoes: [
    { value: 'sneakers', label: 'Sneakers' },
    { value: 'boots', label: 'Boots' },
    { value: 'heels', label: 'Heels' },
    { value: 'flats', label: 'Flats' },
    { value: 'sandals', label: 'Sandals' },
  ],
  outerwear: [
    { value: 'jacket', label: 'Jacket' },
    { value: 'coat', label: 'Coat' },
    { value: 'blazer', label: 'Blazer' },
    { value: 'trench', label: 'Trench' },
  ],
  accessories: [
    { value: 'bag', label: 'Bag' },
    { value: 'belt', label: 'Belt' },
    { value: 'hat', label: 'Hat' },
    { value: 'jewelry', label: 'Jewelry' },
    { value: 'scarf', label: 'Scarf' },
  ],
  dresses: [
    { value: 'mini', label: 'Mini' },
    { value: 'midi', label: 'Midi' },
    { value: 'maxi', label: 'Maxi' },
    { value: 'cocktail', label: 'Cocktail' },
  ],
};

export interface ClothingItem {
  id: string;
  user_id: string;
  name: string;
  category: ClothingCategory;
  subcategory?: ClothingSubcategory;
  image_url: string;
  color?: string;
  brand?: string;
  tags?: string[];
  ai_description?: string;
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