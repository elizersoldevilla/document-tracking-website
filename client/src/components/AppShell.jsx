import {
  Bell,
  FileCheck2,
  FilePlus2,
  FileText,
  GitPullRequestArrow,
  Home,
  Inbox,
  LayoutDashboard,
  LogOut,
  Plus,
  ScrollText,
  UserRound,
} from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.js';
import { useActivity } from '../hooks/useActivity.js';
import { useDocuments } from '../hooks/useDocuments.js';
import { getReadIds } from '../utils/activity.js';
import { getRoleLabel } from '../utils/presentation.js';
import { Avatar } from './Avatar.jsx';
import { BrandMark } from './BrandMark.jsx';

function navClassName({ isActive }) {
  return `side-nav__link ${isActive ? 'side-nav__link--active' : ''}`;
}

const STUDENT_LINKS = [
  {
    label: 'Workspace',
    items: [
      { to: '/', icon: <Home size={18} />, text: 'Home', end: true },
      { to: '/application', icon: <FileText size={18} />, text: 'Application', end: true },
      { to: '/requests/new', icon: <FilePlus2 size={18} />, text: 'New request' },
    ],
  },
  {
    label: 'Activity',
    items: [
      { to: '/action-center', icon: <GitPullRequestArrow size={18} />, text: 'Action Center' },
      { to: '/notifications', icon: <Bell size={18} />, text: 'Notifications' },
    ],
  },
  {
    label: 'Account',
    items: [{ to: '/profile', icon: <UserRound size={18} />, text: 'Profile' }],
  },
];

const PROFESSOR_LINKS = [
  {
    label: 'Workspace',
    items: [
      { to: '/', icon: <Home size={18} />, text: 'Dashboard', end: true },
      { to: '/committee/new', icon: <Inbox size={18} />, text: 'New applications' },
      { to: '/committee/review', icon: <GitPullRequestArrow size={18} />, text: 'Under review' },
      { to: '/committee/revision', icon: <GitPullRequestArrow size={18} />, text: 'For revision' },
      { to: '/committee/pending', icon: <GitPullRequestArrow size={18} />, text: 'Pending decision' },
      { to: '/committee/approved', icon: <FileCheck2 size={18} />, text: 'Signed / approved' },
      { to: '/committee/queue', icon: <LayoutDashboard size={18} />, text: 'Application queue' },
    ],
  },
  {
    label: 'Resources',
    items: [{ to: '/guidelines', icon: <ScrollText size={18} />, text: 'Guidelines' }],
  },
  {
    label: 'Activity',
    items: [
      { to: '/action-center', icon: <GitPullRequestArrow size={18} />, text: 'Action Center' },
      { to: '/notifications', icon: <Bell size={18} />, text: 'Notifications' },
    ],
  },
  {
    label: 'Account',
    items: [{ to: '/profile', icon: <UserRound size={18} />, text: 'Profile' }],
  },
];

const ADMIN_LINKS = [
  {
    label: 'Workspace',
    items: [
      { to: '/', icon: <Home size={18} />, text: 'Dashboard', end: true },
      { to: '/committee/endorsed', icon: <Inbox size={18} />, text: 'Endorsed to admin' },
      { to: '/committee/processing', icon: <GitPullRequestArrow size={18} />, text: 'Processing' },
      { to: '/committee/ready', icon: <FileCheck2 size={18} />, text: 'Ready for pickup' },
      { to: '/committee/completed', icon: <LayoutDashboard size={18} />, text: 'Completed' },
      { to: '/committee/queue', icon: <Inbox size={18} />, text: 'Application queue' },
    ],
  },
  {
    label: 'Resources',
    items: [{ to: '/guidelines', icon: <ScrollText size={18} />, text: 'Guidelines' }],
  },
  {
    label: 'Activity',
    items: [
      { to: '/action-center', icon: <GitPullRequestArrow size={18} />, text: 'Action Center' },
      { to: '/notifications', icon: <Bell size={18} />, text: 'Notifications' },
    ],
  },
  {
    label: 'Account',
    items: [{ to: '/profile', icon: <UserRound size={18} />, text: 'Profile' }],
  },
];

function getLinks(role) {
  if (role === 'professor') return PROFESSOR_LINKS;
  if (role === 'admin') return ADMIN_LINKS;
  return STUDENT_LINKS;
}

