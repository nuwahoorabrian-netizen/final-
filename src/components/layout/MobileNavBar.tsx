import { Menu, Smartphone, Monitor, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useViewMode } from '@/contexts/ViewModeContext';
import ucuLogoFull from '@/assets/ucu-logo-full.png';

interface MobileNavBarProps {
    onMenuClick: () => void;
}

export function MobileNavBar({ onMenuClick }: MobileNavBarProps) {
    const { viewMode, toggleViewMode } = useViewMode();

    const ViewIcon =
        viewMode === 'mobile' ? Monitor :
            viewMode === 'desktop' ? LayoutGrid :
                Smartphone;

    const viewLabel =
        viewMode === 'mobile' ? 'Switch to Desktop' :
            viewMode === 'desktop' ? 'Switch to Auto' :
                'Switch to Mobile';

    return (
        <header className="mobile-nav fixed top-0 left-0 right-0 z-40 h-14 flex items-center justify-between px-4 bg-sidebar border-b border-sidebar-border">
            {/* Hamburger */}
            <Button
                variant="ghost"
                size="icon"
                onClick={onMenuClick}
                className="text-sidebar-foreground hover:bg-sidebar-accent"
                aria-label="Open navigation menu"
            >
                <Menu className="w-5 h-5" />
            </Button>

            {/* Logo / Title */}
            <div className="flex items-center gap-2">
                <img src={ucuLogoFull} alt="UCU Logo" className="h-8 object-contain" />
            </div>

            {/* View Mode Toggle */}
            <Button
                variant="ghost"
                size="icon"
                onClick={toggleViewMode}
                title={viewLabel}
                className="text-sidebar-foreground hover:bg-sidebar-accent"
                aria-label={viewLabel}
            >
                <ViewIcon className="w-5 h-5" />
            </Button>
        </header>
    );
}
