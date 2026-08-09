'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { signOut } from '@/lib/firebase';

const ACA_URL = process.env.NEXT_PUBLIC_ACA_URL || process.env.NEXT_PUBLIC_API_URL || '';

function preWarmContainer() {
  if (!ACA_URL) return;
  fetch(`${ACA_URL}/health`, { cache: 'no-store' }).catch(() => {});
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
  profile: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
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
      { href: '/dashboard',    label: 'Dashboard',     icon: icons.dashboard },
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

  const initials = user?.displayName
    ? user.displayName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? '?';

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div className="sidebar-brand" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <img src="/logo.png" alt="Rezzy Logo" style={{ width: 28, height: 28, objectFit: 'contain' }} />
        <div className="sidebar-brand-name" style={{ fontSize: 24, marginTop: 2 }}>
          Rez<span>zy</span>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1 }}>
        {NAV_ITEMS.map(({ section, items }) => (
          <div key={section}>
            <div className="sidebar-section-label">{section}</div>
            {items.map(({ href, label, icon, preWarm, badge }) => (
              <Link
                key={href}
                href={href}
                className={`sidebar-item ${pathname.startsWith(href) ? 'active' : ''}`}
                onMouseEnter={preWarm ? preWarmContainer : undefined}
              >
                <span className="sidebar-item-icon">{icon}</span>
                {label}
                {badge && <span className="sidebar-badge">{badge}</span>}
              </Link>
            ))}
          </div>
        ))}
      </nav>

      {/* User footer */}
      {user && (
        <div className="sidebar-footer">
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
        </div>
      )}
    </aside>
  );
}
