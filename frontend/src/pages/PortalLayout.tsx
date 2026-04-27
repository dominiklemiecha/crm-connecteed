import { ReactNode, useState, useEffect } from 'react';
import { useLocation, Navigate } from 'react-router-dom';
import { FolderOpen, LayoutDashboard, FileText, Ticket, Files, LogOut, Menu, X } from 'lucide-react';
import logoUrl from '../assets/logo-connecteed.svg';

const PORTAL_NAV = [
  { label: 'Dashboard', path: '/portal', icon: <LayoutDashboard className="w-5 h-5" /> },
  { label: 'Progetti', path: '/portal/projects', icon: <FolderOpen className="w-5 h-5" /> },
  { label: 'Preventivi', path: '/portal/quotes', icon: <FileText className="w-5 h-5" /> },
  { label: 'Ticket', path: '/portal/tickets', icon: <Ticket className="w-5 h-5" /> },
  { label: 'Documenti', path: '/portal/files', icon: <Files className="w-5 h-5" /> },
];

interface PortalLayoutProps {
  children: ReactNode;
}

function logout() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user_type');
  window.location.href = '/portal/login';
}

function PortalSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const location = useLocation();
  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={onClose} aria-hidden="true" />
      )}
      <aside
        className={`bg-slate-900 text-white w-60 flex flex-col fixed inset-y-0 left-0 z-40 transform transition-transform duration-200 lg:translate-x-0 lg:static lg:z-0 ${
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex items-center justify-between gap-3 px-4 h-14 border-b border-slate-700">
          <div className="flex items-center gap-2 min-w-0">
            <img src={logoUrl} alt="Connecteed" className="h-5" />
            <p className="text-xs text-slate-400 truncate">Portale</p>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden text-slate-400 hover:text-white p-1"
            aria-label="Chiudi menu"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        <nav className="flex-1 py-3 space-y-1 overflow-y-auto sidebar-scroll">
          {PORTAL_NAV.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== '/portal' && location.pathname.startsWith(item.path));
            return (
              <a
                key={item.path}
                href={item.path}
                onClick={onClose}
                className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors mx-2 rounded-lg ${isActive ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
              >
                {item.icon}
                <span>{item.label}</span>
              </a>
            );
          })}
        </nav>
        <div className="border-t border-slate-700 p-4">
          <button
            onClick={logout}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors w-full"
          >
            <LogOut className="w-4 h-4" />
            Esci
          </button>
        </div>
      </aside>
    </>
  );
}

function PortalProtectedRoute({ children }: { children: ReactNode }) {
  const token = localStorage.getItem('access_token');
  const userType = localStorage.getItem('user_type');
  if (!token || userType !== 'client') {
    return <Navigate to="/portal/login" replace />;
  }
  return <>{children}</>;
}

export default function PortalLayout({ children }: PortalLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  return (
    <PortalProtectedRoute>
      <div className="flex min-h-screen bg-gray-50">
        <PortalSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="flex-1 flex flex-col min-w-0">
          <header className="bg-white border-b border-gray-200 h-14 flex items-center justify-between px-3 sm:px-6 sticky top-0 z-20">
            <div className="flex items-center gap-2 lg:hidden">
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 -ml-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
                aria-label="Apri menu"
              >
                <Menu className="w-6 h-6" />
              </button>
              <img src={logoUrl} alt="Connecteed" className="h-5" />
            </div>
            <div className="hidden lg:block flex-1" />
            <button
              onClick={logout}
              className="text-xs text-gray-500 hover:text-red-600 px-2 py-1"
            >
              Logout
            </button>
          </header>
          <div className="flex-1 overflow-y-auto">{children}</div>
        </main>
      </div>
    </PortalProtectedRoute>
  );
}
