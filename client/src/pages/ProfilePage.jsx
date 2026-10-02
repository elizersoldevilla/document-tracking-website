import { ChevronRight, Headset, Info, Mail, Pencil, Tag, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.js';
import { getRoleLabel } from '../utils/presentation.js';

const ABOUT_ROWS = ['Personal Information', 'Academic Information', 'Contact Details', 'My Application'];
const SETTINGS_ROWS = ['Theme', 'Privacy & Security Center', 'Notification Settings', 'Change Password'];
const HELP_ROWS = ['FAQs & Help Centre', 'Terms & Conditions', 'Feedback'];

function ProfilePanel({ title, children }) {
  return (
    <section className="profile-panel">
      <h2 className="profile-panel__title">{title}</h2>
      <div className="profile-panel__rows">{children}</div>
    </section>
  );
}

function ProfileRow({ label, value }) {
  return (
    <div className="profile-row">
      <span>{label}</span>
      {value ? <strong className="profile-row__value">{value}</strong> : <ChevronRight size={15} aria-hidden="true" />}
    </div>
  );
}

export function ProfilePage() {
  const { user, logout } = useAuth();

  return (
    <div className="dashboard-stack ac-sub bare-page">
      <div>
        <h1 className="page-title page-title--lime page-title--big">Profile</h1>
        <p className="page-subtext">View and manage your account information.</p>
      </div>

      <section className="profile-card">
        <span className="profile-card__avatar profile-card__avatar--silhouette" aria-hidden="true"><UserRound size={34} strokeWidth={1.7} /></span>
        <div className="profile-card__body">
          <h2>{user.name}</h2>
          <p><Mail size={14} /> {user.email}</p>
          <p><Tag size={14} /> {getRoleLabel(user.role)}</p>
        </div>
        <span className="profile-card__edit" aria-hidden="true"><Pencil size={14} /></span>
      </section>

      <ProfilePanel title="About you">
        {ABOUT_ROWS.map((label) => <ProfileRow key={label} label={label} />)}
      </ProfilePanel>

      <ProfilePanel title="Settings">
        {SETTINGS_ROWS.map((label) => <ProfileRow key={label} label={label} />)}
      </ProfilePanel>

      <ProfilePanel title="Help & Support">
        {HELP_ROWS.map((label) => <ProfileRow key={label} label={label} />)}
        <ProfileRow label="Version" value="V 1.0.0.0" />
      </ProfilePanel>

      <section className="profile-banner">
        <span className="profile-banner__icon" aria-hidden="true"><Info size={15} strokeWidth={2.5} /></span>
        <div className="profile-banner__text">
          <strong>Need assistance?</strong>
          <p>Reach out to the ERC via Message Center</p>
        </div>
        <Link className="profile-banner__cta" to="/action-center/messages"><Headset size={14} /> Contact Us</Link>
      </section>

      <button type="button" className="profile-logout" onClick={logout}>
        Log out
      </button>
    </div>
  );
}
