'use client';

import { useState, useRef } from 'react';
import type { SkillGroup } from '@/lib/entries';

export const DEFAULT_SKILL_GROUPS: Omit<SkillGroup, 'id' | 'user_id' | 'created_at' | 'updated_at'>[] = [
  { label: 'Languages',              skills: [], sort_order: 0 },
  { label: 'Frameworks & Libraries', skills: [], sort_order: 1 },
  { label: 'Testing & DevOps',       skills: [], sort_order: 2 },
  { label: 'Cloud & Databases',      skills: [], sort_order: 3 },
  { label: 'AI / ML & Data',         skills: [], sort_order: 4 },
  { label: 'Tools & Productivity',   skills: [], sort_order: 5 },
  { label: 'Other',                  skills: [], sort_order: 6 },
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

interface Props {
  groups: SkillGroup[];
  onChange: (groups: SkillGroup[]) => void;
  saving: boolean;
  onSave: () => void;
}

export default function SkillsEditor({ groups, onChange, saving, onSave }: Props) {
  const [inputs, setInputs]             = useState<Record<string, string>>({});
  const [editingLabel, setEditingLabel]  = useState<string | null>(null);
  const [labelDraft, setLabelDraft]     = useState('');
  const [editingChip, setEditingChip]   = useState<{ groupId: string; skill: string; value: string } | null>(null);

  // Drag state
  const dragSkill   = useRef<string | null>(null);
  const dragFromId  = useRef<string | null>(null);
  const [overGroupId, setOverGroupId] = useState<string | null>(null);

  /* ── Drag handlers ── */
  function onDragStart(skill: string, groupId: string) {
    dragSkill.current  = skill;
    dragFromId.current = groupId;
  }

  function onDragOver(e: React.DragEvent, groupId: string) {
    e.preventDefault();
    setOverGroupId(groupId);
  }

  function onDrop(e: React.DragEvent, toGroupId: string) {
    e.preventDefault();
    setOverGroupId(null);
    const skill  = dragSkill.current;
    const fromId = dragFromId.current;
    if (!skill || !fromId || fromId === toGroupId) return;

    onChange(groups.map(g => {
      if (g.id === fromId) return { ...g, skills: g.skills.filter(s => s !== skill) };
      if (g.id === toGroupId && !g.skills.includes(skill)) return { ...g, skills: [...g.skills, skill] };
      return g;
    }));

    dragSkill.current  = null;
    dragFromId.current = null;
  }

  function onDragEnd() {
    setOverGroupId(null);
    dragSkill.current  = null;
    dragFromId.current = null;
  }

  /* ── Skill CRUD ── */
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

  function commitChipEdit() {
    if (!editingChip) return;
    const newVal = editingChip.value.trim();
    if (newVal && newVal !== editingChip.skill) {
      onChange(groups.map(g =>
        g.id === editingChip.groupId
          ? { ...g, skills: g.skills.map(s => s === editingChip.skill ? newVal : s) }
          : g
      ));
    }
    setEditingChip(null);
  }

  /* ── Group CRUD ── */
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
    setEditingLabel(newGroup.id);
    setLabelDraft('New Group');
  }

  function removeGroup(groupId: string) {
    onChange(groups.filter(g => g.id !== groupId));
  }

  function commitLabel(groupId: string) {
    const draft = labelDraft.trim();
    if (draft) onChange(groups.map(g => g.id === groupId ? { ...g, label: draft } : g));
    setEditingLabel(null);
  }

  return (
    <div>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
        Drag skills between groups to reorganize. Click a group label to rename it.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {groups.map(group => (
          <div
            key={group.id}
            className={`skill-group-drop-zone ${overGroupId === group.id ? 'drop-active' : ''}`}
            onDragOver={e => onDragOver(e, group.id)}
            onDrop={e => onDrop(e, group.id)}
            onDragLeave={() => setOverGroupId(null)}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              {editingLabel === group.id ? (
                <input
                  className="input-field"
                  style={{ fontSize: 12, padding: '4px 8px', flex: 1, height: 28 }}
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
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ opacity: 0.35 }}>
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
              )}
              <div style={{ flex: 1 }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>
                {group.skills.length}
              </span>
              <button
                onClick={() => removeGroup(group.id)}
                className="btn btn-ghost btn-sm"
                style={{ color: 'var(--text-muted)', padding: '2px 4px' }}
                title="Remove group"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                  <path d="M10 11v6"/><path d="M14 11v6"/>
                </svg>
              </button>
            </div>

            {/* Chips */}
            <div className="skill-chip-area">
              {group.skills.length === 0 && (
                <span className="skill-drop-hint">
                  {overGroupId === group.id ? 'Drop here' : 'Drag a skill here or type below'}
                </span>
              )}
              {group.skills.map(skill => (
                editingChip?.groupId === group.id && editingChip?.skill === skill ? (
                  // Inline edit mode
                  <span key={skill} className="skill-chip-draggable" style={{ padding: '2px 6px' }}>
                    <input
                      autoFocus
                      value={editingChip.value}
                      onChange={e => setEditingChip(prev => prev ? { ...prev, value: e.target.value } : null)}
                      onBlur={commitChipEdit}
                      onKeyDown={e => {
                        if (e.key === 'Enter') { e.preventDefault(); commitChipEdit(); }
                        if (e.key === 'Escape') setEditingChip(null);
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        outline: 'none',
                        color: 'var(--accent)',
                        fontSize: 12,
                        fontWeight: 500,
                        width: Math.max(60, editingChip.value.length * 8),
                        fontFamily: 'inherit',
                      }}
                    />
                  </span>
                ) : (
                <span
                  key={skill}
                  className="skill-chip-draggable"
                  draggable
                  onDragStart={() => onDragStart(skill, group.id)}
                  onDragEnd={onDragEnd}
                  onDoubleClick={() => setEditingChip({ groupId: group.id, skill, value: skill })}
                  title="Drag to move · Double-click to edit"
                >
                  {/* Drag handle */}
                  <svg
                    className="drag-handle"
                    width="8" height="12" viewBox="0 0 8 12" fill="currentColor"
                    style={{ opacity: 0.3, flexShrink: 0 }}
                  >
                    <circle cx="2" cy="2" r="1.2"/><circle cx="6" cy="2" r="1.2"/>
                    <circle cx="2" cy="6" r="1.2"/><circle cx="6" cy="6" r="1.2"/>
                    <circle cx="2" cy="10" r="1.2"/><circle cx="6" cy="10" r="1.2"/>
                  </svg>
                  {skill}
                  <button
                    type="button"
                    onClick={() => removeSkill(group.id, skill)}
                    aria-label={`Remove ${skill}`}
                    className="chip-remove-btn"
                  >
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </span>
                )
              ))}
            </div>

            {/* Add input */}
            <input
              className="input-field"
              style={{ fontSize: 13, marginTop: 8 }}
              value={inputs[group.id] ?? ''}
              onChange={e => setInputs(prev => ({ ...prev, [group.id]: e.target.value }))}
              placeholder="Type a skill + Enter..."
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

      {/* Footer */}
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
