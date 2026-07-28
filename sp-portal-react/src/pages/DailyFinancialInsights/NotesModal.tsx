import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useModalBehavior } from '../../hooks/useModalBehavior';
import {
  MOCK_NOTES,
  PAYMENT_MODE_LABEL,
  formatDateLong,
  type Row,
} from '../../data/dfiData';

/**
 * Dedicated modal for reading and managing a register's note.
 *
 * The Notes column used to be a bare icon with a `title` tooltip: the text was
 * only reachable by hovering, truncated by the browser's tooltip, unreachable
 * by keyboard, and not editable without opening the full Add/Edit Register
 * form. This owns that job instead — it opens in read mode when a note exists
 * and straight in edit mode when there isn't one yet.
 *
 * Purely controlled: it holds the draft while open, and hands the final text
 * back through `onSave`. The page remains the single owner of the mock row
 * store, so saving here goes through exactly the same path as the Add/Edit
 * form and picks up the same re-render.
 */

const MAX_LENGTH = 500;

interface NotesModalProps {
  row: Row;
  onClose: () => void;
  onSave: (operationId: string, notes: string) => void;
}

export function NotesModal({ row, onClose, onSave }: NotesModalProps) {
  const original = row.notes || '';
  const [draft, setDraft] = useState(original);
  const [editing, setEditing] = useState(!original);
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useModalBehavior(onClose);

  useEffect(() => {
    if (editing) textareaRef.current?.focus();
  }, [editing]);

  const trimmed = draft.trim();
  const dirty = trimmed !== original.trim();

  const handleSave = useCallback(() => {
    onSave(row.operationId, trimmed);
    onClose();
  }, [onSave, onClose, row.operationId, trimmed]);

  function handleRemove() {
    if (!confirmingRemove) {
      setConfirmingRemove(true);
      return;
    }
    onSave(row.operationId, '');
    onClose();
  }

  // Ctrl/Cmd+Enter saves from inside the textarea, the usual shortcut for a
  // multi-line field where plain Enter has to stay as a newline.
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
  }

  function applyPreset(preset: string) {
    setDraft((current) => {
      const base = current.trim();
      return base ? `${base}\n${preset}` : preset;
    });
    setEditing(true);
  }

  const contextChips: { label: string; value: string }[] = [
    { label: 'Date', value: formatDateLong(row.date) },
    { label: 'Vendor', value: row.courier || '--' },
    { label: 'Route', value: row.route || '--' },
    { label: 'VRN', value: row.vrm || '--' },
    { label: 'Payment', value: PAYMENT_MODE_LABEL[row.paymentMode] || row.paymentMode || '--' },
  ];

  return createPortal(
    <div
      className="dom-modal-backdrop sp-modal-backdrop-anim"
      id="notesModalBackdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="dom-modal dfi-note-modal sp-modal-anim" role="dialog" aria-modal="true" aria-labelledby="notesModalTitle">
        <div className="dom-modal-header">
          <h2 className="dom-modal-title" id="notesModalTitle">
            <i className="bi bi-sticky-fill dfi-note-modal-title-icon" aria-hidden="true" />
            {editing ? (original ? 'Edit note' : 'Add note') : 'Register note'}
          </h2>
          <button type="button" className="dom-modal-close" aria-label="Close" onClick={onClose}>
            <i className="bi bi-x-lg" />
          </button>
        </div>

        <div className="dom-modal-body dfi-note-modal-body">
          <dl className="dfi-note-context">
            {contextChips.map((chip) => (
              <div className="dfi-note-context-item" key={chip.label}>
                <dt>{chip.label}</dt>
                <dd>{chip.value}</dd>
              </div>
            ))}
          </dl>

          {editing ? (
            <div className="dfi-note-editor">
              <label className="dom-form-label" htmlFor="notesModalTextarea">
                Note
              </label>
              <textarea
                id="notesModalTextarea"
                ref={textareaRef}
                className="dfi-note-textarea"
                rows={5}
                maxLength={MAX_LENGTH}
                placeholder="What happened on this route? e.g. vehicle arrived late, extra stop agreed with the depot…"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <div className="dfi-note-editor-meta">
                <span className="dfi-note-hint">
                  Press <kbd>Ctrl</kbd>+<kbd>Enter</kbd> to save
                </span>
                <span className={`dfi-note-counter${draft.length >= MAX_LENGTH ? ' is-full' : ''}`}>
                  {draft.length}/{MAX_LENGTH}
                </span>
              </div>

              {/* The same canned notes the mock generator draws from, so a
                  hand-added note reads like the seeded ones. */}
              <div className="dfi-note-presets">
                <span className="dfi-note-presets-label">Quick add</span>
                <div className="dfi-note-presets-list">
                  {MOCK_NOTES.map((preset) => (
                    <button type="button" className="dfi-note-preset" key={preset} onClick={() => applyPreset(preset)}>
                      <i className="bi bi-plus" aria-hidden="true" /> {preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <blockquote className="dfi-note-readonly">{original}</blockquote>
          )}
        </div>

        <div className="dom-form-actions dfi-note-modal-actions">
          {original && (
            <button
              type="button"
              className={`styled-button ${confirmingRemove ? 'styled-button--danger' : 'styled-button--outline'} dfi-note-remove`}
              onClick={handleRemove}
              onBlur={() => setConfirmingRemove(false)}
            >
              <i className="bi bi-trash" aria-hidden="true" /> {confirmingRemove ? 'Confirm remove' : 'Remove note'}
            </button>
          )}
          <button type="button" className="styled-button styled-button--outline" onClick={onClose}>
            {editing ? 'Cancel' : 'Close'}
          </button>
          {editing ? (
            <button type="button" className="styled-button styled-button--primary" onClick={handleSave} disabled={!dirty}>
              Save note
            </button>
          ) : (
            <button type="button" className="styled-button styled-button--primary" onClick={() => setEditing(true)}>
              <i className="bi bi-pencil" aria-hidden="true" /> Edit
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
