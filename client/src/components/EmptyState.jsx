import { Inbox } from 'lucide-react';

export function EmptyState({ title, description, action }) {
  return (
    <div className="empty-state">
      <span className="empty-state__icon"><Inbox size={28} /></span>
      <h2>{title}</h2>
      <p>{description}</p>
      {action}
    </div>
  );
}
