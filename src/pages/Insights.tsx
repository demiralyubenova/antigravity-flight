import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useClothingItems } from '@/hooks/useClothingItems';
import { useWishlist } from '@/hooks/useWishlist';
import { supabase } from '@/integrations/supabase/client';
import { ClothingItem, CATEGORY_LABELS, ClothingCategory } from '@/types/wardrobe';
import { 
  TrendingUp, TrendingDown, DollarSign, Shirt, 
  PieChart, Tag, AlertCircle, Star, Package, ShoppingBag, Plus
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface Outfit {
  id: string;
  item_ids: string[];
  worn_at: string | null;
  is_planned: boolean;
}

interface ItemStats {
  item: ClothingItem;
  wearCount: number;
  costPerWear: number | null;
  lastWorn: Date | null;
}

export default function Insights() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { items: clothingItems } = useClothingItems('all');
  const { addItem: addToWishlist, pendingItems: wishlistItems } = useWishlist();
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [loading, setLoading] = useState(true);

  // Load all outfits
  useEffect(() => {
    if (!user) return;

    const loadOutfits = async () => {
      const { data, error } = await supabase
        .from('outfits')
        .select('id, item_ids, worn_at, is_planned')
        .eq('user_id', user.id)
        .eq('is_planned', false); // Only count worn outfits

      if (error) {
        console.error('Error loading outfits:', error);
        return;
      }
      setOutfits(data || []);
      setLoading(false);
    };

    loadOutfits();
  }, [user]);

  // Calculate wear counts per item
  const itemWearCounts = useMemo(() => {
    const counts: Record<string, { count: number; lastWorn: Date | null }> = {};
    
    clothingItems.forEach(item => {
      counts[item.id] = { count: 0, lastWorn: null };
    });

    outfits.forEach(outfit => {
      if (!outfit.worn_at) return;
      const wornDate = new Date(outfit.worn_at);
      
      outfit.item_ids.forEach(itemId => {
        if (counts[itemId]) {
          counts[itemId].count++;
          if (!counts[itemId].lastWorn || wornDate > counts[itemId].lastWorn) {
            counts[itemId].lastWorn = wornDate;
          }
        }
      });
    });

    return counts;
  }, [clothingItems, outfits]);

  // Item stats with cost-per-wear
  const itemStats: ItemStats[] = useMemo(() => {
    return clothingItems.map(item => {
      const wearData = itemWearCounts[item.id] || { count: 0, lastWorn: null };
      const price = (item as any).price as number | null;
      
      return {
        item,
        wearCount: wearData.count,
        costPerWear: price && wearData.count > 0 ? price / wearData.count : null,
        lastWorn: wearData.lastWorn,
      };
    });
  }, [clothingItems, itemWearCounts]);

  // Most worn items
  const mostWornItems = useMemo(() => {
    return [...itemStats]
      .filter(s => s.wearCount > 0)
      .sort((a, b) => b.wearCount - a.wearCount)
      .slice(0, 5);
  }, [itemStats]);

  // Least worn items (excluding never worn)
  const leastWornItems = useMemo(() => {
    return [...itemStats]
      .filter(s => s.wearCount > 0)
      .sort((a, b) => a.wearCount - b.wearCount)
      .slice(0, 5);
  }, [itemStats]);

  // Unused items (never worn)
  const unusedItems = useMemo(() => {
    return itemStats.filter(s => s.wearCount === 0);
  }, [itemStats]);

  // Best cost-per-wear items
  const bestValueItems = useMemo(() => {
    return [...itemStats]
      .filter(s => s.costPerWear !== null && s.costPerWear > 0)
      .sort((a, b) => (a.costPerWear || 0) - (b.costPerWear || 0))
      .slice(0, 5);
  }, [itemStats]);

  // Total wardrobe value
  const totalWardrobeValue = useMemo(() => {
    return clothingItems.reduce((sum, item) => {
      const price = (item as any).price as number | null;
      return sum + (price || 0);
    }, 0);
  }, [clothingItems]);

  // Items with price set
  const itemsWithPrice = useMemo(() => {
    return clothingItems.filter(item => (item as any).price);
  }, [clothingItems]);

  // Color breakdown
  const colorBreakdown = useMemo(() => {
    const colors: Record<string, number> = {};
    clothingItems.forEach(item => {
      const color = item.color || 'Unknown';
      colors[color] = (colors[color] || 0) + 1;
    });
    return Object.entries(colors)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
  }, [clothingItems]);

  // Brand breakdown
  const brandBreakdown = useMemo(() => {
    const brands: Record<string, number> = {};
    clothingItems.forEach(item => {
      const brand = item.brand || 'Unbranded';
      brands[brand] = (brands[brand] || 0) + 1;
    });
    return Object.entries(brands)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [clothingItems]);

  // Category breakdown
  const categoryBreakdown = useMemo(() => {
    const categories: Record<string, number> = {};
    clothingItems.forEach(item => {
      categories[item.category] = (categories[item.category] || 0) + 1;
    });
    return Object.entries(categories)
      .sort((a, b) => b[1] - a[1]);
  }, [clothingItems]);

  // Total wears
  const totalWears = outfits.length;

  // Average cost per wear across all items
  const avgCostPerWear = useMemo(() => {
    const itemsWithCPW = itemStats.filter(s => s.costPerWear !== null);
    if (itemsWithCPW.length === 0) return null;
    const sum = itemsWithCPW.reduce((acc, s) => acc + (s.costPerWear || 0), 0);
    return sum / itemsWithCPW.length;
  }, [itemStats]);

  // Detect wardrobe gaps based on category balance
  const wardrobeGaps = useMemo(() => {
    const gaps: { category: string; reason: string }[] = [];
    const categoryCount = categoryBreakdown.reduce((acc, [cat, count]) => {
      acc[cat] = count;
      return acc;
    }, {} as Record<string, number>);

    // Check for missing essential categories
    const essentials = ['Tops', 'Bottoms', 'Shoes', 'Outerwear'];
    essentials.forEach(cat => {
      if (!categoryCount[cat] || categoryCount[cat] < 2) {
        gaps.push({ 
          category: cat, 
          reason: categoryCount[cat] ? 'Only 1 item' : 'No items' 
        });
      }
    });

    // Check for color variety issues
    if (colorBreakdown.length < 4 && clothingItems.length > 10) {
      gaps.push({ category: 'Colorful pieces', reason: 'Limited color variety' });
    }

    return gaps;
  }, [categoryBreakdown, colorBreakdown, clothingItems]);

  const addGapToWishlist = async (gap: { category: string; reason: string }) => {
    const existingInWishlist = wishlistItems.some(
      item => item.category === gap.category && item.source === 'gap_detection'
    );

    if (existingInWishlist) {
      toast({ title: 'Already in wishlist', description: `${gap.category} is already on your list` });
      return;
    }

    await addToWishlist.mutateAsync({
      name: `New ${gap.category.toLowerCase()}`,
      category: gap.category === 'Colorful pieces' ? 'Tops' : gap.category,
      description: `Suggested to fill wardrobe gap: ${gap.reason}`,
      target_price: null,
      priority: 'medium',
      source: 'gap_detection',
      image_url: null,
      related_outfit_id: null,
    });
  };

  const getColorStyle = (color: string) => {
    const colorMap: Record<string, string> = {
      'Black': '#1a1a1a',
      'White': '#f5f5f5',
      'Navy': '#1e3a5f',
      'Blue': '#3b82f6',
      'Red': '#ef4444',
      'Green': '#22c55e',
      'Yellow': '#eab308',
      'Pink': '#ec4899',
      'Purple': '#a855f7',
      'Orange': '#f97316',
      'Brown': '#92400e',
      'Gray': '#6b7280',
      'Grey': '#6b7280',
      'Beige': '#d4c4a8',
      'Cream': '#fffdd0',
    };
    return colorMap[color] || '#9ca3af';
  };

  if (loading) {
    return (
      <AppLayout title="Wardrobe Insights" subtitle="Analyzing your style...">
        <div className="flex items-center justify-center py-12">
          <div className="animate-pulse text-muted-foreground">Loading stats...</div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Wardrobe Insights" subtitle="Understand your style habits">
      <div className="space-y-6 pb-24">
        {/* Key Stats Row */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="border-0 shadow-elegant">
            <CardContent className="p-4 text-center">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                <Shirt className="h-5 w-5 text-primary" />
              </div>
              <p className="text-2xl font-bold">{clothingItems.length}</p>
              <p className="text-xs text-muted-foreground">Total Items</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-elegant">
            <CardContent className="p-4 text-center">
              <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
              <p className="text-2xl font-bold">{totalWears}</p>
              <p className="text-xs text-muted-foreground">Total Wears</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-elegant">
            <CardContent className="p-4 text-center">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-2">
                <DollarSign className="h-5 w-5 text-amber-500" />
              </div>
              <p className="text-2xl font-bold">
                {totalWardrobeValue > 0 ? `$${totalWardrobeValue.toLocaleString()}` : '—'}
              </p>
              <p className="text-xs text-muted-foreground">Wardrobe Value</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-elegant">
            <CardContent className="p-4 text-center">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
              </div>
              <p className="text-2xl font-bold">{unusedItems.length}</p>
              <p className="text-xs text-muted-foreground">Never Worn</p>
            </CardContent>
          </Card>
        </div>

        {/* Cost Per Wear Banner */}
        {avgCostPerWear !== null && (
          <Card className="border-0 shadow-elegant bg-gradient-to-r from-primary/5 to-primary/10">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg. Cost Per Wear</p>
                <p className="text-2xl font-bold">${avgCostPerWear.toFixed(2)}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Most Worn Items */}
        {mostWornItems.length > 0 && (
          <Card className="border-0 shadow-elegant">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Star className="h-4 w-4 text-amber-500" />
                <h3 className="font-display font-semibold">Most Worn</h3>
              </div>
              <div className="space-y-3">
                {mostWornItems.map((stat, index) => (
                  <div key={stat.item.id} className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                      {index + 1}
                    </span>
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted">
                      <img 
                        src={stat.item.image_url} 
                        alt={stat.item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{stat.item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {stat.costPerWear !== null && `$${stat.costPerWear.toFixed(2)}/wear`}
                      </p>
                    </div>
                    <span className="text-sm font-bold">{stat.wearCount}×</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Best Value Items */}
        {bestValueItems.length > 0 && (
          <Card className="border-0 shadow-elegant">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <TrendingDown className="h-4 w-4 text-green-500" />
                <h3 className="font-display font-semibold">Best Value (Lowest Cost/Wear)</h3>
              </div>
              <div className="space-y-3">
                {bestValueItems.map((stat) => (
                  <div key={stat.item.id} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted">
                      <img 
                        src={stat.item.image_url} 
                        alt={stat.item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{stat.item.name}</p>
                      <p className="text-xs text-muted-foreground">{stat.wearCount} wears</p>
                    </div>
                    <span className="text-sm font-bold text-green-600">
                      ${stat.costPerWear?.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Unused Items Warning */}
        {unusedItems.length > 0 && (
          <Card className="border-0 shadow-elegant bg-red-500/5">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <h3 className="font-display font-semibold">Never Worn</h3>
                <span className="text-xs text-muted-foreground ml-auto">
                  {unusedItems.length} items
                </span>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {unusedItems.slice(0, 8).map((stat) => (
                  <div key={stat.item.id} className="flex-shrink-0">
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-muted border-2 border-red-500/20">
                      <img 
                        src={stat.item.image_url} 
                        alt={stat.item.name}
                        className="w-full h-full object-cover opacity-75"
                      />
                    </div>
                    <p className="text-xs text-center mt-1 truncate w-16 text-muted-foreground">
                      {stat.item.name}
                    </p>
                  </div>
                ))}
                {unusedItems.length > 8 && (
                  <div className="flex-shrink-0 w-16 h-16 rounded-xl bg-muted flex items-center justify-center">
                    <span className="text-sm font-medium text-muted-foreground">
                      +{unusedItems.length - 8}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Wardrobe Gaps - Shopping Suggestions */}
        {wardrobeGaps.length > 0 && (
          <Card className="border-0 shadow-elegant bg-primary/5">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4 text-primary" />
                  <h3 className="font-display font-semibold">Wardrobe Gaps</h3>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => navigate('/wishlist')}
                  className="text-xs"
                >
                  View Wishlist
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Items that could complete your wardrobe
              </p>
              <div className="space-y-2">
                {wardrobeGaps.map((gap, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between p-3 rounded-xl bg-background border border-border"
                  >
                    <div>
                      <p className="font-medium text-sm">{gap.category}</p>
                      <p className="text-xs text-muted-foreground">{gap.reason}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => addGapToWishlist(gap)}
                      className="gap-1"
                    >
                      <Plus className="h-3 w-3" />
                      Add
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Category Breakdown */}
        <Card className="border-0 shadow-elegant">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Package className="h-4 w-4 text-primary" />
              <h3 className="font-display font-semibold">By Category</h3>
            </div>
            <div className="space-y-3">
              {categoryBreakdown.map(([category, count]) => (
                <div key={category}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{CATEGORY_LABELS[category as ClothingCategory] || category}</span>
                    <span className="text-muted-foreground">{count}</span>
                  </div>
                  <Progress 
                    value={(count / clothingItems.length) * 100} 
                    className="h-2"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Color Breakdown */}
        {colorBreakdown.length > 0 && (
          <Card className="border-0 shadow-elegant">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <PieChart className="h-4 w-4 text-primary" />
                <h3 className="font-display font-semibold">Color Palette</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {colorBreakdown.map(([color, count]) => (
                  <div 
                    key={color}
                    className="flex items-center gap-2 px-3 py-2 rounded-full bg-secondary/50"
                  >
                    <div 
                      className="w-4 h-4 rounded-full border border-border"
                      style={{ backgroundColor: getColorStyle(color) }}
                    />
                    <span className="text-sm">{color}</span>
                    <span className="text-xs text-muted-foreground">({count})</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Brand Breakdown */}
        {brandBreakdown.length > 0 && brandBreakdown[0][0] !== 'Unbranded' && (
          <Card className="border-0 shadow-elegant">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Tag className="h-4 w-4 text-primary" />
                <h3 className="font-display font-semibold">Top Brands</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {brandBreakdown.filter(([brand]) => brand !== 'Unbranded').map(([brand, count]) => (
                  <div 
                    key={brand}
                    className="px-3 py-1.5 rounded-lg bg-secondary/50 text-sm"
                  >
                    <span className="font-medium">{brand}</span>
                    <span className="text-muted-foreground ml-1">({count})</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Add Price CTA */}
        {itemsWithPrice.length < clothingItems.length && clothingItems.length > 0 && (
          <Card className="border-0 shadow-sm bg-muted/30">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-muted-foreground">
                💡 Add prices to your items in the Wardrobe to unlock cost-per-wear insights
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {itemsWithPrice.length} of {clothingItems.length} items have prices
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
