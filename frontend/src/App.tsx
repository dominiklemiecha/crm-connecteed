import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useState, useEffect, ReactNode } from 'react';
import logoUrl from './assets/logo-connecteed.svg';

// Pages
import LoginPage from './pages/LoginPage';
import CompaniesPage from './pages/CompaniesPage';
import CompanyDetailPage from './pages/CompanyDetailPage';
import LeadsPage from './pages/LeadsPage';
import OpportunitiesPage from './pages/OpportunitiesPage';
import TicketsPage from './pages/TicketsPage';
import QuotesPage from './pages/QuotesPage';
import ApprovalsPage from './pages/ApprovalsPage';
import ContractsPage from './pages/ContractsPage';
import InvoicesPage from './pages/InvoicesPage';
import ProjectsPage from './pages/ProjectsPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import DeliveredProjectsPage from './pages/DeliveredProjectsPage';
import FilesPage from './pages/FilesPage';
import NotificationsPage from './pages/NotificationsPage';
import AuditLogPage from './pages/AuditLogPage';
import ProductsPage from './pages/ProductsPage';
import DepartmentsPage from './pages/DepartmentsPage';
import UsersPage from './pages/UsersPage';
import ReportsPage from './pages/ReportsPage';
import TimeTrackingPage from './pages/TimeTrackingPage';
import TemplatesPage from './pages/TemplatesPage';
import PortalLayout from './pages/PortalLayout';
import PortalLoginPage from './pages/portal/PortalLoginPage';
import PortalDashboard from './pages/portal/PortalDashboard';
import PortalProjectsPage from './pages/portal/PortalProjectsPage';
import PortalQuotesPage from './pages/portal/PortalQuotesPage';
import PortalTicketsPage from './pages/portal/PortalTicketsPage';
import PortalFilesPage from './pages/portal/PortalFilesPage';
import api from './services/api';

