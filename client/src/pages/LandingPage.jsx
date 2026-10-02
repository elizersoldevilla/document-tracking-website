import { Link } from 'react-router-dom';
import { ClearIcon } from '../components/ClearIcon.jsx';

export function LandingPage() {
  return (
    <main className="login-story login-story--landing">
      <ClearIcon className="login-story__watermark" size={520} />
      <div className="login-story__head">
        <Link className="login-story__logo" to="/welcome">CLEAR</Link>
        <p className="login-story__meaning">Centralized Logging for Ethics Approval and Review</p>
      </div>
      <div className="login-story__content">
        <h1>Track your ethics application with clarity.</h1>
        <p>
          A centralized platform for monitoring ethics applications, requirements,
          revisions, and approval progress.
        </p>
        <div className="login-story__cta">
          <Link className="button button--lime" to="/login">
            Access using your TUA email
          </Link>
        </div>
      </div>
    </main>
  );
}
