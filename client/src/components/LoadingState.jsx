export function LoadingState({ rows = 4 }) {
  return (
    <div className="loading-stack" role="status" aria-label="Loading content">
      {Array.from({ length: rows }, (_, index) => (
        <div className="skeleton-card" key={index}>
          <span className="skeleton skeleton--icon" />
          <span className="skeleton-lines">
            <span className="skeleton skeleton--short" />
            <span className="skeleton skeleton--title" />
            <span className="skeleton skeleton--medium" />
          </span>
        </div>
      ))}
    </div>
  );
}
