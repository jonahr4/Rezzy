'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

interface SidebarContextValue {
  collapsed: boolean;
  mobileOpen: boolean;
  toggleCollapsed: () => void;
  openMobile: () => void;
  closeMobile: () => void;
}

const SidebarContext = createContext<SidebarContextValue>({
  collapsed: false,
  mobileOpen: false,
  toggleCollapsed: () => {},
  openMobile: () => {},
  closeMobile: () => {},
});

export function useSidebar() {
  return useContext(SidebarContext);
}

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  // Read persisted collapse preference; default false
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('sidebar-collapsed') === 'true';
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const resizeRef = useRef<ResizeObserver | null>(null);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('sidebar-collapsed', String(next));
      return next;
    });
  }, []);

  const openMobile = useCallback(() => setMobileOpen(true), []);
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  // Auto-behavior based on viewport width
  useEffect(() => {
    function handleResize() {
      const w = window.innerWidth;
      if (w < 768) {
        // Mobile: sidebar is off-canvas, reset collapsed state
        setMobileOpen(false);
      } else if (w < 1024) {
        // Tablet: auto-collapse to icon-only
        setCollapsed(true);
      }
      // Desktop: respect user preference from localStorage
    }

    handleResize(); // run once on mount

    resizeRef.current = new ResizeObserver(handleResize);
    resizeRef.current.observe(document.body);

    return () => {
      resizeRef.current?.disconnect();
    };
  }, []);

  // Close mobile drawer when route changes (click on nav)
  useEffect(() => {
    setMobileOpen(false);
  }, []);

  return (
    <SidebarContext.Provider value={{ collapsed, mobileOpen, toggleCollapsed, openMobile, closeMobile }}>
      {children}
    </SidebarContext.Provider>
  );
}
