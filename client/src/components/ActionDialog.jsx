import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { STATUS_DESCRIPTIONS } from '../utils/presentation.js';
import { Notice } from './Notice.jsx';

export function ActionDialog({ action, documentTitle, error, onClose, onConfirm, submitting }) {
  const [remarks, setRemarks] = useState('');
  const textareaRef = useRef(null);

  useEffect(() => {
    function closeOnEscape(event) {
      if (event.key === 'Escape' && !submitting) onClose();
    }
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [onClose, submitting]);

  if (!action) return null;

  function handleSubmit(event) {
    event.preventDefault();
    onConfirm(remarks.trim() || null);
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !submitting) onClose();
    }}>
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="action-dialog-title">
        <div className="modal__header">
          <div>
            <p className="eyebrow">Confirm workflow action</p>
            <h2 id="action-dialog-title">Move to “{action.label}”?</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose} disabled={submitting} aria-label="Close dialog">
            <X size={20} />
          </button>
        </div>
        <div className="modal__body">
          <Notice type="error" message={error} />
          <p className="modal__document">{documentTitle}</p>
          <p>{STATUS_DESCRIPTIONS[action.status]}</p>
          <label className="field">
            <span>Remarks <span className="field__optional">Optional</span></span>
            <textarea
              ref={textareaRef}
              autoFocus
              rows="4"
              maxLength="2000"
              value={remarks}
              onChange={(event) => setRemarks(event.target.value)}
              placeholder="Add context for the student and the next reviewer..."
            />
            <small>{remarks.length}/2000</small>
          </label>
        </div>
        <div className="modal__footer">
          <button type="button" className="button button--ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" form="status-action-form" className="button button--dark" disabled={submitting}>
            {submitting ? 'Updating…' : `Confirm ${action.label}`}
          </button>
        </div>
        <form id="status-action-form" onSubmit={handleSubmit} />
      </section>
    </div>
  );
}
