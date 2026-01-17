import { Link, useLocation } from 'react-router-dom';
import { Shirt, Palette, History, BarChart3, Sparkles, MessageCircle, Plane } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/wardrobe', label: 'Wardrobe', icon: Shirt },
  { path: '/create', label: 'Create', icon: Palette },
  { path: '/try-on', label: 'Try On', icon: Sparkles },
  { path: '/history', label: 'History', icon: History },
  { path: '/travel', label: 'Travel', icon: Plane },
  { path: '/insights', label: 'Insights', icon: BarChart3 },
  { path: '/stylist', label: 'Stylist', icon: MessageCircle },
];

export function BottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-border safe-area-pb">
      <div className="flex items-center overflow-x-auto scrollbar-hide px-1 py-2">
        {navItems.map(({ path, label, icon: Icon }) => {
          const isActive = location.pathname === path;
          
          return (
            <Link
              key={path}
              to={path}
              className={cn(
                'flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-colors flex-1 min-w-[48px]',
                isActive 
                  ? 'text-primary' 
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className={cn('h-5 w-5', isActive && 'stroke-[2.5]')} />
              <span className="text-[9px] font-medium truncate">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
