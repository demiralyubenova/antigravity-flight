/**
 * Application-wide constants
 */

export const OCCASION_SUGGESTIONS = [
  'Business Meeting',
  'Date Night',
  'Casual Weekend',
  'Wedding Guest',
  'Job Interview',
  'Beach Day',
  'Gym Session',
  'Night Out',
];

export const WISHLIST_CATEGORIES = [
  'Tops', 'Bottoms', 'Dresses', 'Outerwear', 'Shoes', 'Accessories', 'Bags', 'Other',
];

export const PRIORITY_OPTIONS: { value: 'low' | 'medium' | 'high'; label: string }[] = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

export const COLOR_MAP: Record<string, string> = {
  Black: '#1a1a1a',
  White: '#f5f5f5',
  Navy: '#1e3a5f',
  Blue: '#3b82f6',
  Red: '#ef4444',
  Green: '#22c55e',
  Yellow: '#eab308',
  Pink: '#ec4899',
  Purple: '#a855f7',
  Orange: '#f97316',
  Brown: '#92400e',
  Gray: '#6b7280',
  Grey: '#6b7280',
  Beige: '#d4c4a8',
  Cream: '#fffdd0',
};

export const QUICK_PROMPTS = [
  'Suggest a new outfit',
  'What should I wear today?',
  'Office appropriate looks',
  'Date night ideas',
];
