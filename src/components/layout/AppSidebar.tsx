import { Shirt, Palette, History, BarChart3, Sparkles, MessageCircle, Plane, Menu, ShoppingBag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NavLink } from '@/components/NavLink';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';

const navItems = [
  { path: '/wardrobe', label: 'Wardrobe', icon: Shirt },
  { path: '/create', label: 'Create', icon: Palette },
  { path: '/try-on', label: 'Try On', icon: Sparkles },
  { path: '/history', label: 'History', icon: History },
  { path: '/travel', label: 'Travel', icon: Plane },
  { path: '/insights', label: 'Insights', icon: BarChart3 },
  { path: '/wishlist', label: 'Wishlist', icon: ShoppingBag },
  { path: '/stylist', label: 'Stylist', icon: MessageCircle },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="p-4">
        {!isCollapsed && (
          <span className="font-display text-xl font-bold px-2">Wear Wise</span>
        )}
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map(({ path, label, icon: Icon }) => (
                <SidebarMenuItem key={path}>
                  <SidebarMenuButton asChild tooltip={label}>
                    <NavLink 
                      to={path} 
                      className="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors hover:bg-sidebar-accent"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      <span className={cn(
                        "transition-opacity duration-200",
                        isCollapsed ? "opacity-0 w-0" : "opacity-100"
                      )}>
                        {label}
                      </span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4 border-t border-sidebar-border/50">
        <div className="flex items-center justify-start">
          <img 
            src="/logo.svg" 
            alt="Logo" 
            className={cn(
              "shrink-0 transition-all duration-300 object-contain drop-shadow-[0_0_2px_rgba(255,255,255,0.5)] dark:drop-shadow-[0_0_2px_rgba(0,0,0,0.5)]",
              isCollapsed ? "h-12 w-12" : "h-36 w-36 scale-110"
            )}
          />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

export function SidebarToggle() {
  return (
    <SidebarTrigger className="h-9 w-9">
      <Menu className="h-5 w-5" />
    </SidebarTrigger>
  );
}
