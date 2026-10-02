import { useEffect, useRef, useState } from 'react';
import { Building2, Eye, EyeOff, GraduationCap, UserRound } from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../auth/AuthContext.js';
import { BrandMark } from '../components/BrandMark.jsx';
import { ClearIcon } from '../components/ClearIcon.jsx';
import { Notice } from '../components/Notice.jsx';

const DEMO_ICONS = {
  student: GraduationCap,
  professor: UserRound,
  admin: Building2,
};

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [demoAccounts, setDemoAccounts] = useState([]);
  const emailRef = useRef(null);

  useEffect(() => {
    let active = true;
    api.demoAccounts()
      .then((accounts) => {
        if (active) setDemoAccounts(accounts);
      })
      .catch(() => {
        if (active) setDemoAccounts([]);
      });
    return () => {
      active = false;
    };
  }, []);

  if (user) return <Navigate to="/" replace />;

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function authenticate(credentials) {
    setSubmitting(true);
    setError('');
    try {
      await login(credentials);
      navigate('/', { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    authenticate(form);
  }

  function handleDemoLogin(account) {
    setForm({ email: account.email, password: account.password });
    authenticate({ email: account.email, password: account.password });
  }

  return (
    <main className="login-page">
      <section className="login-story login-story--login">
        <BrandMark inverse />
        <div className="login-story__content">
          <h1>Track your ethics application with clarity.</h1>
          <p>A centralized platform for monitoring ethics applications, requirements, revisions, and approval progress.</p>
        </div>
        <ClearIcon className="login-story__watermark" size={420} />
      </section>
      <section className="login-panel">
        <div className="login-form">
          <span className="login-form__mark"><ClearIcon size={78} /></span>

          <Notice type="error" message={error} onDismiss={() => setError('')} />

          <form className="form-stack" onSubmit={handleSubmit}>
            <label className="field">
              <span>TUA Email</span>
              <input
                ref={emailRef}
                type="email"
                name="email"
                autoComplete="email"
                value={form.email}
                onChange={updateField}
                placeholder="Enter your email"
                maxLength="190"
                required
              />
            </label>
            <label className="field">
              <span>Password</span>
              <span className="password-field">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  autoComplete="current-password"
                  value={form.password}
                  onChange={updateField}
                  placeholder="Enter your password"
                  maxLength="128"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </span>
            </label>

            {demoAccounts.length > 0 && (
              <div className="login-roles" role="group" aria-label="Quick sign in">
                {demoAccounts.map((account) => {
                  const Icon = DEMO_ICONS[account.role] || UserRound;
                  return (
                    <button
                      type="button"
                      className="login-role"
                      key={account.role}
                      onClick={() => handleDemoLogin(account)}
                      disabled={submitting}
                      aria-label={`Sign in as ${account.label}`}
                    >
                      <span className={`login-role__avatar login-role__avatar--${account.role}`}>
                        <Icon size={30} strokeWidth={1.6} />
                      </span>
                      <small>{account.role === 'student' ? 'Student' : 'IERC'}</small>
                    </button>
                  );
                })}
              </div>
            )}

            <button type="submit" className="button button--enter button--full" disabled={submitting}>
              {submitting ? 'Signing in…' : 'ENTER'}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
