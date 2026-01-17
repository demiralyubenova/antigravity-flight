import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Plus, 
  ShoppingBag, 
  Trash2, 
  Check, 
  Search, 
  Loader2,
  DollarSign,
  Tag,
  Sparkles,
  ExternalLink,
  Heart
} from 'lucide-react';
import { useWishlist, WishlistItem } from '@/hooks/useWishlist';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const categories = [
  'Tops', 'Bottoms', 'Dresses', 'Outerwear', 'Shoes', 'Accessories', 'Bags', 'Other'
];

export default function Wishlist() {
  const { pendingItems, purchasedItems, isLoading, addItem, deleteItem, markPurchased } = useWishlist();
  const { toast } = useToast();
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newItem, setNewItem] = useState({
    name: '',
    category: 'Tops',
    description: '',
    target_price: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
  });
  
  const [selectedItem, setSelectedItem] = useState<WishlistItem | null>(null);
  const [shoppingLoading, setShoppingLoading] = useState(false);
  const [shoppingSuggestions, setShoppingSuggestions] = useState('');

  const handleAddItem = async () => {
    if (!newItem.name) {
      toast({ title: 'Please enter an item name', variant: 'destructive' });
      return;
    }

    await addItem.mutateAsync({
      name: newItem.name,
      category: newItem.category,
      description: newItem.description || null,
      target_price: newItem.target_price ? parseFloat(newItem.target_price) : null,
      priority: newItem.priority,
      source: 'manual',
      image_url: null,
      related_outfit_id: null,
    });

    setNewItem({ name: '', category: 'Tops', description: '', target_price: '', priority: 'medium' });
    setIsAddOpen(false);
  };

  const handleFindShopping = async (item: WishlistItem) => {
    setSelectedItem(item);
    setShoppingLoading(true);
    setShoppingSuggestions('');

    try {
      const { data, error } = await supabase.functions.invoke('find-shopping', {
        body: {
          itemName: item.name,
          itemCategory: item.category,
          description: item.description,
          maxBudget: item.target_price,
        },
      });

      if (error) throw error;
      setShoppingSuggestions(data.suggestions);
    } catch (error: any) {
      console.error('Error finding shopping options:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to find shopping options',
        variant: 'destructive',
      });
    } finally {
      setShoppingLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'medium': return 'bg-primary/10 text-primary border-primary/20';
      case 'low': return 'bg-muted text-muted-foreground border-muted';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const WishlistItemCard = ({ item }: { item: WishlistItem }) => (
    <Card className="border-0 shadow-elegant">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium truncate">{item.name}</h4>
              <Badge variant="outline" className={cn("text-xs", getPriorityColor(item.priority))}>
                {item.priority}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Tag className="h-3 w-3" />
              <span>{item.category}</span>
              {item.target_price && (
                <>
                  <span>•</span>
                  <DollarSign className="h-3 w-3" />
                  <span>Budget: ${item.target_price}</span>
                </>
              )}
            </div>
            {item.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
            )}
          </div>
        </div>
        
        <div className="flex gap-2 mt-3">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 gap-1"
            onClick={() => handleFindShopping(item)}
          >
            <Search className="h-3.5 w-3.5" />
            Find Deals
          </Button>
          <Button
            size="sm"
            variant="default"
            className="gap-1"
            onClick={() => markPurchased.mutate(item.id)}
          >
            <Check className="h-3.5 w-3.5" />
            Got It
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => deleteItem.mutate(item.id)}
          >
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <AppLayout title="Wishlist" subtitle="Track items you want to buy">
      <div className="pb-24 px-4 space-y-6">
        {/* Add Item Button */}
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="w-full gap-2 h-12 rounded-xl">
              <Plus className="h-5 w-5" />
              Add to Wishlist
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add to Wishlist</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <Input
                placeholder="Item name (e.g., Black leather jacket)"
                value={newItem.name}
                onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
              />
              <Select value={newItem.category} onValueChange={(v) => setNewItem({ ...newItem, category: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Textarea
                placeholder="Description (optional) - style, color, material..."
                value={newItem.description}
                onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
              />
              <div className="flex gap-3">
                <div className="flex-1">
                  <Input
                    type="number"
                    placeholder="Max budget ($)"
                    value={newItem.target_price}
                    onChange={(e) => setNewItem({ ...newItem, target_price: e.target.value })}
                  />
                </div>
                <Select value={newItem.priority} onValueChange={(v: 'low' | 'medium' | 'high') => setNewItem({ ...newItem, priority: v })}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button 
                className="w-full" 
                onClick={handleAddItem}
                disabled={addItem.isPending}
              >
                {addItem.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Add to Wishlist
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Shopping Suggestions Dialog */}
        <Dialog open={!!selectedItem && (shoppingLoading || !!shoppingSuggestions)} onOpenChange={() => {
          setSelectedItem(null);
          setShoppingSuggestions('');
        }}>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Shopping Guide: {selectedItem?.name}
              </DialogTitle>
            </DialogHeader>
            {shoppingLoading ? (
              <div className="flex flex-col items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Finding the best deals for you...</p>
              </div>
            ) : (
              <div className="prose prose-sm max-w-none text-foreground">
                {shoppingSuggestions.split('\n').map((line, i) => (
                  <p key={i} className="mb-2 last:mb-0">{line}</p>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Tabs for pending/purchased */}
        <Tabs defaultValue="wanted" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="wanted" className="gap-2">
              <Heart className="h-4 w-4" />
              Wanted ({pendingItems.length})
            </TabsTrigger>
            <TabsTrigger value="purchased" className="gap-2">
              <Check className="h-4 w-4" />
              Got It ({purchasedItems.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="wanted" className="space-y-3">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="border-0 shadow-elegant">
                    <CardContent className="p-4">
                      <div className="animate-pulse space-y-3">
                        <div className="h-5 bg-muted rounded w-3/4" />
                        <div className="h-4 bg-muted rounded w-1/2" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : pendingItems.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <ShoppingBag className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground text-center">
                    Your wishlist is empty
                  </p>
                  <p className="text-sm text-muted-foreground/70 text-center mt-1">
                    Add items you want to buy or items detected from wardrobe gaps
                  </p>
                </CardContent>
              </Card>
            ) : (
              pendingItems.map((item) => (
                <WishlistItemCard key={item.id} item={item} />
              ))
            )}
          </TabsContent>

          <TabsContent value="purchased" className="space-y-3">
            {purchasedItems.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Check className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground text-center">
                    No purchased items yet
                  </p>
                </CardContent>
              </Card>
            ) : (
              purchasedItems.map((item) => (
                <Card key={item.id} className="border-0 shadow-elegant opacity-70">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        <span className="font-medium line-through">{item.name}</span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteItem.mutate(item.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
