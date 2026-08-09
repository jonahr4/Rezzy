'use client';

import { useState, useRef, useEffect } from 'react';
import type { SkillGroup } from '@/lib/entries';

export const DEFAULT_SKILL_GROUPS: Omit<SkillGroup, 'id' | 'user_id' | 'created_at' | 'updated_at'>[] = [
  { label: 'Languages',             skills: [], sort_order: 0 },
  { label: 'Frameworks & Libraries',skills: [], sort_order: 1 },
  { label: 'Testing & DevOps',      skills: [], sort_order: 2 },
  { label: 'Cloud & Databases',     skills: [], sort_order: 3 },
  { label: 'AI / ML & Data',        skills: [], sort_order: 4 },
  { label: 'Tools & Productivity',  skills: [], sort_order: 5 },
  { label: 'Other',                 skills: [], sort_order: 6 },
];

export function makeDefaultGroups(): SkillGroup[] {
  return DEFAULT_SKILL_GROUPS.map((g, i) => ({
    ...g,
    id: crypto.randomUUID(),
    user_id: '',
    sort_order: i,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));
}

/* ── Move popover ── */
function MovePopover({
  skill,
  groups,
  currentGroupId,
  onMove,
  onClose,
}: {
  skill: string;
  groups: SkillGroup[];
  currentGroupId: string;
  onMove: (targetId: string) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [onClose]);

  return (
    <div ref={ref} className="skill-move-popover">
      <div className="skill-move-label">Move to…</div>
      {groups
        .filter(g => g.id !== currentGroupId)
        .map(g => (
          <button key={g.id} className="skill-move-option" onClick={() => onMove(g.id)}>
            {g.label}
          </button>
        ))}
    </div>
  );
}

/* ── Skill chip with remove + move ── */
function SkillChip({
  skill,
  groupId,
  allGroups,
  onRemove,
  onMove,
}: {
  skill: string;
  groupId: string;
  allGroups: SkillGroup[];
  onRemove: () => void;
  onMove: (targetId: string) => void;
}) {
  const [showMove, setShowMove] = useState(false);
  return (
    <span className="skill-chip-removable" style={{ position: 'relative' }}>
      {skill}
      {allGroups.length > 1 && (
        <button
          type="button"
          className="skill-chip-move-btn"
          title="Move to group"
          onClick={() => setShowMove(v => !v)}
        >
          {/* Arrow icon */}
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </button>
      )}
      <button type="button" onClick={onRemove} aria-label={`Remove ${skill}`}>×</button>
      {showMove && (
        <MovePopover
          skill={skill}
          groups={allGroups}
          currentGroupId={groupId}
          onMove={(targetId) => { onMove(targetId); setShowMove(false); }}
          onClose={() => setShowMove(false)}
        />
      )}
    </span>
  );
}

/* ── Main SkillsEditor ── */
interface Props {
  groups: SkillGroup[];
  onChange: (groups: SkillGroup[]) => void;
  saving: boolean;
  onSave: () => void;
}

export default function SkillsEditor({ groups, onChange, saving, onSave }: Props) {
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [editingLabel, setEditingLabel] = useState<string | null>(null);
  const [labelDraft, setLabelDraft] = useState('');

  function addSkill(groupId: string, raw: string) {
    const skill = raw.trim();
    if (!skill) return;
    onChange(groups.map(g =>
      g.id === groupId && !g.skills.includes(skill)
        ? { ...g, skills: [...g.skills, skill] }
        : g
    ));
    setInputs(prev => ({ ...prev, [groupId]: '' }));
  }

  function removeSkill(groupId: string, skill: string) {
    onChange(groups.map(g =>
      g.id === groupId ? { ...g, skills: g.skills.filter(s => s !== skill) } : g
    ));
  }

  function moveSkill(fromGroupId: string, toGroupId: string, skill: string) {
    onChange(groups.map(g => {
      if (g.id === fromGroupId) return { ...g, skills: g.skills.filter(s => s !== skill) };
      if (g.id === toGroupId && !g.skills.includes(skill)) return { ...g, skills: [...g.skills, skill] };
      return g;
    }));
  }

  function addGroup() {
    const newGroup: SkillGroup = {
      id: crypto.randomUUID(),
      user_id: '',
      label: 'New Group',
      skills: [],
      sort_order: groups.length,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    onChange([...groups, newGroup]);
    // Start editing label immediately
    setEditingLabel(newGroup.id);
    setLabelDraft('New Group');
  }

  function removeGroup(groupId: string) {
    onChange(groups.filter(g => g.id !== groupId));
  }

  function commitLabel(groupId: string) {
    const draft = labelDraft.trim();
    if (draft) {
      onChange(groups.map(g => g.id === groupId ? { ...g, label: draft } : g));
    }
    setEditingLabel(null);
  }

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {groups.map(group => (
          <div key={group.id} className="card" style={{ padding: '18px 20px' }}>
            {/* Group header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              {editingLabel === group.id ? (
                <input
                  className="input-field"
                  style={{ fontSize: 12, padding: '4px 8px', flex: 1 }}
                  value={labelDraft}
                  autoFocus
                  onChange={e => setLabelDraft(e.target.value)}
                  onBlur={() => commitLabel(group.id)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') commitLabel(group.id);
                    if (e.key === 'Escape') setEditingLabel(null);
                  }}
                />
              ) : (
                <button
                  className="skill-group-label"
                  onClick={() => { setEditingLabel(group.id); setLabelDraft(group.label); }}
                  title="Click to rename"
                >
                  {group.label}
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ marginLeft: 4, opacity: 0.4 }}>
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
              )}
              <div style={{ flex: 1 }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>
                {group.skills.length} skill{group.skills.length !== 1 ? 's' : ''}
              </span>
              <button
                onClick={() => removeGroup(group.id)}
                className="btn btn-ghost btn-sm"
                style={{ color: 'var(--text-muted)', padding: '2px 6px', fontSize: 11 }}
                title="Remove group"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                  <path d="M10 11v6"/><path d="M14 11v6"/>
                </svg>
              </button>
            </div>

            {/* Skill chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
              {group.skills.map(skill => (
                <SkillChip
                  key={skill}
                  skill={skill}
                  groupId={group.id}
                  allGroups={groups}
                  onRemove={() => removeSkill(group.id, skill)}
                  onMove={targetId => moveSkill(group.id, targetId, skill)}
                />
              ))}
              {group.skills.length === 0 && (
                <span style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  No skills — type below to add
                </span>
              )}
            </div>

            {/* Add skill input */}
            <input
              className="input-field"
              style={{ fontSize: 13 }}
              value={inputs[group.id] ?? ''}
              onChange={e => setInputs(prev => ({ ...prev, [group.id]: e.target.value }))}
              placeholder="Type a skill + Enter to add..."
              onKeyDown={e => {
                if ((e.key === 'Enter' || e.key === ',') && (inputs[group.id] ?? '').trim()) {
                  e.preventDefault();
                  addSkill(group.id, inputs[group.id]);
                }
              }}
            />
          </div>
        ))}
      </div>

      {/* Footer controls */}
      <div style={{ display: 'flex', gap: 10, marginTop: 16, alignItems: 'center' }}>
        <button className="btn btn-ghost btn-sm" onClick={addGroup} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add Group
        </button>
        <div style={{ flex: 1 }} />
        <button className="btn btn-primary" onClick={onSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save Skills'}
        </button>
      </div>
    </div>
  );
}
