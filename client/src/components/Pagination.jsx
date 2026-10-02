import { ChevronLeft, ChevronRight } from 'lucide-react';

export function Pagination({ pagination, onPageChange }) {
  if (!pagination || pagination.totalPages <= 1) return null;

  return (
    <nav className="pagination" aria-label="Document pages">
      <button
        type="button"
        className="button button--ghost button--small"
        disabled={pagination.page <= 1}
        onClick={() => onPageChange(pagination.page - 1)}
      >
        <ChevronLeft size={17} /> Previous
      </button>
      <span>Page {pagination.page} of {pagination.totalPages}</span>
      <button
        type="button"
        className="button button--ghost button--small"
        disabled={pagination.page >= pagination.totalPages}
        onClick={() => onPageChange(pagination.page + 1)}
      >
        Next <ChevronRight size={17} />
      </button>
    </nav>
  );
}
