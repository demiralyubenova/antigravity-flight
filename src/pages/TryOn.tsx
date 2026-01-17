import { AppLayout } from '@/components/layout/AppLayout';
import { Sparkles } from 'lucide-react';

export default function TryOn() {
  return (
    <AppLayout title="Fitting Mirror" subtitle="Virtual try-on experience">
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
          <Sparkles className="h-10 w-10 text-primary" />
        </div>
        <h2 className="font-display text-2xl font-medium mb-2">Coming Soon</h2>
        <p className="text-muted-foreground max-w-sm">
          Virtual try-on requires advanced AI image processing. 
          This feature will be available in a future update.
        </p>
      </div>
    </AppLayout>
  );
}