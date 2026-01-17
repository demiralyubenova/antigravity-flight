import { ReactNode } from 'react';
import { AppSidebar, SidebarToggle } from './AppSidebar';
import { SidebarProvider } from '@/components/ui/sidebar';
import { LogOut, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface AppLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  showNav?: boolean;
}

export function AppLayout({ children, title, subtitle, showNav = true }: AppLayoutProps) {
  const { user, signOut } = useAuth();
  const { profile } = useProfile();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
  };

  const getInitials = () => {
    if (profile?.display_name) {
      return profile.display_name.charAt(0).toUpperCase();
    }
    return user?.email?.charAt(0).toUpperCase() || 'U';
  };

  if (!showNav) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-40 glass border-b border-border">
          <div className="flex items-center justify-between px-4 py-4">
            <div>
              <h1 className="font-display text-2xl font-medium tracking-tight">{title}</h1>
              {subtitle && (
                <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
              )}
            </div>
          </div>
        </header>
        <main>{children}</main>
      </div>
    );
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-40 glass border-b border-border">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <SidebarToggle />
                <div>
                  <h1 className="font-display text-xl font-medium tracking-tight">{title}</h1>
                  {subtitle && (
                    <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
                  )}
                </div>
              </div>

              {user && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-full">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={profile?.avatar_url || undefined} alt="Profile" />
                        <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                          {getInitials()}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem className="flex flex-col items-start gap-0.5">
                      <span className="font-medium">{profile?.display_name || 'User'}</span>
                      <span className="text-muted-foreground text-xs">{user.email}</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate('/profile')}>
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </header>
          
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
