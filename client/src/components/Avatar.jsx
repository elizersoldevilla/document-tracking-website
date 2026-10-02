import { getInitials } from '../utils/presentation.js';

export function Avatar({ name, size = 'medium' }) {
  return (
    <span className={`avatar avatar--${size}`} aria-hidden="true">
      {getInitials(name)}
    </span>
  );
}
