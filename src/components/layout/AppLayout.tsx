import { ReactNode } from 'react';
import { BottomNav } from './BottomNav';
import { Header } from './Header';

interface AppLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  showNav?: boolean;
}

export function AppLayout({ children, title, subtitle, showNav = true }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <Header title={title} subtitle={subtitle} />
      <main className={showNav ? 'pb-20' : ''}>
        {children}
      </main>
      {showNav && <BottomNav />}
    </div>
  );
}