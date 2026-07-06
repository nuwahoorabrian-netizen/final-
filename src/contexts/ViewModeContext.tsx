import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

type ViewMode = 'auto' | 'mobile' | 'desktop';

interface ViewModeContextType {
    viewMode: ViewMode;
    isMobileView: boolean;
    toggleViewMode: () => void;
}

const ViewModeContext = createContext<ViewModeContextType | undefined>(undefined);

const STORAGE_KEY = 'uems-view-mode';

export function ViewModeProvider({ children }: { children: ReactNode }) {
    const isNaturallyMobile = useIsMobile();
    const [viewMode, setViewMode] = useState<ViewMode>(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved === 'mobile' || saved === 'desktop' || saved === 'auto') return saved;
        return 'auto';
    });

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, viewMode);
    }, [viewMode]);

    const toggleViewMode = () => {
        setViewMode((prev) => {
            if (prev === 'auto') return 'mobile';
            if (prev === 'mobile') return 'desktop';
            return 'auto';
        });
    };

    const isMobileView =
        viewMode === 'mobile' ? true :
            viewMode === 'desktop' ? false :
                isNaturallyMobile;

    return (
        <ViewModeContext.Provider value={{ viewMode, isMobileView, toggleViewMode }}>
            {children}
        </ViewModeContext.Provider>
    );
}

export function useViewMode() {
    const ctx = useContext(ViewModeContext);
    if (!ctx) throw new Error('useViewMode must be used within ViewModeProvider');
    return ctx;
}
