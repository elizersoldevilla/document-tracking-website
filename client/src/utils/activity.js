import { formatDate } from './presentation.js';

export const EVENT_TITLES = {
  SUBMITTED: 'Application Submitted',
  UNDER_REVIEW: 'Application Under Review',
  SIGNED_APPROVED: 'Application Approved',
  ENDORSED_TO_ADMIN: 'Endorsed to the Admin Office',
  ADMIN_PROCESSING: 'Admin Processing Started',
  READY_FOR_PICKUP: 'Document Ready for Pickup',
  COMPLETED: 'Request Completed',
};

export const EVENT_TONES = {
  SUBMITTED: 'info',
  UNDER_REVIEW: 'warning',
  SIGNED_APPROVED: 'success',
  ENDORSED_TO_ADMIN: 'info',
  ADMIN_PROCESSING: 'violet',
  READY_FOR_PICKUP: 'success',
  COMPLETED: 'neutral',
};

const READ_KEY = 'clear:read-events';

export function getEventTitle(event) {
  return EVENT_TITLES[event.newStatus] || 'Status updated';
}

export function isRemarkEvent(event) {
  return Boolean(event.remarks && event.remarks.trim());
}

export function getEventStatusCount(events, status) {
  return events.filter((event) => event.newStatus === status).length;
}

export function formatTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en', { timeStyle: 'short' }).format(date);
}

export function groupEventsByDay(events) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const groups = [];
  events.forEach((event) => {
    const date = new Date(event.timestamp);
    date.setHours(0, 0, 0, 0);
    const dayDiff = Math.round((today.getTime() - date.getTime()) / 86400000);
    let label = formatDate(event.timestamp);
    if (dayDiff <= 0) label = 'Today';
    else if (dayDiff === 1) label = 'Yesterday';
    else if (dayDiff <= 30) label = `${dayDiff} days ago`;

    let group = groups.find((item) => item.label === label);
    if (!group) {
      group = { label, events: [] };
      groups.push(group);
    }
    group.events.push(event);
  });
  return groups;
}

function readStoredIds() {
  try {
    const raw = window.localStorage.getItem(READ_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function getReadIds() {
  return new Set(readStoredIds());
}

export function markEventRead(eventId) {
  const ids = readStoredIds();
  if (!ids.includes(eventId)) {
    ids.push(eventId);
    try {
      window.localStorage.setItem(READ_KEY, JSON.stringify(ids));
    } catch {
      // Storage unavailable (private mode) — read state simply does not persist.
    }
  }
}

export function markAllRead(eventIds) {
  const merged = [...new Set([...readStoredIds(), ...eventIds])];
  try {
    window.localStorage.setItem(READ_KEY, JSON.stringify(merged));
  } catch {
    // Storage unavailable — ignore.
  }
  return new Set(merged);
}