const NAV_ITEMS: Array<{ label: string; path: string; icon: string; separator?: boolean }> = [
  { label: 'Dashboard', path: '/', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4' },
  { label: 'Aziende', path: '/companies', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
  { label: 'Lead', path: '/leads', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
  { label: 'Opportunita', path: '/opportunities', icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' },
  { label: 'Preventivi', path: '/quotes', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { label: 'Approvazioni', path: '/approvals', icon: 'M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
  { label: 'Contratti', path: '/contracts', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { label: 'Fatture', path: '/invoices', icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z' },
  { label: 'Progetti', path: '/projects', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z' },
  { label: 'Progetti Consegnati', path: '/delivered-projects', icon: 'M21 12a9 9 0 11-18 0 9 9 0 0118 0zM3.6 9h16.8M3.6 15h16.8M11.5 3a17 17 0 000 18M12.5 3a17 17 0 010 18' },
  { label: 'Ore Lavorate', path: '/time-tracking', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
  { label: 'Ticket', path: '/tickets', icon: 'M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z' },
  { label: 'Documenti', path: '/files', icon: 'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z' },
  { label: 'Report', path: '/reports', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', separator: true },
  { label: 'Notifiche', path: '/notifications', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
  { label: 'Prodotti', path: '/products', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10', separator: true },
  { label: 'Reparti', path: '/departments', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
  { label: 'Template', path: '/templates', icon: 'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z' },
  { label: 'Utenti', path: '/users', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
  { label: 'Registro', path: '/audit-log', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
];

function SvgIcon({ d }: { d: string }) {
  return <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d={d} /></svg>;
}

function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const location = useLocation();
  const userRaw = localStorage.getItem('user');
  const user = userRaw ? JSON.parse(userRaw) : null;
  const fullName = user ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() : 'Utente';
  const initials = user
    ? `${(user.firstName?.[0] ?? '').toUpperCase()}${(user.lastName?.[0] ?? '').toUpperCase()}`
    : 'U';
  const roleLabel = user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : '';

  return (
    <>
      {/* Overlay mobile */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={`bg-slate-900 text-white flex flex-col w-64 fixed inset-y-0 left-0 z-40 transform transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 lg:z-0 ${
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex items-center justify-between px-4 h-14 border-b border-slate-700">
          <img src={logoUrl} alt="Connecteed" className="h-6" />
          <button
            onClick={onClose}
            className="lg:hidden text-slate-400 hover:text-white p-1"
            aria-label="Chiudi menu"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <nav className="flex-1 py-3 space-y-0.5 overflow-y-auto sidebar-scroll">
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <div key={item.path}>
                {item.separator && <div className="border-t border-slate-700 mx-4 my-2" />}
                <a
                  href={item.path}
                  onClick={onClose}
                  className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors mx-2 rounded-lg ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <SvgIcon d={item.icon} />
                  <span className="truncate">{item.label}</span>
                </a>
              </div>
            );
          })}
        </nav>
        <div className="border-t border-slate-700 p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">{initials}</div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{fullName}</p>
              <p className="text-xs text-slate-400 truncate">{roleLabel}</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

interface DashboardData {
  leadsActive: number;
  opportunitiesActive: number;
  ticketsOpen: number;
  quotesPending: number;
  projectsActive: number;
  invoicesOverdue: number;
  approvalsPending: number;
  pipelineValueCents: number;
}

function KPICard({ label, value, sub, color, loading }: { label: string; value: string; sub: string; color: string; loading?: boolean }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    orange: 'bg-orange-50 text-orange-700 border-orange-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    cyan: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
  };
  return (
    <div className={`rounded-xl border p-4 sm:p-5 ${colors[color] || colors.blue}`}>
      <p className="text-xs sm:text-sm font-medium opacity-80 truncate">{label}</p>
      {loading ? (
        <div className="h-7 sm:h-9 bg-current opacity-10 rounded mt-1 animate-pulse" />
      ) : (
        <p className="text-xl sm:text-3xl font-bold mt-1 truncate">{value}</p>
      )}
      <p className="text-[10px] sm:text-xs mt-1 sm:mt-2 opacity-60 truncate">{sub}</p>
    </div>
  );
}

function Dashboard() {
  const [kpis, setKpis] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get<DashboardData>('/dashboard');
        if (!cancelled) { setKpis(data); setLoading(false); }
      } catch {
        if (!cancelled) { setError(true); setLoading(false); }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const fmt = (n?: number) => (n ?? 0).toLocaleString('it-IT');
  const fmtEur = (cents?: number) =>
    `€ ${((cents ?? 0) / 100).toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">Panoramica operativa CRM Connecteed</p>
        </div>
        {error && (
          <p className="text-xs sm:text-sm text-red-600 bg-red-50 px-3 py-1.5 rounded-lg self-start">
            Errore caricamento KPI
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-3 sm:gap-4">
        <KPICard loading={loading} label="Lead Attivi" value={fmt(kpis?.leadsActive)} sub="Pipeline" color="blue" />
        <KPICard loading={loading} label="Opportunita" value={fmt(kpis?.opportunitiesActive)} sub="In lavorazione" color="purple" />
        <KPICard loading={loading} label="Ticket Aperti" value={fmt(kpis?.ticketsOpen)} sub="Da gestire" color="orange" />
        <KPICard loading={loading} label="Preventivi" value={fmt(kpis?.quotesPending)} sub="In attesa" color="cyan" />
        <KPICard loading={loading} label="Progetti Attivi" value={fmt(kpis?.projectsActive)} sub="In corso" color="green" />
        <KPICard loading={loading} label="Fatture Scadute" value={fmt(kpis?.invoicesOverdue)} sub="Da incassare" color="red" />
        <KPICard loading={loading} label="Approvazioni" value={fmt(kpis?.approvalsPending)} sub="In attesa CEO" color="amber" />
        <KPICard loading={loading} label="Pipeline" value={fmtEur(kpis?.pipelineValueCents)} sub="Valore totale" color="green" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">CRM Connecteed</h2>
          <p className="text-sm text-gray-600">Sistema integrato per la gestione completa del ciclo di vita cliente: dalla lead alla delivery, con tracciabilita completa.</p>
          <div className="mt-4 space-y-2">
            {['Gestione Lead e Opportunita', 'Ticketing con SLA', 'Preventivi con approvazione CEO', 'Contratti e firma DocuSign', 'Fatturazione e scadenziario', 'Progetti con WBS e Gantt', 'Portale Cliente dedicato'].map((f) => (
              <div key={f} className="flex items-center gap-2 text-sm text-gray-600">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0" />
                <span>{f}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Accesso Rapido</h2>
          <div className="space-y-2 sm:space-y-3">
            {[
              { label: 'Aziende', href: '/companies', color: 'bg-blue-500' },
              { label: 'Lead', href: '/leads', color: 'bg-purple-500' },
              { label: 'Prodotti', href: '/products', color: 'bg-emerald-500' },
              { label: 'Ticket', href: '/tickets', color: 'bg-orange-500' },
              { label: 'Approvazioni', href: '/approvals', color: 'bg-amber-500' },
              { label: 'Contratti', href: '/contracts', color: 'bg-teal-500' },
            ].map((a) => (
              <a key={a.label} href={a.href} className="flex items-center gap-3 p-2.5 sm:p-3 rounded-lg hover:bg-gray-50 transition-colors">
                <div className={`w-2 h-2 rounded-full ${a.color} flex-shrink-0`} />
                <span className="text-sm text-gray-700">{a.label}</span>
                <svg className="w-4 h-4 text-gray-400 ml-auto flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const token = localStorage.getItem('access_token');
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AuthLayout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // Chiude sidebar quando cambia rotta (mobile)
  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-gray-200 h-14 flex items-center justify-between px-3 sm:px-6 sticky top-0 z-20">
          <div className="flex items-center gap-2 lg:hidden">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 -ml-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
              aria-label="Apri menu"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <img src={logoUrl} alt="Connecteed" className="h-5" />
          </div>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-3 sm:gap-4">
            <a href="/notifications" className="relative text-gray-500 hover:text-gray-700 p-1.5" aria-label="Notifiche">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
            </a>
            <button
              onClick={() => { localStorage.removeItem('access_token'); localStorage.removeItem('refresh_token'); localStorage.removeItem('user'); window.location.href = '/login'; }}
              className="text-xs text-gray-500 hover:text-red-600 px-2 py-1"
            >
              Logout
            </button>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      {/* Portal routes - separate layout */}
      <Route path="/portal/login" element={<PortalLoginPage />} />
      <Route path="/portal" element={<PortalLayout><PortalDashboard /></PortalLayout>} />
      <Route path="/portal/projects" element={<PortalLayout><PortalProjectsPage /></PortalLayout>} />
      <Route path="/portal/quotes" element={<PortalLayout><PortalQuotesPage /></PortalLayout>} />
      <Route path="/portal/tickets" element={<PortalLayout><PortalTicketsPage /></PortalLayout>} />
      <Route path="/portal/files" element={<PortalLayout><PortalFilesPage /></PortalLayout>} />
      {/* Internal app routes */}
      <Route path="/*" element={
        <ProtectedRoute>
          <AuthLayout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/companies" element={<CompaniesPage />} />
              <Route path="/companies/:id" element={<CompanyDetailPage />} />
              <Route path="/leads" element={<LeadsPage />} />
              <Route path="/opportunities" element={<OpportunitiesPage />} />
              <Route path="/tickets" element={<TicketsPage />} />
              <Route path="/quotes" element={<QuotesPage />} />
              <Route path="/approvals" element={<ApprovalsPage />} />
              <Route path="/contracts" element={<ContractsPage />} />
              <Route path="/invoices" element={<InvoicesPage />} />
              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/projects/:id" element={<ProjectDetailPage />} />
              <Route path="/delivered-projects" element={<DeliveredProjectsPage />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/departments" element={<DepartmentsPage />} />
              <Route path="/files" element={<FilesPage />} />
              <Route path="/users" element={<UsersPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/time-tracking" element={<TimeTrackingPage />} />
              <Route path="/templates" element={<TemplatesPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/audit-log" element={<AuditLogPage />} />
              <Route path="*" element={
                <div className="flex items-center justify-center h-96 px-4">
                  <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-300">404</h2>
                    <p className="text-gray-400 mt-2">Pagina non trovata</p>
                  </div>
                </div>
              } />
            </Routes>
          </AuthLayout>
        </ProtectedRoute>
      } />
    </Routes>
  );
}
