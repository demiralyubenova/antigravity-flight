import { Shirt, Palette, History, BarChart3, Sparkles, MessageCircle, Plane, Menu, ShoppingBag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NavLink } from '@/components/NavLink';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
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
      <SidebarContent className="pt-4">
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
