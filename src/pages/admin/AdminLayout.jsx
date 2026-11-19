import { NavLink, Link, Outlet, useLocation } from 'react-router-dom';
import { ArrowLeft, CalendarClock, Clapperboard, CreditCard, LayoutDashboard, Armchair, Ticket, Users, UtensilsCrossed } from 'lucide-react';
import { Logo } from '../../components/common';
import { PageTransition } from '../../components/layout/Layouts';
import { useAuth } from '../../contexts/AuthContext';
import { ROLES, can } from '../../utils/permissions';
import { DEMO_MODE } from '../../services/api/client';

const NAV = [
  { to: '/admin', label: 'Tableau de bord', icon: LayoutDashboard, end: true, perm: 'dashboard:view' },
  { to: '/admin/reservations', label: 'Réservations', icon: Ticket, perm: 'reservations:view' },
  { to: '/admin/transactions', label: 'Finances', icon: CreditCard, perm: 'payments:view' },
  { to: '/admin/films', label: 'Films', icon: Clapperboard, perm: 'films:manage' },
  { to: '/admin/seances', label: 'Séances', icon: CalendarClock, perm: 'sessions:manage' },
  { to: '/admin/salles', label: 'Salles & plans', icon: Armchair, perm: 'halls:manage' },
  { to: '/admin/restaurants', label: 'Restaurants & plans', icon: UtensilsCrossed, perm: 'restaurants:manage' },
  { to: '/admin/utilisateurs', label: 'Utilisateurs', icon: Users, perm: 'users:manage' },
];

export default function AdminLayout() {
  const { user } = useAuth();
  const loc = useLocation();
  const items = NAV.filter((n) => can(user, n.perm));
  const editor = loc.pathname.startsWith('/admin/plans/');
  const link = ({ isActive }) => `flex items-center gap-3 rounded-[3px] px-3 py-2.5 text-sm font-medium transition-colors ${isActive ? 'bg-paper text-ink' : 'text-mist hover:bg-ink-3 hover:text-paper'}`;

  return (
    <div className={`min-h-[100dvh] bg-ink ${editor ? '' : 'lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]'}`}>
      <aside className={`relative border-b border-line bg-ink-2 lg:sticky lg:top-0 lg:h-[100dvh] lg:border-b-0 lg:border-r ${editor ? 'hidden' : ''}`}>
        <div className="flex items-center justify-between px-5 py-5">
          <Link to="/admin"><Logo /></Link>
          {DEMO_MODE && <span className="rounded-full border border-warn/40 px-2 py-0.5 text-[0.625rem] font-bold uppercase text-warn">Démo</span>}
        </div>
        <nav aria-label="Administration" className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:overflow-visible">
          {items.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={(s) => `${link(s)} shrink-0`}><Icon className="size-4" />{label}</NavLink>
          ))}
        </nav>
        <div className="hidden px-5 lg:absolute lg:bottom-5 lg:block">
          <p className="text-sm font-semibold">{user.name}</p>
          <p className="text-xs text-mist">{ROLES[user.role]}</p>
          <Link to="/" className="mt-3 inline-flex items-center gap-1.5 text-xs text-mist hover:text-paper"><ArrowLeft className="size-3.5" />Retour au site</Link>
        </div>
      </aside>
      <PageTransition>
        <main id="contenu" className={editor ? '' : 'mx-auto w-full max-w-[1400px] px-4 py-8 sm:px-8'}>
          <Outlet />
        </main>
      </PageTransition>
    </div>
  );
}

export function AdminHeader({ title, children, description }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="display text-4xl sm:text-5xl">{title}</h1>
        {description && <p className="mt-2 text-mist">{description}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}
