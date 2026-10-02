import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, Clock3, FilePlus2, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { EmptyState } from '../components/EmptyState.jsx';
import { LoadingState } from '../components/LoadingState.jsx';
import { useDocuments } from '../hooks/useDocuments.js';
import { REQUIREMENTS } from '../utils/requirements.js';
import {
  DASH_STATUS,
  STATUS_DESCRIPTIONS,
  STATUS_LABELS,
  formatDate,
} from '../utils/presentation.js';

function DateChips({ value }) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = [
    { label: 'Month', value: new Intl.DateTimeFormat('en', { month: '2-digit' }).format(date) },
    { label: 'Day', value: new Intl.DateTimeFormat('en', { day: '2-digit' }).format(date) },
    { label: 'Year', value: String(date.getFullYear()) },
  ];
  return (
    <div className="date-chips">
      {parts.map((part) => (
        <span className="date-chip" key={part.label}>
          <strong>{part.value}</strong>
          <small>{part.label}</small>
        </span>
      ))}
    </div>
  );
}

export function ApplicationPage() {
  const documents = useDocuments({ limit: 50 });
  const [files, setFiles] = useState([]);

  const latest = documents.items.reduce(
    (newest, item) => (!newest || new Date(item.updatedAt) > new Date(newest.updatedAt) ? item : newest),
    null,
  );

  const loadFiles = useCallback(async (documentId) => {
    if (!documentId) {
      setFiles([]);
      return;
    }
    try {
      setFiles(await api.documentFiles(documentId));
    } catch {
      // The tracker simply falls back to "not yet submitted".
      setFiles([]);
    }
  }, []);

  useEffect(() => {
    loadFiles(latest?.id);
  }, [latest?.id, loadFiles]);

  if (documents.loading) {
    return (
      <div className="dashboard-stack">
        <h1 className="page-title">Application</h1>
        <LoadingState />
      </div>
    );
  }

  if (!latest) {
    return (
      <div className="dashboard-stack">
        <h1 className="page-title">Application</h1>
        <EmptyState
          title="No application yet"
          description="Submit your first document request to see its status, dates, and requirements here."
          action={(
            <Link className="button button--dark" to="/requests/new">
              <FilePlus2 size={18} /> New request
            </Link>
          )}
        />
      </div>
    );
  }

  const reference = `RES-${String(latest.id).padStart(5, '0')}`;
  const submittedSlugs = new Set(files.map((file) => file.requirementSlug));
  const submittedCount = REQUIREMENTS.filter((item) => submittedSlugs.has(item.slug)).length;
  const statusLabel = STATUS_LABELS[latest.status] || latest.status;

  return (
    <div className="dashboard-stack application-page">
      <h1 className="page-title">Application</h1>

      <Link
        className="dash-status-card"
        to={`/documents/${latest.id}`}
        aria-label="Open request details"
      >
        <span className="dash-status-card__badge">
          <CheckCircle2 size={13} strokeWidth={2.6} />
          {statusLabel}
        </span>
        <p className="dash-status-card__label">Application Status</p>
        <p className="dash-status-card__ref">Application ID: {reference}</p>
        <p className="dash-status-card__title">{DASH_STATUS[latest.status] || STATUS_LABELS[latest.status]}</p>
        <p className="dash-status-card__desc">{STATUS_DESCRIPTIONS[latest.status]}</p>
      </Link>

      <section aria-labelledby="ack-submission-title">
        <p className="application-subhead" id="ack-submission-title">Last Acknowledged Submission</p>
        <DateChips value={latest.createdAt} />
        <p className="application-updated">
          <Clock3 size={13} />
          Last updated {formatDate(latest.updatedAt)}
          {latest.title ? ` · ${latest.title}` : ''}
        </p>
        {latest.researchTeamName && (
          <p className="application-updated application-updated--team">
            <strong>Research Team Name:</strong> {latest.researchTeamName}
          </p>
        )}
      </section>

      <section className="app-tracker" aria-labelledby="app-tracker-title">
        <div className="app-tracker__head">
          <div>
            <p className="app-tracker__eyebrow">To Submit &amp; Track</p>
            <h2 className="app-tracker__title" id="app-tracker-title">Requirements</h2>
          </div>
          <span className="app-tracker__count">
            Requirement {submittedCount} of {REQUIREMENTS.length}
          </span>
        </div>

        <div className="requirement-grid">
          {REQUIREMENTS.map((requirement) => {
            const isSubmitted = submittedSlugs.has(requirement.slug);
            return (
              <div
                className={`requirement-card requirement-card--static${isSubmitted ? ' is-submitted' : ''}`}
                key={requirement.slug}
              >
                {isSubmitted
                  ? <CheckCircle2 size={18} className="requirement-card__icon requirement-card__icon--done" />
                  : <XCircle size={18} className="requirement-card__icon" />}
                <div>
                  <strong>{requirement.title}</strong>
                  <p>{isSubmitted ? 'Recorded on your submission.' : 'Not yet submitted.'}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="app-tracker__foot">
          <Link
            className="button button--dark"
            to={`/application/${latest.id}/requirements`}
          >
            Send Requirements
            <ArrowRight size={16} strokeWidth={2.5} />
          </Link>
        </div>
      </section>
    </div>
  );
}
