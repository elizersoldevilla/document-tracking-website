import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUpRight,
  CalendarDays,
  Check,
  FileText,
  Hash,
  Info,
  Search,
  Send,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { Avatar } from '../components/Avatar.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { LoadingState } from '../components/LoadingState.jsx';
import { Notice } from '../components/Notice.jsx';
import { useAuth } from '../auth/AuthContext.js';
import { useActivity } from '../hooks/useActivity.js';
import { useDocuments } from '../hooks/useDocuments.js';
import { StudentDashboard } from '../pages/StudentDashboard.jsx';
import {
  formatTime,
  getReadIds,
  isRemarkEvent,
  markEventRead,
} from '../utils/activity.js';
import { formatDate, STATUS_DESCRIPTIONS, STATUS_LABELS } from '../utils/presentation.js';

function shortDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const day = new Intl.DateTimeFormat('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  }).format(date);
  const time = new Intl.DateTimeFormat('en-US', { timeStyle: 'short' }).format(date);
  return `${day} | ${time}`;
}

export function ActionCenterPage() {
  return (
    <div className="dashboard-stack hub-page">
      <div className="hub-ghost" aria-hidden="true">
        <StudentDashboard />
      </div>
      <nav className="hub-menu" aria-label="Action Center sections">
        <Link className="hub-pill" to="/action-center/decisions">
          <strong>Decision Hub</strong>
          <span className="hub-pill__arrow" aria-hidden="true"><ArrowUpRight size={16} /></span>
        </Link>
        <Link className="hub-pill" to="/action-center/revisions">
          <strong>Revision Desk</strong>
          <span className="hub-pill__arrow" aria-hidden="true"><ArrowUpRight size={16} /></span>
        </Link>
        <Link className="hub-pill" to="/action-center/messages">
          <strong>Message Center</strong>
          <span className="hub-pill__arrow" aria-hidden="true"><ArrowUpRight size={16} /></span>
        </Link>
      </nav>
    </div>
  );
}

export function DecisionHubPage() {
  const documents = useDocuments({ limit: 50 });
  const latest = documents.items.reduce(
    (newest, item) => (!newest || new Date(item.updatedAt) > new Date(newest.updatedAt) ? item : newest),
    null,
  );

  return (
    <div className="dashboard-stack ac-sub">
      <h1 className="page-title page-title--caps">Decision Hub</h1>

      <Notice type="error" message={documents.error} onDismiss={documents.refresh} />

      {documents.loading ? (
        <LoadingState />
      ) : !latest ? (
        <EmptyState
          title="No decision yet"
          description="Decisions recorded by your professor and the admin office will appear here."
          action={<Link className="button button--dark" to="/requests/new">Create request</Link>}
        />
      ) : (
        <>
          <section className="decision-card">
            <div className="decision-card__top">
              <span className="decision-card__icon"><FileText size={22} /></span>
              <div className="decision-card__headings">
                <p className="decision-card__ref">Application ID: RES-{String(latest.id).padStart(5, '0')}</p>
                <span className="status-chip">
                  <span className="status-chip__check"><Check size={11} strokeWidth={3} /></span>
                  {STATUS_LABELS[latest.status]}
                </span>
              </div>
            </div>
          </section>

          <div className="decision-meta">
            <div className="decision-meta__cell">
              <p>Review Type:</p>
              <strong>Expedited Review</strong>
              <small className="decision-meta__window"><CalendarDays size={14} /> 14 days of completion</small>
            </div>
            <div className="decision-meta__cell">
              <p>Assigned Panel:</p>
              <strong>{latest.professorName || 'To be assigned'}</strong>
            </div>
          </div>

          <p className="info-banner">
            <span className="info-banner__icon"><Info size={15} /></span>
            <span>{STATUS_DESCRIPTIONS[latest.status]}</span>
          </p>

          <div className="followup-row">
            <span className="followup-pill">FOLLOW-UP</span>
            <p>Follow-up option unlocks if the review exceeds the given target window.</p>
          </div>

          <article className="certificate-card">
            <span className="certificate-card__icon"><FileText size={20} /></span>
            <div>
              <strong>Certificate of Ethics Clearance</strong>
              <small>It will be automatically generated once your protocol receives official board approval.</small>
            </div>
          </article>
        </>
      )}
    </div>
  );
}

