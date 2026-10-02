import { useEffect } from 'react';
import { ArrowUpRight, Check, ChevronRight, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EmptyState } from '../components/EmptyState.jsx';
import { LoadingState } from '../components/LoadingState.jsx';
import { Notice } from '../components/Notice.jsx';
import { useActivity } from '../hooks/useActivity.js';
import { useDocuments } from '../hooks/useDocuments.js';
import { isRemarkEvent } from '../utils/activity.js';
import {
  DASH_STATUS,
  getNextAction,
  STATUS_LABELS,
  STATUS_STAGE,
  TIMELINE_STAGES,
} from '../utils/presentation.js';

function shortDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: '2-digit',
  }).format(date);
}

export function StudentDashboard() {
  const documents = useDocuments();
  const activity = useActivity();

  const latest = documents.items.reduce(
    (newest, item) => (!newest || new Date(item.updatedAt) > new Date(newest.updatedAt) ? item : newest),
    null,
  );
  const nextAction = latest ? getNextAction(latest.status) : null;
  const stage = latest ? (STATUS_STAGE[latest.status] ?? TIMELINE_STAGES.length) : 0;
  const remarkCount = activity.events.filter(isRemarkEvent).length;

  useEffect(() => {
    const interval = setInterval(documents.refresh, 30000);
    return () => clearInterval(interval);
  }, [documents.refresh]);

  return (
    <div className="dashboard-stack">
      <Notice type="error" message={documents.error} onDismiss={documents.refresh} />

      {documents.loading ? (
        <LoadingState />
      ) : !latest ? (
        <EmptyState
          title="No application yet"
          description="Submit your first document request to begin tracking its progress."
          action={(
            <Link className="button button--dark" to="/requests/new">
              Create request <ArrowUpRight size={18} />
            </Link>
          )}
        />
      ) : (
        <>
          <Link
            className="dash-status-card"
            to={`/documents/${latest.id}`}
            aria-label="Open request details"
          >
            <p className="dash-status-card__label">Current Status</p>
            <p className="dash-status-card__ref">Application ID: RES-{String(latest.id).padStart(5, '0')}</p>
            <p className="dash-status-card__title">{DASH_STATUS[latest.status] || STATUS_LABELS[latest.status]}</p>
          </Link>

          <section className="dash-timeline-card" aria-label="Timeline">
            <p className="dash-timeline-card__label">Timeline</p>
            <ol className="dash-timeline">
              {TIMELINE_STAGES.map((label, index) => {
                const done = index < stage;
                const current = index === stage;
                return (
                  <li
                    key={label}
                    className={`${done ? 'is-done ' : ''}${current ? 'is-current' : ''}`.trim()}
                  >
                    <span className="dash-timeline__node">
                      {done ? <Check size={11} strokeWidth={3.5} /> : null}
                    </span>
                    <span className="dash-timeline__label">{label}</span>
                    {done && <span className="dash-timeline__date">{shortDate(latest.createdAt)}</span>}
                    {current && <span className="dash-timeline__current">Current Review</span>}
                  </li>
                );
              })}
            </ol>
            <ChevronRight className="dash-timeline__end" size={16} strokeWidth={2.5} />
          </section>

          <div className="dash-two-col">
            <article className="dash-info-card">
              <p className="dash-info-card__label">Next Action</p>
              <strong className="dash-info-card__title">{nextAction.title}</strong>
              <p className="dash-info-card__note">{nextAction.body}</p>
            </article>

            <article className="dash-info-card">
              <p className="dash-info-card__label">Requirements &amp; Revisions</p>
              <ul className="dash-checklist">
                <li>
                  <span className="dash-check dash-check--ok"><Check size={12} strokeWidth={3.5} /></span>
                  <div>
                    <strong>Requirements</strong>
                    <small>Complete</small>
                  </div>
                </li>
                <li>
                  <span className="dash-check dash-check--no"><X size={12} strokeWidth={3} /></span>
                  <div>
                    <strong>{remarkCount > 0 ? `${remarkCount} revision${remarkCount === 1 ? '' : 's'}` : 'None'}</strong>
                    <small>{remarkCount > 0 ? 'See Revision Desk.' : 'No revisions required.'}</small>
                  </div>
                </li>
              </ul>
            </article>
          </div>
        </>
      )}
    </div>
  );
}
