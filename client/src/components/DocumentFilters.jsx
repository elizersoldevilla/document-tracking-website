import { Search, SlidersHorizontal } from 'lucide-react';
import { STATUS_LABELS } from '../utils/presentation.js';

export function DocumentFilters({ search, status, statuses, onSearch, onStatus }) {
  return (
    <div className="document-filters">
      <label className="search-field">
        <Search size={19} aria-hidden="true" />
        <span className="sr-only">Search documents</span>
        <input
          type="search"
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          placeholder="Search by title, student, or professor"
          maxLength="100"
        />
      </label>
      <label className="select-field">
        <SlidersHorizontal size={18} aria-hidden="true" />
        <span className="sr-only">Filter by status</span>
        <select value={status} onChange={(event) => onStatus(event.target.value)}>
          <option value="">All statuses</option>
          {statuses.map((value) => (
            <option value={value} key={value}>{STATUS_LABELS[value]}</option>
          ))}
        </select>
      </label>
    </div>
  );
}