export function RevisionDeskPage() {
  const { user } = useAuth();
  const { documents, events, loading, error, refresh } = useActivity();
  const [files, setFiles] = useState([]);
  const [filesError, setFilesError] = useState('');
  const remarkCount = useMemo(() => events.filter(isRemarkEvent).length, [events]);
  const latest = documents.reduce(
    (newest, item) => (!newest || new Date(item.updatedAt) > new Date(newest.updatedAt) ? item : newest),
    null,
  );
  const uploadTarget = latest
    ? (user.role === 'student'
      ? `/application/${latest.id}/requirements`
      : `/documents/${latest.id}`)
    : '/';
  const latestId = latest?.id ?? null;

  useEffect(() => {
    let active = true;
    if (!latestId) {
      setFiles([]);
      return undefined;
    }
    api.documentFiles(latestId)
      .then((list) => {
        if (active) {
          setFiles(list);
          setFilesError('');
        }
      })
      .catch((requestError) => {
        if (active) {
          setFiles([]);
          setFilesError(requestError.message);
        }
      });
    return () => {
      active = false;
    };
  }, [latestId]);

  return (
    <div className="dashboard-stack ac-sub">
      <h1 className="page-title page-title--caps">Revision Desk</h1>

      <Notice type="error" message={error} onDismiss={refresh} />

      {loading ? (
        <LoadingState />
      ) : !latest ? (
        <EmptyState
          title="No request yet"
          description="Submitted requests and their reviewer remarks will appear here."
        />
      ) : (
        <>
          <div className="revision-head">
            <section className="decision-card">
              <p className="decision-card__ref decision-card__ref--big">
                Application ID: RES-{String(latest.id).padStart(5, '0')}
              </p>
              <div className="decision-card__divider" />
              <p className="decision-card__updated-label">Last Updated:</p>
              <p className="decision-card__updated-value">{shortDateTime(latest.updatedAt)}</p>
            </section>

            <section className="revision-count">
              <p className="revision-count__label">Required Revision</p>
              <div className="revision-count__top">
                <strong className="revision-count__num">{remarkCount}</strong>
                <span className="revision-count__hint">
                  {remarkCount === 0 ? 'No revision needed.' : `${remarkCount} remark${remarkCount === 1 ? '' : 's'} recorded.`}
                </span>
              </div>
              <small>
                {remarkCount === 0
                  ? 'Your application is currently in review. You will be notified should there be revision made.'
                  : 'Open the Message Center to read the reviewer remarks for this request.'}
              </small>
            </section>
          </div>

          <Link className="upload-flagged" to={uploadTarget}>
            <span>Upload flagged documents here</span>
            <span className="upload-flagged__icon" aria-hidden="true"><ArrowDown size={16} /></span>
          </Link>

          <section className="submitted-docs" aria-labelledby="submitted-docs-title">
            <h2 id="submitted-docs-title">SUBMITTED DOCUMENTS</h2>
            <Notice type="error" message={filesError} onDismiss={() => setFilesError('')} />
            <div className="submitted-docs__table">
              <div className="submitted-docs__row submitted-docs__row--head">
                <span>FILE NAME</span>
                <span>DATE SUBMITTED</span>
                <span>DATE VIEWED BY THE ETHICS BOARD</span>
              </div>
              {files.map((file) => (
                <div className="submitted-docs__row submitted-docs__row--file" key={file.id}>
                  <a href={api.fileHref(file.id)}>
                    <FileText size={13} />
                    {file.originalName}
                  </a>
                  <span>{formatDate(file.uploadedAt)}</span>
                  <span>{file.viewedAt ? formatDate(file.viewedAt) : 'Not yet viewed.'}</span>
                </div>
              ))}
              {files.length === 0 && (
                <>
                  <div className="submitted-docs__row submitted-docs__row--empty">
                    <span>No file uploaded yet.</span>
                    <span>—</span>
                    <span>—</span>
                  </div>
                  <div className="submitted-docs__row submitted-docs__row--blank">
                    <span /><span /><span />
                  </div>
                  <div className="submitted-docs__row submitted-docs__row--blank">
                    <span /><span /><span />
                  </div>
                </>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function ComposeDialog({ documents, initialDocumentId, onClose, onSent }) {
  const [documentId, setDocumentId] = useState(() => {
    const fallback = documents[0]?.id ?? '';
    return initialDocumentId || fallback;
  });
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const textareaRef = useRef(null);

  useEffect(() => {
    function closeOnEscape(event) {
      if (event.key === 'Escape' && !submitting) onClose();
    }
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [onClose, submitting]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    const trimmed = body.trim();
    if (!documentId) {
      setError('Choose the request you want to message about.');
      return;
    }
    if (!trimmed) {
      setError('Write a message before sending.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await api.sendMessage(documentId, { body: trimmed });
      onSent();
    } catch (requestError) {
      setError(requestError.message);
      setSubmitting(false);
    }
  }

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !submitting) onClose();
      }}
    >
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="compose-title">
        <div className="modal__header">
          <div>
            <p className="eyebrow">Message Center</p>
            <h2 id="compose-title">New message</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose} disabled={submitting} aria-label="Close dialog">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal__body">
            <Notice type="error" message={error} />
            <label className="field">
              <span>Request</span>
              <select
                value={documentId}
                onChange={(event) => setDocumentId(event.target.value ? Number(event.target.value) : '')}
                disabled={submitting}
              >
                {documents.map((item) => (
                  <option key={item.id} value={item.id}>
                    RES-{String(item.id).padStart(5, '0')} · {item.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>
                Message
                <span className="field__optional">Required</span>
              </span>
              <textarea
                ref={textareaRef}
                rows={5}
                value={body}
                placeholder="Type your message here…"
                onChange={(event) => setBody(event.target.value)}
                disabled={submitting}
              />
            </label>
          </div>

          <div className="modal__footer">
            <button type="button" className="button button--ghost" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="button button--dark" disabled={submitting}>
              <Send size={16} />
              {submitting ? 'Sending…' : 'Send'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export function MessageCenterPage() {
  const { documents, events, messages, loading, error, refresh } = useActivity();
  const [tab, setTab] = useState('all');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [readVersion, setReadVersion] = useState(0);
  const [composing, setComposing] = useState(false);
  const [sent, setSent] = useState('');

  const remarkEvents = useMemo(() => events.filter(isRemarkEvent), [events]);
  const readIds = getReadIds();

  // Remarks from reviewers and messages written in the composer live in the same
  // thread, so both sources are merged per document before sorting.
  const conversations = useMemo(() => {
    const map = new Map();
    [...remarkEvents, ...messages].forEach((event) => {
      const existing = map.get(event.documentId);
      if (existing) {
        existing.events.push(event);
        return;
      }
      map.set(event.documentId, {
        id: event.documentId,
        reference: event.reference,
        title: event.documentTitle,
        name: event.updatedByName,
        events: [event],
      });
    });
    return [...map.values()]
      .map((conversation) => ({
        ...conversation,
        events: conversation.events
          .slice()
          .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)),
        name: conversation.events[conversation.events.length - 1]?.updatedByName || conversation.name,
      }))
      .sort((a, b) => new Date(b.events[b.events.length - 1].timestamp)
        - new Date(a.events[a.events.length - 1].timestamp));
  }, [remarkEvents, messages]);

  const visible = conversations.filter((conversation) => {
    if (tab === 'unread' && !conversation.events.some((event) => !readIds.has(event.id))) return false;
    if (!query.trim()) return true;
    const haystack = `${conversation.name} ${conversation.title} ${conversation.reference}`.toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
  });

  const selected = visible.find((conversation) => conversation.id === selectedId)
    || visible[0]
    || null;

  function handleSelect(conversation) {
    setSelectedId(conversation.id);
    conversation.events.forEach((event) => markEventRead(event.id));
    setReadVersion((value) => value + 1);
  }

  async function handleSent() {
    setComposing(false);
    setSent('Your message was sent to the ethics board thread.');
    refresh();
  }

  return (
    <div className="dashboard-stack ac-sub message-page" data-read-version={readVersion}>
      <div className="message-hero">
        <p className="bubble-heading__title">MESSAGE CENTER</p>
        <p className="message-hero__sub"><Hash size={11} /> Access important messages and updates for the IERC.</p>
      </div>

      <div className="message-toolbar">
        <div className="pill-tabs" role="tablist" aria-label="Message filter">
          <button
            type="button"
            className={tab === 'all' ? 'is-active' : ''}
            onClick={() => setTab('all')}
          >
            ALL
          </button>
          <button
            type="button"
            className={tab === 'unread' ? 'is-active' : ''}
            onClick={() => setTab('unread')}
          >
            UNREAD
          </button>
        </div>
        <button
          type="button"
          className="message-compose"
          onClick={() => setComposing(true)}
          disabled={documents.length === 0}
          title={documents.length === 0 ? 'Send a request first so you have a thread to reply in.' : undefined}
        >
          New Message +
        </button>
      </div>

      <Notice type="error" message={error} onDismiss={refresh} />
      <Notice type="success" message={sent} onDismiss={() => setSent('')} />

      {loading ? (
        <LoadingState />
      ) : (
        <div className="message-split">
          <aside className="message-split__list">
            <label className="message-search">
              <input
                type="search"
                placeholder="Search..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              <Search size={16} />
            </label>
            {visible.length === 0 ? (
              <p className="message-split__none">No messages yet.</p>
            ) : (
              <ul className="message-rows">
                {visible.map((conversation) => (
                  <li key={conversation.id}>
                    <button
                      type="button"
                      className={`message-row${selected && selected.id === conversation.id ? ' is-selected' : ''}`}
                      onClick={() => handleSelect(conversation)}
                    >
                      <Avatar name={conversation.name} />
                      <span className="message-row__text">
                        <strong>{conversation.name}</strong>
                        <small>{conversation.reference}</small>
                      </span>
                      {conversation.events.some((event) => !readIds.has(event.id)) && (
                        <span className="message-row__dot" aria-label="Unread" />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </aside>

          <div className="message-split__chat">
            {!selected ? (
              <p className="message-split__none">Select a conversation to read its messages.</p>
            ) : (
              <>
                <div className="chat-head">
                  <span className="chat-head__title">{selected.title}</span>
                  <span className="chat-head__ref">{selected.reference}</span>
                  <button
                    type="button"
                    className="chat-head__reply"
                    onClick={() => {
                      setSelectedId(selected.id);
                      setComposing(true);
                    }}
                  >
                    Reply
                  </button>
                </div>
                <ul className="chat-list">
                  {selected.events.slice().reverse().map((event) => (
                    <li className="chat-turn" key={event.id}>
                      <Avatar name={event.updatedByName} />
                      <div className="chat-bubble">
                        <p>{event.remarks}</p>
                        <small>{formatDate(event.timestamp)} · {formatTime(event.timestamp)}</small>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      )}

      {composing && (
        <ComposeDialog
          documents={documents}
          initialDocumentId={selected?.id}
          onClose={() => setComposing(false)}
          onSent={handleSent}
        />
      )}
    </div>
  );
}
