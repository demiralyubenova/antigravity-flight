import { AppLayout } from '@/components/layout/AppLayout';
import { History as HistoryIcon } from 'lucide-react';

export default function History() {
  return (
    <AppLayout title="The Chronology" subtitle="Your outfit history">
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-6">
          <HistoryIcon className="h-10 w-10 text-muted-foreground" />
        </div>
        <h2 className="font-display text-2xl font-medium mb-2">No outfits logged</h2>
        <p className="text-muted-foreground max-w-sm">
          Start logging your outfits to build your style history. 
          Track what you wear and when.
        </p>
      </div>
    </AppLayout>
  );
}