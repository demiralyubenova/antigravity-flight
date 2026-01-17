import { Link, useLocation } from 'react-router-dom';
import { Shirt, Sparkles, Palette, MessageCircle, Plane } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/wardrobe', label: 'Wardrobe', icon: Shirt },
  { path: '/create', label: 'Create', icon: Palette },
  { path: '/travel', label: 'Travel', icon: Plane },
  { path: '/stylist', label: 'Stylist', icon: MessageCircle },
  { path: '/try-on', label: 'Try On', icon: Sparkles },
];

export function BottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-border safe-area-pb">
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map(({ path, label, icon: Icon }) => {
          const isActive = location.pathname === path;
          
          return (
            <Link
              key={path}
              to={path}
              className={cn(
                'flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-[60px]',
                isActive 
                  ? 'text-primary' 
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className={cn('h-5 w-5', isActive && 'stroke-[2.5]')} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}