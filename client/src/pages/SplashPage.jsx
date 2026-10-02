import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.js';
import { ClearIcon } from '../components/ClearIcon.jsx';

export function SplashPage() {
  const { user } = useAuth();

  return (
    <main className="splash-page">
      <div className="splash-page__content">
        <span className="splash-page__icon"><ClearIcon size={94} /></span>
        <p className="splash-page__wordmark">CLEAR</p>
        <p className="splash-page__tagline">Centralized Logging for Ethics Approval and Review</p>
        <div className="splash-page__actions">
          <Link className="splash-page__login" to={user ? '/' : '/landing'}>
            {user ? 'Dashboard' : 'Login'}
          </Link>
        </div>
      </div>
    </main>
  );
}
