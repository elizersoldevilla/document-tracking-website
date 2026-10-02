export const STATUS_LABELS = {
  SUBMITTED: 'Submitted',
  UNDER_REVIEW: 'Under Review',
  SIGNED_APPROVED: 'Signed / Approved',
  ENDORSED_TO_ADMIN: 'Endorsed to Admin',
  ADMIN_PROCESSING: 'Admin Processing',
  READY_FOR_PICKUP: 'Ready for Pickup',
  COMPLETED: 'Completed',
};

export const STATUS_DESCRIPTIONS = {
  SUBMITTED: 'Your request has been sent to the selected professor.',
  UNDER_REVIEW: 'The professor is reviewing your request and requirements.',
  SIGNED_APPROVED: 'The professor has signed and approved the request.',
  ENDORSED_TO_ADMIN: 'The professor has endorsed the request to the administration.',
  ADMIN_PROCESSING: 'The administration is processing the endorsed request.',
  READY_FOR_PICKUP: 'The document is ready at the designated office for pickup.',
  COMPLETED: 'The document request has been completed.',
};

export const TIMELINE_STEPS = [
  { key: 'SUBMITTED', shortLabel: 'Submitted', label: 'Request Submitted' },
  { key: 'UNDER_REVIEW', shortLabel: 'Prof review', label: 'Professor Review' },
  { key: 'ENDORSED_TO_ADMIN', shortLabel: 'Endorsed', label: 'Endorsed to Admin' },
  { key: 'ADMIN_PROCESSING', shortLabel: 'Processing', label: 'Admin Processing' },
  { key: 'READY_FOR_PICKUP', shortLabel: 'Ready', label: 'Ready for Pickup' },
];

export const NEXT_ACTIONS = {
  SUBMITTED: {
    title: 'Sent to your professor',
    body: 'No action is required from you. Your selected professor will review the request next.',
  },
  UNDER_REVIEW: {
    title: 'The committee is already reviewing your submission.',
    body: 'The request and its requirements are being checked. You will be notified when a decision is recorded.',
  },
  SIGNED_APPROVED: {
    title: 'Awaiting endorsement to admin',
    body: 'The professor has approved the request. It will be forwarded to the administration for processing.',
  },
  ENDORSED_TO_ADMIN: {
    title: 'With the administration',
    body: 'The admin office has received the endorsed request and will begin processing it.',
  },
  ADMIN_PROCESSING: {
    title: 'Being processed',
    body: 'The administration is processing your request. You will see an update as soon as it is ready.',
  },
  READY_FOR_PICKUP: {
    title: 'Pick up your document',
    body: 'The document is ready at the designated office. Present your request reference to claim it.',
  },
  COMPLETED: {
    title: 'No action required',
    body: 'This request is complete. Submit a new request if you need another document.',
  },
};

export function getNextAction(status) {
  return NEXT_ACTIONS[status] || NEXT_ACTIONS.SUBMITTED;
}

export const DASH_STATUS = {
  SUBMITTED: 'APPLICATION SUBMITTED',
  UNDER_REVIEW: 'RECEIVED BY REVIEWER',
  SIGNED_APPROVED: 'DECISION ISSUED',
  ENDORSED_TO_ADMIN: 'ENDORSED TO ADMIN',
  ADMIN_PROCESSING: 'ADMIN PROCESSING',
  READY_FOR_PICKUP: 'READY FOR PICKUP',
  COMPLETED: 'REQUEST COMPLETED',
};

export const TIMELINE_STAGES = [
  'Application Submitted',
  'Submission Received',
  'Sent For Review',
  'Received By Reviewer',
  'Review Finalization',
  'Decision Issued',
];

export const STATUS_STAGE = {
  SUBMITTED: 1,
  UNDER_REVIEW: 3,
  SIGNED_APPROVED: 6,
  ENDORSED_TO_ADMIN: 6,
  ADMIN_PROCESSING: 6,
  READY_FOR_PICKUP: 6,
  COMPLETED: 6,
};

export const WORKFLOW_MILESTONES = [
  'Request information provided',
  'Professor decision recorded',
  'Admin processing recorded',
  'Release status recorded',
];

export function getMilestoneIndex(status) {
  if (status === 'SUBMITTED') return 0;
  if (status === 'UNDER_REVIEW' || status === 'SIGNED_APPROVED') return 1;
  if (status === 'ENDORSED_TO_ADMIN' || status === 'ADMIN_PROCESSING') return 2;
  return 3;
}

export function getCurrentTimelineIndex(status) {
  if (status === 'SUBMITTED') return 0;
  if (status === 'UNDER_REVIEW' || status === 'SIGNED_APPROVED') return 1;
  if (status === 'ENDORSED_TO_ADMIN') return 2;
  if (status === 'ADMIN_PROCESSING') return 3;
  return 4;
}

export function formatFileSize(bytes) {
  const value = Number(bytes) || 0;
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDate(value, options = {}) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: options.includeTime ? 'short' : undefined,
  }).format(date);
}

export function formatDateTime(value) {
  return formatDate(value, { includeTime: true });
}

export function getInitials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}

export function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export function getRoleLabel(role) {
  return {
    student: 'Student',
    professor: 'Professor',
    admin: 'Administrator',
  }[role] || role;
}
