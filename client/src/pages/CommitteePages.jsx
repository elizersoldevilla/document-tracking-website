import { useEffect } from 'react';
import { ChevronRight } from 'lucide-react';
import { Navigate, Link, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.js';
import { DocumentFilters } from '../components/DocumentFilters.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { LoadingState } from '../components/LoadingState.jsx';
import { Notice } from '../components/Notice.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { Pagination } from '../components/Pagination.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { useDocuments } from '../hooks/useDocuments.js';
import { formatDate, getGreeting, getRoleLabel } from '../utils/presentation.js';

const COMMITTEE_VIEWS = {
  professor: {
    new: { label: 'New Applications', statuses: ['SUBMITTED'], sub: 'Requests waiting to be picked up for review.' },
    review: { label: 'Under Review', statuses: ['UNDER_REVIEW'], sub: 'Requests you are currently reviewing.' },
    revision: { label: 'For Revision', statuses: [], hasRemarks: true, sub: 'Requests carrying reviewer remarks that still need revision.' },
    pending: { label: 'Pending Decision', statuses: ['ENDORSED_TO_ADMIN'], sub: 'Requests you endorsed and that await a final decision.' },
    approved: { label: 'Signed / Approved', statuses: ['SIGNED_APPROVED'], sub: 'Approved requests awaiting endorsement to the admin office.' },
    queue: { label: 'Application Queue', statuses: [], sub: 'All requests assigned to you.' },
  },
  admin: {
    endorsed: { label: 'Endorsed to Admin', statuses: ['ENDORSED_TO_ADMIN'], sub: 'Requests endorsed by professors and awaiting processing.' },
    processing: { label: 'Admin Processing', statuses: ['ADMIN_PROCESSING'], sub: 'Requests currently being processed.' },
    ready: { label: 'Ready for Pickup', statuses: ['READY_FOR_PICKUP'], sub: 'Documents released and waiting to be claimed.' },
    completed: { label: 'Completed', statuses: ['COMPLETED'], sub: 'Completed document requests.' },
    queue: { label: 'Application Queue', statuses: [], sub: 'All requests in your scope.' },
  },
};

const ROLE_STATUSES = {
  professor: ['SUBMITTED', 'UNDER_REVIEW', 'SIGNED_APPROVED', 'ENDORSED_TO_ADMIN'],
  admin: ['ENDORSED_TO_ADMIN', 'ADMIN_PROCESSING', 'READY_FOR_PICKUP', 'COMPLETED'],
};

function QueuePanel({ documents, role }) {
  return (
    <section className="content-panel" aria-labelledby="queue-heading">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Signed in as {getRoleLabel(role)}</p>
          <h2 id="queue-heading">Application Queue</h2>
        </div>
        <span className="queue-refresh">Refreshes every 30 seconds</span>
      </div>
      <DocumentFilters
        search={documents.searchInput}
        status={documents.filters.status}
        statuses={ROLE_STATUSES[role] || []}
        onSearch={documents.setSearchInput}
        onStatus={documents.setStatus}
      />
      <Notice type="error" message={documents.error} onDismiss={documents.refresh} />
      {documents.loading ? (
        <LoadingState />
      ) : documents.items.length === 0 ? (
        <EmptyState
          title={documents.filters.search || documents.filters.status ? 'No matching documents' : 'Queue is clear'}
          description={documents.filters.search || documents.filters.status
            ? 'Try a different search term or status filter.'
            : 'Documents will appear here as soon as they enter your scope.'}
        />
      ) : (
        <div className="queue-table__scroll">
          <table className="queue-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Title</th>
                <th>Requested by</th>
                <th>Assigned to</th>
                <th>Status</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {documents.items.map((document) => (
                <tr key={document.id}>
                  <td><span className="queue-table__ref">RES-{String(document.id).padStart(5, '0')}</span></td>
                  <td><p className="queue-table__title">{document.title}</p></td>
                  <td>{document.studentName}</td>
                  <td>{document.professorName}</td>
                  <td><StatusBadge status={document.status} /></td>
                  <td>{formatDate(document.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination pagination={documents.pagination} onPageChange={documents.setPage} />
    </section>
  );
}

function StatPills({ role, summary, total, withRemarks }) {
  const counts = role === 'professor'
    ? [
      { label: 'New Applications', value: summary.SUBMITTED || 0, to: '/committee/new' },
      { label: 'Under Review', value: summary.UNDER_REVIEW || 0, to: '/committee/review' },
      { label: 'For Revision', value: withRemarks, to: '/committee/revision' },
      { label: 'Pending Decision', value: summary.ENDORSED_TO_ADMIN || 0, to: '/committee/pending' },
      { label: 'Approved', value: summary.SIGNED_APPROVED || 0, to: '/committee/approved' },
    ]
    : [
      { label: 'Endorsed', value: summary.ENDORSED_TO_ADMIN || 0, to: '/committee/endorsed' },
      { label: 'Processing', value: summary.ADMIN_PROCESSING || 0, to: '/committee/processing' },
      { label: 'Ready for Pickup', value: summary.READY_FOR_PICKUP || 0, to: '/committee/ready' },
      { label: 'Completed', value: summary.COMPLETED || 0, to: '/committee/completed' },
      { label: 'In your queue', value: total, to: '/committee/queue' },
    ];

  return (
    <section className="stat-pills" aria-label="Queue summary">
      {counts.map((item) => (
        <Link className="stat-pill" to={item.to} key={item.label}>
          <div>
            <strong>{item.value}</strong>
            <small>{item.label}</small>
          </div>
          <ChevronRight className="stat-pill__chevron" size={20} aria-hidden="true" />
        </Link>
      ))}
    </section>
  );
}

export function CommitteeDashboard() {
  const { user } = useAuth();
  const role = user.role;
  const documents = useDocuments({ limit: 10 });
  const summary = documents.summary || {};
  const total = Object.values(summary).reduce((sum, count) => sum + count, 0);

  useEffect(() => {
    const interval = setInterval(documents.refresh, 30000);
    return () => clearInterval(interval);
  }, [documents.refresh]);

  return (
    <div className="dashboard-stack">
      <PageHeader
        eyebrow={getGreeting()}
        title="Committee dashboard"
        description="Here's an overview of the document requests in your scope."
      />
      <StatPills
        role={role}
        summary={summary}
        total={total}
        withRemarks={documents.withRemarks || 0}
      />
      <QueuePanel documents={documents} role={role} />
    </div>
  );
}

export function CommitteeViewPage() {
  const { user } = useAuth();
  const role = user.role;
  const { view } = useParams();
  const views = COMMITTEE_VIEWS[role] || {};
  const config = views[view];
  const scopeStatus = config?.statuses?.length === 1 ? config.statuses[0] : '';
  const scopeHasRemarks = config?.hasRemarks ? true : undefined;

  const documents = useDocuments({
    limit: 10,
    status: scopeStatus,
    ...(scopeHasRemarks ? { hasRemarks: scopeHasRemarks } : {}),
  });
  const summary = documents.summary || {};
  const total = Object.values(summary).reduce((sum, count) => sum + count, 0);
  const { setScope } = documents;

  useEffect(() => {
    const interval = setInterval(documents.refresh, 30000);
    return () => clearInterval(interval);
  }, [documents.refresh]);

  // Keep the fetched list in sync when the view chip changes, since the
  // hook keeps its initial filters across param-only navigations.
  useEffect(() => {
    setScope({ status: scopeStatus, hasRemarks: scopeHasRemarks });
  }, [setScope, scopeStatus, scopeHasRemarks]);

  if (!config) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="dashboard-stack">
      <PageHeader eyebrow={getRoleLabel(role)} title={config.label} description={config.sub} />

      <nav className="view-chips" aria-label="Committee views">
        {Object.entries(views).map(([key, item]) => {
          const count = item.hasRemarks
            ? documents.withRemarks || 0
            : item.statuses.length === 1
              ? summary[item.statuses[0]] || 0
              : total;
          return (
            <Link
              className={`view-chip${key === view ? ' is-active' : ''}`}
              to={`/committee/${key}`}
              key={key}
            >
              <strong>{count}</strong> {item.label}
            </Link>
          );
        })}
      </nav>

      <QueuePanel documents={documents} role={role} />
    </div>
  );
}
