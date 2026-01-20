import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Loader2, CheckCircle, Database } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export function DataExport() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [exportComplete, setExportComplete] = useState(false);

  const exportAllData = async () => {
    if (!user) {
      toast({
        title: "Not authenticated",
        description: "Please sign in to export your data.",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);
    setExportComplete(false);

    try {
      // Fetch all user data from each table
      const [
        clothingItems,
        outfits,
        outfitFeedback,
        wishlistItems,
        trips,
        tripOutfits,
        tryOnResults,
        profile
      ] = await Promise.all([
        supabase.from('clothing_items').select('*').eq('user_id', user.id),
        supabase.from('outfits').select('*').eq('user_id', user.id),
        supabase.from('outfit_feedback').select('*').eq('user_id', user.id),
        supabase.from('wishlist_items').select('*').eq('user_id', user.id),
        supabase.from('trips').select('*').eq('user_id', user.id),
        supabase.from('trip_outfits').select(`
          *,
          trips!inner(user_id)
        `).eq('trips.user_id', user.id),
        supabase.from('try_on_results').select('*').eq('user_id', user.id),
        supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle()
      ]);

      // Compile all data into a single object
      const backupData = {
        exportDate: new Date().toISOString(),
        userId: user.id,
        userEmail: user.email,
        appName: "WearWise",
        version: "1.0",
        data: {
          profile: profile.data,
          clothingItems: clothingItems.data || [],
          outfits: outfits.data || [],
          outfitFeedback: outfitFeedback.data || [],
          wishlistItems: wishlistItems.data || [],
          trips: trips.data || [],
          tripOutfits: tripOutfits.data || [],
          tryOnResults: tryOnResults.data || [],
        },
        counts: {
          clothingItems: clothingItems.data?.length || 0,
          outfits: outfits.data?.length || 0,
          outfitFeedback: outfitFeedback.data?.length || 0,
          wishlistItems: wishlistItems.data?.length || 0,
          trips: trips.data?.length || 0,
          tripOutfits: tripOutfits.data?.length || 0,
          tryOnResults: tryOnResults.data?.length || 0,
        }
      };

      // Create and download the JSON file
      const jsonString = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `wearwise-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setExportComplete(true);
      toast({
        title: "Export successful!",
        description: `Exported ${Object.values(backupData.counts).reduce((a, b) => a + b, 0)} items.`,
      });

    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export failed",
        description: "There was an error exporting your data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Data Export
        </CardTitle>
        <CardDescription>
          Download a complete backup of all your WearWise data as a JSON file.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground space-y-2">
          <p>Your backup will include:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Profile information</li>
            <li>All clothing items</li>
            <li>Saved outfits</li>
            <li>Outfit feedback history</li>
            <li>Wishlist items</li>
            <li>Trip plans & outfits</li>
            <li>Virtual try-on results</li>
          </ul>
        </div>

        <Button 
          onClick={exportAllData} 
          disabled={isExporting}
          className="w-full"
        >
          {isExporting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Exporting...
            </>
          ) : exportComplete ? (
            <>
              <CheckCircle className="mr-2 h-4 w-4" />
              Download Complete
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Download Backup
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
