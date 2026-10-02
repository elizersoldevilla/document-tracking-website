export const ROLES = Object.freeze({
  STUDENT: 'student',
  PROFESSOR: 'professor',
  ADMIN: 'admin',
});

export const DOCUMENT_STATUS = Object.freeze({
  SUBMITTED: 'SUBMITTED',
  UNDER_REVIEW: 'UNDER_REVIEW',
  SIGNED_APPROVED: 'SIGNED_APPROVED',
  ENDORSED_TO_ADMIN: 'ENDORSED_TO_ADMIN',
  ADMIN_PROCESSING: 'ADMIN_PROCESSING',
  READY_FOR_PICKUP: 'READY_FOR_PICKUP',
  COMPLETED: 'COMPLETED',
});

export const STATUS_LABELS = Object.freeze({
  SUBMITTED: 'Submitted',
  UNDER_REVIEW: 'Under Review',
  SIGNED_APPROVED: 'Signed / Approved',
  ENDORSED_TO_ADMIN: 'Endorsed to Admin',
  ADMIN_PROCESSING: 'Admin Processing',
  READY_FOR_PICKUP: 'Ready for Pickup',
  COMPLETED: 'Completed',
});

export const ADMIN_VISIBLE_STATUSES = Object.freeze([
  DOCUMENT_STATUS.ENDORSED_TO_ADMIN,
  DOCUMENT_STATUS.ADMIN_PROCESSING,
  DOCUMENT_STATUS.READY_FOR_PICKUP,
  DOCUMENT_STATUS.COMPLETED,
]);

const PROFESSOR_TRANSITIONS = Object.freeze({
  [DOCUMENT_STATUS.SUBMITTED]: [
    DOCUMENT_STATUS.UNDER_REVIEW,
    DOCUMENT_STATUS.SIGNED_APPROVED,
    DOCUMENT_STATUS.ENDORSED_TO_ADMIN,
  ],
  [DOCUMENT_STATUS.UNDER_REVIEW]: [
    DOCUMENT_STATUS.SIGNED_APPROVED,
    DOCUMENT_STATUS.ENDORSED_TO_ADMIN,
  ],
  [DOCUMENT_STATUS.SIGNED_APPROVED]: [DOCUMENT_STATUS.ENDORSED_TO_ADMIN],
});

const ADMIN_TRANSITIONS = Object.freeze({
  [DOCUMENT_STATUS.ENDORSED_TO_ADMIN]: [DOCUMENT_STATUS.ADMIN_PROCESSING],
  [DOCUMENT_STATUS.ADMIN_PROCESSING]: [DOCUMENT_STATUS.READY_FOR_PICKUP],
  [DOCUMENT_STATUS.READY_FOR_PICKUP]: [DOCUMENT_STATUS.COMPLETED],
});

export function getAvailableActions(role, status) {
  const transitions = role === ROLES.PROFESSOR
    ? PROFESSOR_TRANSITIONS[status]
    : role === ROLES.ADMIN
      ? ADMIN_TRANSITIONS[status]
      : undefined;

  return transitions ? [...transitions] : [];
}

export function canTransition(role, previousStatus, newStatus) {
  return getAvailableActions(role, previousStatus).includes(newStatus);
}

export function canViewDocument(user, document) {
  if (!user || !document) {
    return false;
  }

  if (user.role === ROLES.STUDENT) {
    return document.studentId === user.id;
  }

  if (user.role === ROLES.PROFESSOR) {
    return document.professorId === user.id;
  }

  if (user.role === ROLES.ADMIN) {
    return ADMIN_VISIBLE_STATUSES.includes(document.status);
  }

  return false;
}
