import { NavLink, Route, Routes } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Readiness from './pages/Readiness';
import Narrative from './pages/Narrative';
import Budget from './pages/Budget';
import Compliance from './pages/Compliance';
import Program from './pages/Program';
import Documents from './pages/Documents';
import Profile from './pages/Profile';
import { ToastProvider } from './components/Toast';

const NAV = [
  ['/', '🏠', 'Dashboard'],
  ['/readiness', '☑️', 'Readiness'],
  ['/narrative', '✍️', 'Narrative'],
  ['/budget', '💵', 'Budget'],
  ['/compliance', '📅', 'Compliance'],
  ['/documents', '📁', 'Documents'],
  ['/program', '📚', 'Program'],
  ['/profile', '🏥', 'Profile'],
] as const;

export default function App() {
  return (
    <ToastProvider>
      <div className="shell">
        <aside className="sidebar">
          <div className="brand">
            <strong>RHTP Navigator</strong>
            <span>Rural Health Transformation Program</span>
          </div>
          <nav className="nav">
            {NAV.map(([to, icon, label]) => (
              <NavLink key={to} to={to} end={to === '/'}>
                <span className="icon">{icon}</span>
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="foot">Reference content is a starting point. Confirm requirements with your state lead agency and the CMS NOFO.</div>
        </aside>
        <main className="main">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/readiness" element={<Readiness />} />
            <Route path="/narrative" element={<Narrative />} />
            <Route path="/budget" element={<Budget />} />
            <Route path="/compliance" element={<Compliance />} />
            <Route path="/documents" element={<Documents />} />
            <Route path="/program" element={<Program />} />
            <Route path="/profile" element={<Profile />} />
          </Routes>
        </main>
      </div>
    </ToastProvider>
  );
}
