import { Link, useLocation } from 'react-router-dom';
import { Shirt, Palette, Sparkles, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { History, BarChart3, Plane, MessageCircle } from 'lucide-react';

const mainNavItems = [
  { path: '/wardrobe', label: 'Wardrobe', icon: Shirt },
  { path: '/create', label: 'Create', icon: Palette },
  { path: '/try-on', label: 'Try On', icon: Sparkles },
];

const moreNavItems = [
  { path: '/history', label: 'History', icon: History },
  { path: '/travel', label: 'Travel', icon: Plane },
  { path: '/insights', label: 'Insights', icon: BarChart3 },
  { path: '/stylist', label: 'Stylist', icon: MessageCircle },
];

export function BottomNav() {
  const location = useLocation();
  const isMoreActive = moreNavItems.some(item => item.path === location.pathname);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-border safe-area-pb">
      <div className="flex items-center justify-around px-4 py-2">
        {mainNavItems.map(({ path, label, icon: Icon }) => {
          const isActive = location.pathname === path;
          
          return (
            <Link
              key={path}
              to={path}
              className={cn(
                'flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors min-w-[64px]',
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
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                'flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors min-w-[64px]',
                isMoreActive 
                  ? 'text-primary' 
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <MoreHorizontal className={cn('h-5 w-5', isMoreActive && 'stroke-[2.5]')} />
              <span className="text-[10px] font-medium">More</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 mb-2">
            {moreNavItems.map(({ path, label, icon: Icon }) => {
              const isActive = location.pathname === path;
              
              return (
                <DropdownMenuItem key={path} asChild>
                  <Link
                    to={path}
                    className={cn(
                      'flex items-center gap-3 w-full',
                      isActive && 'text-primary font-medium'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{label}</span>
                  </Link>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
}
