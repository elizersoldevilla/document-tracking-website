export function ClearIcon({ size = 28, className = '' }) {
  return (
    <img
      className={`clear-icon ${className}`.trim()}
      src="/assets/logo.png"
      alt="CLEAR logo"
      style={{ width: size, height: size }}
    />
  );
}
