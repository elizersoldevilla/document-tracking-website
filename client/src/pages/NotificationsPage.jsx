import { useState } from 'react';
import { Bell, Check, CircleAlert, ClipboardList, Mail, Send, UserRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { EmptyState } from '../components/EmptyState.jsx';
import { LoadingState } from '../components/LoadingState.jsx';
import { Notice } from '../components/Notice.jsx';
import { useActivity } from '../hooks/useActivity.js';
import {
  formatTime,
  getEventTitle,
  getReadIds,
  groupEventsByDay,
  isRemarkEvent,
  markAllRead,
  markEventRead,
} from '../utils/activity.js';

const COMMITTEE_NAME = 'Institutional Ethics Review Committee';

function stampLabel(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const time = formatTime(timestamp);
  if (date.toDateString() === now.toDateString()) return `Today · ${time}`;
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${mm}-${dd}-${date.getFullYear()} · ${time}`;
}

const STATUS_STYLE = {
  SUBMITTED: { tone: 'submitted', Icon: ClipboardList },
  UNDER_REVIEW: { tone: 'warning', Icon: Bell },
  SIGNED_APPROVED: { tone: 'success', Icon: Check },
  ENDORSED_TO_ADMIN: { tone: 'info', Icon: Send },
  ADMIN_PROCESSING: { tone: 'violet', Icon: UserRound },
  READY_FOR_PICKUP: { tone: 'success', Icon: Check },
  COMPLETED: { tone: 'neutral', Icon: Mail },
};

const REMARK_STYLE = { tone: 'danger', Icon: CircleAlert };

export function NotificationsPage() {
  const { events, loading, error, refresh } = useActivity();
  const [readVersion, setReadVersion] = useState(0);
  const navigate = useNavigate();

  const readIds = getReadIds();
  const unreadEvents = events.filter((event) => !readIds.has(event.id));
  const readEvents = events.filter((event) => readIds.has(event.id));

  const sections = [];
  if (unreadEvents.length > 0) sections.push({ label: 'New', events: unreadEvents, isNew: true });
  sections.push(...groupEventsByDay(readEvents));

  function handleOpen(event) {
    markEventRead(event.id);
    setReadVersion((value) => value + 1);
    navigate(`/documents/${event.documentId}`);
  }

  function handleMarkAll() {
    markAllRead(events.map((event) => event.id));
    setReadVersion((value) => value + 1);
  }

  return (
    <div className="dashboard-stack ac-sub bare-page" data-read-version={readVersion}>
      <h1 className="page-title page-title--lime page-title--big">Notification</h1>

      <Notice type="error" message={error} onDismiss={refresh} />

      {loading ? (
        <LoadingState />
      ) : events.length === 0 ? (
        <EmptyState
          title="No notifications yet"
          description="Status updates from professors and the admin office will appear here."
        />
      ) : (
        sections.map((section) => (
          <section className="notification-group" key={section.label} aria-label={section.label}>
            {section.isNew ? (
              <div className="notif-newhead">
                <h2 className="notif-label">New</h2>
                <span className="unread-chip">
                  <span className="unread-chip__dot" aria-hidden="true" />
                  {unreadEvents.length} Unread
                </span>
                <button type="button" className="notif-mark" onClick={handleMarkAll}>
                  Mark as read
                </button>
              </div>
            ) : (
              <h2 className="notif-label">{section.label}</h2>
            )}
            <ul className="notification-list">
              {section.events.map((event) => {
                const remark = isRemarkEvent(event);
                const style = remark ? REMARK_STYLE : (STATUS_STYLE[event.newStatus] || STATUS_STYLE.COMPLETED);
                const { tone, Icon } = style;
                const body = remark
                  ? event.remarks
                  : `${event.reference} · ${event.documentTitle}`;
                return (
                  <li key={event.id}>
                    <button
                      type="button"
                      className={`notification-card notification-card--${tone}`}
                      onClick={() => handleOpen(event)}
                    >
                      <span className="notification-card__icon"><Icon size={17} strokeWidth={2.4} /></span>
                      <div>
                        <div className="notification-card__top">
                          <strong>{COMMITTEE_NAME}</strong>
                          <span className="notification-card__time">{stampLabel(event.timestamp)}</span>
                        </div>
                        <p className="notification-card__title">
                          {remark ? 'Revision Requested' : getEventTitle(event)}
                        </p>
                        <p className="notification-card__text">{body}</p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
