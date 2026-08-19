'use client';

import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { SidebarProvider, useSidebar } from '@/components/SidebarContext';

/* Page name map for mobile top bar */
const PAGE_NAMES: Record<string, string> = {
  '/dashboard':   'Dashboard',
  '/source-bank': 'Source Bank',
  '/tailor':      'New Tailoring',
  '/runs':        'Run History',
  '/settings':    'Settings',
  '/applications': 'Application Tracker',
};

function AppShellInner({ children }: { children: React.ReactNode }) {
  const { mobileOpen, openMobile, closeMobile, collapsed } = useSidebar();
  const pathname = usePathname();

  const pageName = Object.entries(PAGE_NAMES).find(([key]) =>
    pathname.startsWith(key)
  )?.[1] ?? '';

  return (
    <div className={`app-shell ${collapsed ? 'sidebar-is-collapsed' : ''}`}>
      {/* Mobile overlay backdrop */}
      {mobileOpen && (
        <div
          className="sidebar-mobile-overlay"
          onClick={closeMobile}
          aria-hidden="true"
        />
      )}

      <Sidebar />

      <main className="app-main">
        {/* Mobile top bar */}
        <div className="mobile-topbar">
          <button
            className="mobile-hamburger"
            onClick={openMobile}
            aria-label="Open navigation"
            id="btn-hamburger"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          <div className="mobile-topbar-brand">
            <img src="/Logo.svg" alt="Rezzy" style={{ height: 22, width: 'auto' }} />
            <span>Rez<span style={{ color: 'var(--accent)' }}>zy</span></span>
          </div>

          <div style={{ width: 40 }} /> {/* spacer to center brand */}
        </div>

        {children}
      </main>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppShellInner>{children}</AppShellInner>
    </SidebarProvider>
  );
}
