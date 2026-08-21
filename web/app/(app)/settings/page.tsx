'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
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

/* ── Resume info field config ──────────────────────────── */
const PROFILE_FIELDS = [
  { key: 'full_name', label: 'Full Name',  placeholder: 'Jonah Rothman', maxLen: 60 },
  { key: 'phone',     label: 'Phone',      placeholder: '(555) 123-4567', maxLen: 20 },
  { key: 'email',     label: 'Email',       placeholder: 'you@example.com', maxLen: 80 },
  { key: 'website',   label: 'Website',     placeholder: 'yoursite.com', maxLen: 80 },
  { key: 'linkedin',  label: 'LinkedIn',    placeholder: 'linkedin.com/in/yourname', maxLen: 80 },
  { key: 'github',    label: 'GitHub',      placeholder: 'github.com/yourname', maxLen: 80 },
] as const;

type ProfileData = Record<string, string>;

/* ── Profile Tab ──────────────────────────────────────── */
function ProfileTab() {
  const { user } = useAuth();
  const uid = user?.uid;
  function authH(): HeadersInit { return uid ? { 'x-user-id': uid } : {}; }

  const [profile, setProfile] = useState<ProfileData>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Load profile
  const loadProfile = useCallback(async () => {
    try {
      const res = await fetch('/api/profile', { headers: authH() });
      if (res.ok) {
        const data = await res.json();
        const p: ProfileData = {};
        for (const f of PROFILE_FIELDS) p[f.key] = data[f.key] ?? '';
        setProfile(p);
      }
    } catch { /* ignore */ }
  }, [uid]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (uid) loadProfile(); }, [uid, loadProfile]);

  function updateField(key: string, val: string) {
    setProfile(prev => ({ ...prev, [key]: val }));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authH() },
        body: JSON.stringify(profile),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch { /* ignore */ }
    setSaving(false);
  }

  const initials = user?.displayName
    ? user.displayName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? '?';

  return (
    <div className="card" style={{ padding: 28 }}>
      {/* User identity */}
      <div style={{ display: 'flex', gap: 20, alignItems: 'center', marginBottom: 28 }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%', background: 'var(--accent)',
          color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-mono)',
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
        </div>
      </div>

      {/* Resume personal info */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
          Resume Header Info
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
          This information appears at the top of your generated resumes.
        </p>

        <div className="profile-form">
          {PROFILE_FIELDS.map(f => {
            const val = profile[f.key] ?? '';
            const len = val.length;
            const pct = len / f.maxLen;
            const countClass = pct > 1 ? 'over' : pct > 0.85 ? 'warn' : '';
            return (
              <div key={f.key} className="input-group">
                <div className="profile-field-label">
                  <span>{f.label}</span>
                  <span className={`profile-char-count ${countClass}`}>{len}/{f.maxLen}</span>
                </div>
                <input
                  type="text"
                  className="input-field"
                  placeholder={f.placeholder}
                  value={val}
                  onChange={(e) => updateField(f.key, e.target.value)}
                  maxLength={f.maxLen}
                />
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 20 }}>
          <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving} id="btn-save-profile">
            {saving ? 'Saving...' : saved ? 'Saved' : 'Save Profile'}
          </button>
          <Link href="/onboarding" className="btn btn-ghost btn-sm">
            Re-run Onboarding
          </Link>
          {saved && <span style={{ fontSize: 12, color: '#2E7D32' }}>Profile saved</span>}
        </div>
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
