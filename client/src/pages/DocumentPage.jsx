import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, CalendarDays, Check, CircleUserRound, Clock3, MessageSquareText, RefreshCw, UserRound } from 'lucide-react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { ActionDialog } from '../components/ActionDialog.jsx';
import { LoadingState } from '../components/LoadingState.jsx';
import { Notice } from '../components/Notice.jsx';
import { ProgressTracker } from '../components/ProgressTracker.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import {
  formatDateTime,
  getMilestoneIndex,
  getRoleLabel,
  STATUS_DESCRIPTIONS,
  STATUS_LABELS,
  WORKFLOW_MILESTONES,
} from '../utils/presentation.js';

export function DocumentPage() {
  const { id } = useParams();
  const location = useLocation();
  const [document, setDocument] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(location.state?.message || '');
  const [live, setLive] = useState(false);
  const [selectedAction, setSelectedAction] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [updateError, setUpdateError] = useState('');

  const loadDocument = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [documentResult, historyResult] = await Promise.all([
        api.document(id),
        api.history(id),
      ]);
      setDocument(documentResult);
      setHistory(historyResult);
      setError('');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadDocument();
  }, [loadDocument]);

  useEffect(() => {
    const source = new EventSource(`/api/documents/${id}/events`);
    source.addEventListener('document', () => {
      setLive(true);
      loadDocument(true);
    });
    source.onopen = () => setLive(true);
    source.onerror = () => setLive(false);
    return () => source.close();
  }, [id, loadDocument]);

  async function handleStatusUpdate(remarks) {
    setSubmitting(true);
    setUpdateError('');
    try {
      const updated = await api.updateStatus(document.id, {
        status: selectedAction.status,
        remarks,
        version: document.version,
      });
      setDocument(updated);
      setSelectedAction(null);
      setSuccess(`Status updated to ${STATUS_LABELS[updated.status]}.`);
      const nextHistory = await api.history(id);
      setHistory(nextHistory);
    } catch (requestError) {
      setUpdateError(requestError.message);
      if (requestError.code === 'DOCUMENT_VERSION_CONFLICT') {
        loadDocument(true);
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingState rows={5} />;
  if (error || !document) {
    return (
      <div className="center-state">
        <Notice type="error" message={error || 'Document not found.'} />
        <Link className="button button--dark" to="/"><ArrowLeft size={18} /> Return to dashboard</Link>
      </div>
    );
  }

  return (
    <div className="document-page">
      <Link className="back-link" to="/"><ArrowLeft size={17} /> Back to dashboard</Link>
      <div className="document-hero">
        <div>
          <div className="document-hero__meta">
            <span>RES-{String(document.id).padStart(5, '0')}</span>
            <StatusBadge status={document.status} />
          </div>
          <h2>{document.title}</h2>
          <p>{STATUS_DESCRIPTIONS[document.status]}</p>
        </div>
        <div className={`connection-state ${live ? 'connection-state--online' : ''}`}>
          <span /> {live ? 'Live updates on' : 'Reconnecting…'}
        </div>
      </div>

      <Notice type="success" message={success} onDismiss={() => setSuccess('')} />

      {document.availableActions.length > 0 && (
        <section className="action-panel" aria-labelledby="available-actions-title">
          <div>
            <p className="eyebrow">Next workflow action</p>
            <h2 id="available-actions-title">Move this request forward</h2>
            <p>Only valid next steps for your role are shown. Every decision is written to the history.</p>
          </div>
          <div className="action-panel__buttons">
            {document.availableActions.map((action) => (
              <button
                type="button"
                className="button button--lime"
                key={action.status}
                onClick={() => {
                  setUpdateError('');
                  setSelectedAction(action);
                }}
              >
                {action.status === 'ENDORSED_TO_ADMIN' ? 'Endorse to admin' : action.label}
              </button>
            ))}
          </div>
        </section>
      )}

      <ProgressTracker status={document.status} />

      <div className="document-grid">
        <section className="content-panel document-description">
          <div className="section-heading section-heading--compact">
            <div><p className="eyebrow">Request details</p><h2>Description</h2></div>
          </div>
          <p className="description-text">{document.description}</p>
          <dl className="detail-grid">
            <div>
              <dt><UserRound size={17} /> Student</dt>
              <dd>{document.studentName}<small>{document.studentEmail}</small></dd>
            </div>
            <div>
              <dt><CircleUserRound size={17} /> Professor</dt>
              <dd>{document.professorName}<small>{document.professorEmail}</small></dd>
            </div>
            <div>
              <dt><CalendarDays size={17} /> Submitted</dt>
              <dd>{formatDateTime(document.createdAt)}</dd>
            </div>
            <div>
              <dt><RefreshCw size={17} /> Last updated</dt>
              <dd>{formatDateTime(document.updatedAt)}</dd>
            </div>
          </dl>
        </section>

        <aside className="requirements-card">
          <div>
            <p className="eyebrow">Requirements</p>
            <h2>Workflow completion</h2>
          </div>
          <ul>
            {WORKFLOW_MILESTONES.map((requirement, index) => {
              const currentIndex = getMilestoneIndex(document.status);
              const complete = index <= currentIndex;
              return (
                <li className={complete ? 'is-complete' : ''} key={requirement}>
                  <span>{complete ? <Check size={15} /> : index + 1}</span>
                  {requirement}
                </li>
              );
            })}
          </ul>
          <div className="requirements-card__footer">
            <Clock3 size={18} />
            <span>Version {document.version} · Updated {formatDateTime(document.updatedAt)}</span>
          </div>
        </aside>
      </div>

      <section className="history-panel" aria-labelledby="history-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Immutable activity record</p>
            <h2 id="history-title">History log</h2>
          </div>
          <span>{history.length} event{history.length === 1 ? '' : 's'}</span>
        </div>
        <ol className="history-timeline">
          {history.map((entry, index) => (
            <li key={entry.id}>
              <div className="history-timeline__marker"><Check size={15} /></div>
              <div className="history-timeline__content">
                <div className="history-timeline__topline">
                  <div>
                    <strong>{entry.previousStatus
                      ? `${STATUS_LABELS[entry.previousStatus]} → ${STATUS_LABELS[entry.newStatus]}`
                      : 'Request submitted'}</strong>
                    <span>by {entry.updatedByName} · {getRoleLabel(entry.updatedByRole)}</span>
                  </div>
                  <time dateTime={entry.timestamp}>{formatDateTime(entry.timestamp)}</time>
                </div>
                {entry.remarks && (
                  <div className="history-timeline__remark">
                    <MessageSquareText size={16} />
                    <p>{entry.remarks}</p>
                  </div>
                )}
              </div>
              {index < history.length - 1 && <span className="history-timeline__line" aria-hidden="true" />}
            </li>
          ))}
        </ol>
      </section>

      <ActionDialog
        key={selectedAction?.status || 'closed'}
        action={selectedAction}
        documentTitle={document.title}
        error={updateError}
        onClose={() => !submitting && setSelectedAction(null)}
        onConfirm={handleStatusUpdate}
        submitting={submitting}
      />
    </div>
  );
}
