"use client";

import { useState, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useDroppable } from "@dnd-kit/core";
import { useTailorStore } from "@/lib/tailorStore";
import WordBudget from "./WordBudget";

const API_URL = "/api/pipeline/step";

/**
 * LaTeX skill line character budget.
 * The resume template uses \small (~9.5pt) on US letter with ~190mm text width.
 * After the bold label (e.g. "Languages: "), skill items get roughly 80 chars
 * before LaTeX wraps to a second line. We use 80 as the safe limit.
 */
const SKILL_LINE_CHAR_LIMIT = 90;

/** Count chars for a skill line: items joined by ", " */
function countSkillLineChars(items: string[]): number {
  return items.join(", ").length;
}

/** Capitalize first letter of each word */
function capitalizeSkill(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

/* ── Draggable Skill Chip ─────────────────────────── */

function SortableSkillChip({
  id,
  label,
  variant,
  onRemove,
  onRename,
}: {
  id: string;
  label: string;
  variant: "active" | "available" | "suggested";
  onRemove?: () => void;
  onRename?: (newName: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(label);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  if (editing && onRename) {
    return (
      <div ref={setNodeRef} style={style} className="skill-chip skill-chip-active">
        <input
          className="skill-chip-edit-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            if (draft.trim() && draft.trim() !== label) onRename(draft.trim());
            setEditing(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              if (draft.trim() && draft.trim() !== label) onRename(draft.trim());
              setEditing(false);
            }
            if (e.key === "Escape") {
              setDraft(label);
              setEditing(false);
            }
          }}
          autoFocus
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`skill-chip skill-chip-${variant} ${isDragging ? "dragging" : ""}`}
      onDoubleClick={(e) => {
        e.preventDefault();
        if (onRename) {
          setDraft(label);
          setEditing(true);
        }
      }}
    >
      <span className="skill-chip-grip">⠿</span>
      {label}
      {onRemove && (
        <button
          className="skill-chip-x"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          ×
        </button>
      )}
    </div>
  );
}

/* ── Static chip for DragOverlay ───────────────────── */

function OverlayChip({ label }: { label: string }) {
  return (
    <div className="skill-chip skill-chip-active skill-chip-overlay">
      <span className="skill-chip-grip">⠿</span>
      {label}
    </div>
  );
}

/* ── Droppable zone wrapper ────────────────────────── */

function DroppableZone({
  id,
  children,
  className,
}: {
  id: string;
  children: React.ReactNode;
  className?: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`${className || ""} ${isOver ? "drop-target-active" : ""}`}
    >
      {children}
    </div>
  );
}

/* ── Editable row label ────────────────────────────── */

function EditableLabel({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  if (editing) {
    return (
      <input
        className="skill-row-label-input"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          onChange(draft);
          setEditing(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            onChange(draft);
            setEditing(false);
          }
          if (e.key === "Escape") {
            setDraft(value);
            setEditing(false);
          }
        }}
        autoFocus
      />
    );
  }

  return (
    <button className="skill-row-label" onClick={() => setEditing(true)}>
      {value} <span className="skill-row-edit-icon">✎</span>
    </button>
  );
}

/* ── Inline new-skill input ────────────────────────── */

function AddSkillInline({
  onAdd,
}: {
  onAdd: (skill: string) => void;
}) {
  const [active, setActive] = useState(false);
  const [value, setValue] = useState("");

  if (!active) {
    return (
      <button
        className="skill-add-inline"
        onClick={() => setActive(true)}
      >
        +
      </button>
    );
  }

  return (
    <input
      className="skill-add-input"
      placeholder="Type skill..."
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => {
        if (value.trim()) onAdd(value.trim());
        setValue("");
        setActive(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" && value.trim()) {
          onAdd(value.trim());
          setValue("");
          setActive(false);
        }
        if (e.key === "Escape") {
          setValue("");
          setActive(false);
        }
      }}
      autoFocus
    />
  );
}

/* ── Main StepSkills ───────────────────────────────── */

