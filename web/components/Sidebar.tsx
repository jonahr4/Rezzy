'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { signOut } from '@/lib/firebase';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

function preWarmContainer() {
  if (!API_URL) return;
  fetch(`${API_URL}/health`, { cache: 'no-store' }).catch(() => {});
}

const NAV_ITEMS = [
  {
    section: 'Main',
    items: [
      { href: '/dashboard',    label: 'Dashboard',    icon: '⬡' },
      { href: '/source-bank',  label: 'Source Bank',  icon: '◈' },
    ],
  },
  {
    section: 'Pipeline',
    items: [
      { href: '/tailor',       label: 'New Tailoring', icon: '◆', preWarm: true },
      { href: '/runs',         label: 'Run History',   icon: '◇' },
    ],
  },
  {
    section: 'Account',
    items: [
      { href: '/settings',     label: 'Settings',      icon: '◎' },
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
      <div className="sidebar-brand">
        <div className="sidebar-brand-name">
          Rez<span>zy</span>
        </div>
        <div className="sidebar-brand-sub">v2.0 — beta</div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1 }}>
        {NAV_ITEMS.map(({ section, items }) => (
          <div key={section}>
            <div className="sidebar-section-label">{section}</div>
            {items.map(({ href, label, icon, preWarm }) => (
              <Link
                key={href}
                href={href}
                className={`sidebar-item ${pathname.startsWith(href) ? 'active' : ''}`}
                onMouseEnter={preWarm ? preWarmContainer : undefined}
              >
                <span className="sidebar-item-icon">{icon}</span>
                {label}
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
            style={{ marginTop: 8, justifyContent: 'flex-start' }}
          >
            Sign out
          </button>
        </div>
      )}
    </aside>
  );
}
