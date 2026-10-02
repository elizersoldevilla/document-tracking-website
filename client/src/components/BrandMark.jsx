import { ClearIcon } from './ClearIcon.jsx';

export function BrandMark({ compact = false, inverse = false }) {
  return (
    <div className={`brand-mark ${compact ? 'brand-mark--compact' : ''} ${inverse ? 'brand-mark--inverse' : ''}`}>
      <span className="brand-mark__logo">
        <ClearIcon size={compact ? 20 : 26} />
        <span className="brand-mark__name">CLEAR</span>
      </span>
      {!compact && (
        <span className="brand-mark__tagline">Centralized Logging for Ethics Approval and Review</span>
      )}
    </div>
  );
}
