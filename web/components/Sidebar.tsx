'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { signOut } from '@/lib/firebase';
import { useSidebar } from './SidebarContext';

function preWarmContainer() {
  fetch('/api/pipeline/health', { cache: 'no-store' }).catch(() => {});
}

/* ── SVG Icons ─────────────────────────────────────── */
const icons = {
  dashboard: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  ),
  sourceBank: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      <line x1="9" y1="7" x2="16" y2="7" />
      <line x1="9" y1="11" x2="14" y2="11" />
    </svg>
  ),
  tailor: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  ),
  runs: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  settings: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  signOut: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
  chevronLeft: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  ),
  chevronRight: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  ),
  close: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
};

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  preWarm?: boolean;
  badge?: string;
};

const NAV_ITEMS: { section: string; items: NavItem[] }[] = [
  {
    section: 'Pipeline',
    items: [
      { href: '/dashboard',    label: 'Dashboard',      icon: icons.dashboard },
      { href: '/tailor',       label: 'New Tailoring',  icon: icons.tailor, preWarm: true },
      { href: '/source-bank',  label: 'Source Bank',    icon: icons.sourceBank },
      { href: '/runs',         label: 'Run History',    icon: icons.runs },
    ],
  },
  {
    section: 'Settings',
    items: [
      { href: '/settings',     label: 'Settings',       icon: icons.settings },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { collapsed, mobileOpen, toggleCollapsed, closeMobile } = useSidebar();

  const initials = user?.displayName
    ? user.displayName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? '?';

  function handleNavClick() {
    closeMobile(); // close drawer on mobile when navigating
  }

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
      {/* Brand */}
      <div className="sidebar-brand">
        {/* Expanded: logo + name + chevron all in one row */}
        {!collapsed && (
          <div className="sidebar-brand-inner">
            <img src="/Logo.svg" alt="Rezzy Logo" style={{ height: 34, width: 'auto' }} />
            <div className="sidebar-brand-name" style={{ fontSize: 24, marginTop: 2 }}>
              Rez<span>zy</span>
            </div>
            {/* Chevron right-aligned next to Rezzy */}
            <button
              className="sidebar-collapse-btn"
              onClick={toggleCollapsed}
              title="Collapse sidebar"
              aria-label="Collapse sidebar"
              style={{ marginLeft: 'auto' }}
            >
              {icons.chevronLeft}
            </button>
          </div>
        )}

        {/* Collapsed: logo centred, chevron centred below */}
        {collapsed && (
          <>
            <div className="sidebar-brand-icon-only">
              <img src="/Logo.svg" alt="Rezzy" style={{ height: 28, width: 'auto' }} />
            </div>
            <button
              className="sidebar-collapse-btn"
              onClick={toggleCollapsed}
              title="Expand sidebar"
              aria-label="Expand sidebar"
            >
              {icons.chevronRight}
            </button>
          </>
        )}

        {/* Close button — always rendered on mobile-open */}
        {mobileOpen && (
          <button
            className="sidebar-close-btn"
            onClick={closeMobile}
            aria-label="Close navigation"
          >
            {icons.close}
          </button>
        )}
      </div>

      {/* Nav — on mobile always show full labels even if collapsed */}
      <nav style={{ flex: 1 }}>
        {NAV_ITEMS.map(({ section, items }) => (
          <div key={section}>
            {(!collapsed || mobileOpen) && (
              <div className="sidebar-section-label">{section}</div>
            )}
            {collapsed && !mobileOpen && <div style={{ height: 16 }} />}

            {items.map(({ href, label, icon, preWarm, badge }) => (
              <Link
                key={href}
                href={href}
                className={`sidebar-item ${pathname.startsWith(href) ? 'active' : ''} ${collapsed && !mobileOpen ? 'icon-only' : ''}`}
                onMouseEnter={preWarm ? preWarmContainer : undefined}
                onClick={handleNavClick}
                title={collapsed && !mobileOpen ? label : undefined}
              >
                <span className="sidebar-item-icon">{icon}</span>
                {(!collapsed || mobileOpen) && <span className="sidebar-item-label">{label}</span>}
                {(!collapsed || mobileOpen) && badge && <span className="sidebar-badge">{badge}</span>}
              </Link>
            ))}
          </div>
        ))}
      </nav>

      {/* User footer */}
      {user && (
        <div className="sidebar-footer">
          {(!collapsed || mobileOpen) ? (
            <>
              <div className="sidebar-user">
                <div className="sidebar-avatar">{initials}</div>
                <div className="sidebar-user-info">
                  <div className="sidebar-user-name">
                    {user.displayName ?? 'User'}
                  </div>
                  <div className="sidebar-user-email">{user.email}</div>
                </div>
              </div>
              <button
                onClick={() => signOut()}
                className="btn btn-ghost btn-sm w-full"
                style={{ marginTop: 8, justifyContent: 'flex-start', gap: 8 }}
              >
                {icons.signOut}
                Sign out
              </button>
            </>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
              <div className="sidebar-avatar" title={user.displayName ?? user.email ?? ''}>
                {initials}
              </div>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
