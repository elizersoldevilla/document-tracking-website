import { AlertCircle, CheckCircle2, X } from 'lucide-react';

export function Notice({ type = 'info', message, onDismiss }) {
  if (!message) return null;
  const Icon = type === 'success' ? CheckCircle2 : AlertCircle;

  return (
    <div className={`notice notice--${type}`} role={type === 'error' ? 'alert' : 'status'}>
      <Icon size={19} />
      <span>{message}</span>
      {onDismiss && (
        <button type="button" onClick={onDismiss} aria-label="Dismiss message">
          <X size={17} />
        </button>
      )}
    </div>
  );
}