export default function StepSkills() {
  const {
    skillRows,
    availableSkills,
    suggestedSkills,
    loading,
    loadingMessage,
    parsedJD,
    currentStep,
    setSkillRows,
    moveSkill,
    addSkillRow,
    removeSkillRow,
    moveSkillRow,
    renameSkillRow,
    addCustomSkill,
    setLoading,
    setEntries,
    advanceStep,
  } = useTailorStore();

  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  /* Find which container a skill lives in */
  const findContainer = useCallback(
    (skillId: string): string | null => {
      if (availableSkills.includes(skillId)) return "available";
      if (suggestedSkills.includes(skillId)) return "suggested";
      for (const row of skillRows) {
        if (row.items.includes(skillId)) return row.id;
      }
      return null;
    },
    [availableSkills, suggestedSkills, skillRows]
  );

  /* Get the display label (skill name) for any item id */
  const getLabel = (id: string) => id; // skills are their own labels

  /* ── Drag handlers ─────────────────────────────── */

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeSkill = active.id as string;
    const overId = over.id as string;

    const fromContainer = findContainer(activeSkill);

    // Determine target container
    let toContainer: string | null = null;
    if (overId === "available" || overId === "suggested") {
      toContainer = overId;
    } else {
      const isRowId = skillRows.some((r) => r.id === overId);
      if (isRowId) {
        toContainer = overId;
      } else {
        toContainer = findContainer(overId);
      }
    }

    if (!fromContainer || !toContainer || fromContainer === toContainer) return;

    // Atomic move — single store update, no race condition
    moveSkill(activeSkill, fromContainer, toContainer);
  };

  /* ── Skill helpers ──────────────────────────── */

  const removeSkillFromRow = (skill: string, rowId: string) => {
    moveSkill(skill, rowId, "available");
  };

  const renameSkillInRow = (oldName: string, newName: string, rowId: string) => {
    setSkillRows(
      skillRows.map((r) =>
        r.id === rowId
          ? { ...r, items: r.items.map((s) => (s === oldName ? newName : s)) }
          : r
      )
    );
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeSkill = active.id as string;
    const overId = over.id as string;

    const container = findContainer(activeSkill);
    if (!container) return;

    // Reorder within same container
    if (container !== "available" && container !== "suggested") {
      const row = skillRows.find((r) => r.id === container);
      if (row && row.items.includes(overId)) {
        const oldIndex = row.items.indexOf(activeSkill);
        const newIndex = row.items.indexOf(overId);
        if (oldIndex !== newIndex) {
          setSkillRows(
            skillRows.map((r) =>
              r.id === container
                ? { ...r, items: arrayMove(r.items, oldIndex, newIndex) }
                : r
            )
          );
        }
      }
    }
  };

  /* ── Continue → select entries ──────────────── */

  const handleContinue = async () => {
    setLoading(true, "Selecting best entries for your resume...");
    advanceStep(); // → step 3 (Entries), shows loading there

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: "select-entries",
          parsed_jd: parsedJD,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setEntries(data.all_entries, data.confirmed_entries);
      // Don't auto-advance — let user review and modify entries
    } catch (err) {
      console.error("Select entries failed:", err);
    } finally {
      setLoading(false);
    }
  };

  /* ── Loading state ──────────────────────────── */

  if (loading && skillRows.length === 0) {
    return (
      <div className="step-inner step-loading">
        <div className="loading-spinner" />
        <p className="loading-text">{loadingMessage}</p>
      </div>
    );
  }

  const isReadOnly = currentStep > 2;
  const totalPlaced = skillRows.reduce((sum, r) => sum + r.items.length, 0);

  return (
    <div className="step-inner step-skills">
      <WordBudget />

      <div className="step-header-bar">
        <div>
          <h2 className="step-title">Arrange Skills</h2>
          <p className="step-desc">
            {totalPlaced} skills placed across {skillRows.length} categories.
            Drag to rearrange, + to add.
          </p>
        </div>
        {!isReadOnly && (
          <button
            className="step-cta"
            onClick={handleContinue}
            disabled={totalPlaced === 0}
          >
            Continue with {totalPlaced} skills →
          </button>
        )}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        {/* ── Available skills (top pool) ── */}
        <div className="skills-zone skills-zone-available">
          <div className="skills-zone-label">Available Skills</div>
          <DroppableZone id="available" className="skills-chip-area">
            <SortableContext
              items={availableSkills}
              strategy={horizontalListSortingStrategy}
            >
              {availableSkills.map((skill) => (
                <SortableSkillChip
                  key={skill}
                  id={skill}
                  label={skill}
                  variant="available"
                />
              ))}
            </SortableContext>
            {availableSkills.length === 0 && (
              <span className="skills-empty">All skills placed ✓</span>
            )}
          </DroppableZone>
        </div>

        {/* ── Active skill rows (middle) ── */}
        <div className="skills-zone skills-zone-active">
          <div className="skills-zone-label">Your Resume Skills</div>
          {skillRows.map((row, rowIndex) => (
            <div key={row.id} className="skill-row">
              <div className="skill-row-left">
                {!isReadOnly && (
                  <div className="skill-row-arrows">
                    <button
                      className="skill-row-arrow"
                      onClick={() => moveSkillRow(row.id, 'up')}
                      disabled={rowIndex === 0}
                      title="Move up"
                    >▲</button>
                    <button
                      className="skill-row-arrow"
                      onClick={() => moveSkillRow(row.id, 'down')}
                      disabled={rowIndex === skillRows.length - 1}
                      title="Move down"
                    >▼</button>
                  </div>
                )}
                <EditableLabel
                  value={row.label}
                  onChange={(v) => renameSkillRow(row.id, v)}
                />
              </div>
              <DroppableZone
                id={row.id}
                className="skill-row-right"
              >
                <SortableContext
                  items={row.items}
                  strategy={horizontalListSortingStrategy}
                >
                  {row.items.map((skill) => (
                    <SortableSkillChip
                      key={skill}
                      id={skill}
                      label={capitalizeSkill(skill)}
                      variant="active"
                      onRemove={!isReadOnly ? () => removeSkillFromRow(skill, row.id) : undefined}
                      onRename={!isReadOnly ? (newName) => renameSkillInRow(skill, newName, row.id) : undefined}
                    />
                  ))}
                </SortableContext>
                {!isReadOnly && (
                  <AddSkillInline
                    onAdd={(skill) => addCustomSkill(row.id, skill)}
                  />
                )}
              </DroppableZone>
              {/* Character counter */}
              {(() => {
                const charCount = countSkillLineChars(row.items);
                const pct = Math.round((charCount / SKILL_LINE_CHAR_LIMIT) * 100);
                const colorClass = pct > 100 ? 'over' : pct > 85 ? 'warn' : 'safe';
                return (
                  <div className={`skill-row-chars ${colorClass}`} title={`${charCount} / ${SKILL_LINE_CHAR_LIMIT} chars — line will wrap if exceeded`}>
                    {charCount}/{SKILL_LINE_CHAR_LIMIT}
                  </div>
                );
              })()}
              {!isReadOnly && (
                <button
                  className="skill-row-remove"
                  onClick={() => removeSkillRow(row.id)}
                  title="Remove row"
                >
                  −
                </button>
              )}
            </div>
          ))}
          {!isReadOnly && (
            <button className="skill-row-add" onClick={addSkillRow}>
              + Add Category
            </button>
          )}
        </div>

        {/* ── Suggested skills (bottom) ── */}
        {suggestedSkills.length > 0 && (
          <div className="skills-zone skills-zone-suggested">
            <div className="skills-zone-label">
              AI Suggested — drag up to add
            </div>
            <DroppableZone id="suggested" className="skills-chip-area">
              <SortableContext
                items={suggestedSkills}
                strategy={horizontalListSortingStrategy}
              >
                {suggestedSkills.map((skill) => (
                  <SortableSkillChip
                    key={skill}
                    id={skill}
                    label={capitalizeSkill(skill)}
                    variant="suggested"
                  />
                ))}
              </SortableContext>
            </DroppableZone>
          </div>
        )}

        {/* ── Drag overlay (floating chip) ── */}
        <DragOverlay>
          {activeId ? <OverlayChip label={getLabel(activeId)} /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