function MobileBell({ hasUnread }) {
  return (
    <span className="mobile-nav__bell">
      <Bell size={22} />
      {hasUnread ? <i className="mobile-nav__dot" aria-hidden="true" /> : null}
    </span>
  );
}

export function AppShell() {
  const { user, logout } = useAuth();
  const { events } = useActivity();
  const hasUnread = events.some((event) => !getReadIds().has(event.id));
  const isStudent = user.role === 'student';
  const groups = getLinks(user.role);
  const documents = useDocuments({ limit: 50 });
  const latest = isStudent
    ? documents.items.reduce(
        (newest, item) => (!newest || new Date(item.updatedAt) > new Date(newest.updatedAt) ? item : newest),
        null,
      )
    : null;
  const newRequestTo = latest ? `/application/${latest.id}/requirements` : '/requests/new';

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <aside className="side-nav">
        <BrandMark inverse />
        <nav className="side-nav__links" aria-label="Primary navigation">
          {groups.map((group) => (
            <div className="side-nav__group" key={group.label}>
              <p className="side-nav__label">{group.label}</p>
              {group.items.map((item) => (
                <NavLink
                  to={item.text === 'New request' ? newRequestTo : item.to}
                  end={item.end}
                  className={navClassName}
                  key={item.to}
                >
                  {item.icon} {item.text}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="side-nav__footer">
          <div className="user-chip">
            <Avatar name={user.name} />
            <span>
              <strong>{user.name}</strong>
              <small>{getRoleLabel(user.role)}</small>
            </span>
          </div>
          <button type="button" className="button button--dark button--full" onClick={logout}>
            <LogOut size={18} /> Sign out
          </button>
        </div>
      </aside>

      <div className="app-shell__body">
        <header className="mobile-header">
          <BrandMark compact />
        </header>
        <header className="page-header">
          <div className="page-header__identity">
            <span className="page-header__avatar"><Avatar name={user.name} /></span>
            <div>
              <p className="eyebrow">Good day!</p>
              <h1>{user.name}</h1>
            </div>
          </div>
          <div className="page-header__role">
            <FileCheck2 size={19} />
            <span>{getRoleLabel(user.role)} workspace</span>
          </div>
        </header>
        <main className="page-content" id="main-content">
          <Outlet />
        </main>
      </div>

      <nav className="mobile-nav" aria-label="Mobile navigation">
        <NavLink to="/" end className={({ isActive }) => (isActive ? 'is-active' : '')}>
          <Home size={22} />
          <span>Home</span>
        </NavLink>
        {isStudent ? (
          <>
            <NavLink to="/application" className={({ isActive }) => (isActive ? 'is-active' : '')}>
              <FileText size={22} />
              <span>Application</span>
            </NavLink>
            <NavLink
              to="/action-center"
              className={({ isActive }) => `${isActive ? 'is-active ' : ''}mobile-nav__primary-action`}
            >
              <Plus size={27} />
              <span>Action Center</span>
            </NavLink>
            <NavLink to="/notifications" className={({ isActive }) => (isActive ? 'is-active' : '')}>
              <MobileBell hasUnread={hasUnread} />
              <span>Notifications</span>
            </NavLink>
            <NavLink to="/profile" className={({ isActive }) => (isActive ? 'is-active' : '')}>
              <UserRound size={22} />
              <span>Profile</span>
            </NavLink>
          </>
        ) : (
          <>
            <NavLink to="/guidelines" className={({ isActive }) => (isActive ? 'is-active' : '')}>
              <ScrollText size={22} />
              <span>Guidelines &amp; Templates</span>
            </NavLink>
            <NavLink
              to="/action-center"
              className={({ isActive }) => `${isActive ? 'is-active ' : ''}mobile-nav__primary-action`}
            >
              <Plus size={27} />
              <span>Action Center</span>
            </NavLink>
            <NavLink to="/notifications" className={({ isActive }) => (isActive ? 'is-active' : '')}>
              <MobileBell hasUnread={hasUnread} />
              <span>Notifications</span>
            </NavLink>
            <NavLink to="/profile" className={({ isActive }) => (isActive ? 'is-active' : '')}>
              <UserRound size={22} />
              <span>Profile</span>
            </NavLink>
          </>
        )}
      </nav>
    </div>
  );
}
