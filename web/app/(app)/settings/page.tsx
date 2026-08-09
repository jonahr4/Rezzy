'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';

type Tab = 'profile' | 'preferences' | 'api-keys';

const TABS: { key: Tab; label: string }[] = [
  { key: 'profile',     label: 'Profile' },
  { key: 'preferences', label: 'Preferences' },
  { key: 'api-keys',    label: 'API Keys' },
];

const THEMES = [
  { id: 'warm-dusk', label: 'Warm Dusk', desc: 'Default warm palette' },
  { id: 'cool-night', label: 'Cool Night', desc: 'Deep blue tones' },
  { id: 'midnight', label: 'Midnight', desc: 'True dark mode' },
  { id: 'ocean', label: 'Ocean', desc: 'Teal and seafoam' },
  { id: 'forest', label: 'Forest', desc: 'Deep greens' },
];

/* ── Profile Tab ──────────────────────────────────────── */
function ProfileTab() {
  const { user } = useAuth();

  const initials = user?.displayName
    ? user.displayName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? '?';

  return (
    <div className="card" style={{ padding: 28 }}>
      <div style={{ display: 'flex', gap: 20, alignItems: 'center', marginBottom: 28 }}>
        <div style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          background: 'var(--accent)',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 22,
          fontWeight: 700,
          fontFamily: 'var(--font-mono)',
        }}>
          {initials}
        </div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>
            {user?.displayName ?? 'User'}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
            {user?.email}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
            UID: {user?.uid?.slice(0, 12)}...
          </div>
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="input-group">
          <label className="input-label" htmlFor="settings-name">Display Name</label>
          <input
            id="settings-name"
            type="text"
            className="input-field"
            defaultValue={user?.displayName ?? ''}
            placeholder="Your name"
          />
        </div>

        <div className="input-group">
          <label className="input-label" htmlFor="settings-email">Email</label>
          <input
            id="settings-email"
            type="email"
            className="input-field"
            defaultValue={user?.email ?? ''}
            disabled
            style={{ opacity: 0.5 }}
          />
          <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            Managed by your sign-in provider
          </span>
        </div>

        <button className="btn btn-primary btn-sm" style={{ alignSelf: 'flex-start', marginTop: 4 }} id="btn-save-profile">
          Save changes
        </button>
      </div>
    </div>
  );
}

/* ── Preferences Tab ──────────────────────────────────── */
function PreferencesTab() {
  const [currentTheme, setCurrentTheme] = useState('warm-dusk');

  function applyTheme(themeId: string) {
    setCurrentTheme(themeId);
    document.documentElement.setAttribute('data-theme', themeId);
  }

  return (
    <div className="card" style={{ padding: 28 }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
          Theme
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
          Choose your preferred color scheme
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
          {THEMES.map((theme) => (
            <button
              key={theme.id}
              onClick={() => applyTheme(theme.id)}
              className="card"
              style={{
                padding: '14px 16px',
                textAlign: 'left',
                cursor: 'pointer',
                border: currentTheme === theme.id ? '2px solid var(--accent)' : '1px solid var(--border)',
                background: currentTheme === theme.id ? 'var(--surface-elevated)' : 'var(--surface)',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>
                {theme.label}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {theme.desc}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>
          Notifications
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[
            { label: 'Email me when a run completes', id: 'notify-run' },
            { label: 'Weekly summary of tailoring stats', id: 'notify-weekly' },
          ].map(({ label, id }) => (
            <label key={id} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
              <input type="checkbox" id={id} className="toggle" defaultChecked />
              <span style={{ fontSize: 13, color: 'var(--text)' }}>{label}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── API Keys Tab ─────────────────────────────────────── */
function ApiKeysTab() {
  const [showKey, setShowKey] = useState(false);

  return (
    <div className="card" style={{ padding: 28 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
        OpenAI API Key
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
        Used for AI-powered bullet suggestions and JD parsing. Your key is encrypted and never shared.
      </div>

      <div className="input-group" style={{ marginBottom: 16 }}>
        <label className="input-label" htmlFor="openai-key">API Key</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            id="openai-key"
            type={showKey ? 'text' : 'password'}
            className="input-field"
            placeholder="sk-..."
            style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: 12 }}
          />
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setShowKey(!showKey)}
            style={{ flexShrink: 0 }}
          >
            {showKey ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-primary btn-sm" id="btn-save-key">
          Save key
        </button>
        <a
          href="https://platform.openai.com/api-keys"
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-ghost btn-sm"
        >
          Get a key ↗
        </a>
      </div>
    </div>
  );
}

const TAB_CONTENT: Record<Tab, React.ReactNode> = {
  profile:     <ProfileTab />,
  preferences: <PreferencesTab />,
  'api-keys':  <ApiKeysTab />,
};

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('profile');

  return (
    <>
      {/* Page header */}
      <div className="page-header">
        <div className="page-header-content">
          <div className="page-eyebrow">Account</div>
          <h1 className="page-title">Settings</h1>
          <p className="page-desc">
            Manage your profile, preferences, and API keys.
          </p>
        </div>
      </div>

      <div className="page-content">
        {/* Pill Tabs */}
        <div className="tab-pills" style={{ marginBottom: 24 }}>
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              className={`tab-pill ${activeTab === key ? 'active' : ''}`}
              onClick={() => setActiveTab(key)}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {TAB_CONTENT[activeTab]}
      </div>
    </>
  );
}
