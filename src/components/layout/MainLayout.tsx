import { useState, ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { MobileNavBar } from './MobileNavBar';
import { useAuth } from '@/contexts/AuthContext';
import { useViewMode } from '@/contexts/ViewModeContext';
import { Navigate } from 'react-router-dom';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const { isAuthenticated } = useAuth();
  const { isMobileView } = useViewMode();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile top nav bar */}
      {isMobileView && (
        <MobileNavBar onMenuClick={() => setSidebarOpen(true)} />
      )}

      {/* Sidebar — drawer on mobile, fixed on desktop */}
      <Sidebar
        mobileOpen={sidebarOpen}
        onMobileClose={() => setSidebarOpen(false)}
      />

      {/* Main content */}
      <main
        className={
          isMobileView
            ? "pt-14 min-h-screen"           // push below mobile nav bar, no left margin
            : "ml-[280px] min-h-screen transition-all duration-300"
        }
      >
        {children}
      </main>
    </div>
  );
}
