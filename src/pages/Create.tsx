import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Palette, Loader2 } from 'lucide-react';

export default function Create() {
  const [occasion, setOccasion] = useState('');
  const [loading, setLoading] = useState(false);

  const occasionSuggestions = [
    'Business Meeting',
    'Date Night',
    'Casual Weekend',
    'Wedding Guest',
    'Job Interview',
    'Beach Day',
  ];

  const handleCreate = async () => {
    if (!occasion) return;
    setLoading(true);
    // TODO: Implement AI outfit creation
    setTimeout(() => setLoading(false), 2000);
  };

  return (
    <AppLayout title="Outfit Creator" subtitle="AI-powered outfit suggestions">
      <div className="px-4 py-6 space-y-6">
        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">
            What's the occasion?
          </label>
          <Input
            value={occasion}
            onChange={(e) => setOccasion(e.target.value)}
            placeholder="e.g., Dinner party, Office meeting..."
            className="text-lg"
          />
        </div>

        {/* Quick suggestions */}
        <div className="flex flex-wrap gap-2">
          {occasionSuggestions.map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => setOccasion(suggestion)}
              className="px-3 py-1.5 rounded-full text-sm bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
            >
              {suggestion}
            </button>
          ))}
        </div>

        <Button
          onClick={handleCreate}
          disabled={!occasion || loading}
          className="w-full"
          size="lg"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating outfit...
            </>
          ) : (
            <>
              <Palette className="mr-2 h-4 w-4" />
              Create Outfit
            </>
          )}
        </Button>

        {/* Placeholder for results */}
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Palette className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground text-sm max-w-xs">
            Enter an occasion above and let AI create the perfect outfit from your wardrobe
          </p>
        </div>
      </div>
    </AppLayout>
  );
}