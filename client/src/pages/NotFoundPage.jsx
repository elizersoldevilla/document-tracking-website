import { Link } from 'react-router-dom';
import { EmptyState } from '../components/EmptyState.jsx';

export function NotFoundPage() {
  return (
    <EmptyState
      title="Page not found"
      description="The page you requested does not exist in this workspace."
      action={<Link className="button button--dark" to="/">Return to dashboard</Link>}
    />
  );
}
