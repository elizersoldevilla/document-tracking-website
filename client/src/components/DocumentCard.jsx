import { FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDate } from '../utils/presentation.js';
import { StatusBadge } from './StatusBadge.jsx';

export function DocumentCard({ document, viewerRole }) {
  const counterpart = viewerRole === 'student'
    ? `Professor: ${document.professorName}`
    : `Student: ${document.studentName}`;

  return (
    <Link className="document-card" to={`/documents/${document.id}`}>
      <div className="document-card__icon"><FileText size={22} /></div>
      <div className="document-card__body">
        <div className="document-card__topline">
          <span className="document-card__number">RES-{String(document.id).padStart(5, '0')}</span>
          <StatusBadge status={document.status} />
        </div>
        <h3>{document.title}</h3>
        <p>{counterpart}</p>
      </div>
      <div className="document-card__date">
        <span>Updated</span>
        <strong>{formatDate(document.updatedAt)}</strong>
      </div>
    </Link>
  );
}
