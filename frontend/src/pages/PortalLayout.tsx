import { ReactNode } from 'react';
import { useLocation, Navigate } from 'react-router-dom';
import { FolderOpen, LayoutDashboard, FileText, Ticket, Files, LogOut } from 'lucide-react';
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

function PortalSidebar() {
  const location = useLocation();
  return (
    <aside className="bg-slate-900 text-white w-56 flex flex-col flex-shrink-0">
      <div className="flex items-center gap-3 px-5 h-16 border-b border-slate-700">
        <img src={logoUrl} alt="Connecteed" className="h-5" />
        <p className="text-xs text-slate-400 ml-1">Portale</p>
      </div>
      <nav className="flex-1 py-4 space-y-1">
        {PORTAL_NAV.map((item) => {
          const isActive = location.pathname === item.path || (item.path !== '/portal' && location.pathname.startsWith(item.path));
          return (
            <a
              key={item.path}
              href={item.path}
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
          onClick={() => {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('user_type');
            window.location.href = '/portal/login';
          }}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors w-full"
        >
          <LogOut className="w-4 h-4" />
          Esci
        </button>
      </div>
    </aside>
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
  return (
    <PortalProtectedRoute>
      <div className="flex h-screen bg-gray-50">
        <PortalSidebar />
        <main className="flex-1 overflow-y-auto">
          <header className="bg-white border-b border-gray-200 h-14 flex items-center px-6 sticky top-0 z-10">
            <div className="flex-1" />
            <button
              onClick={() => {
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
                localStorage.removeItem('user_type');
                window.location.href = '/portal/login';
              }}
              className="text-xs text-gray-500 hover:text-red-600"
            >
              Logout
            </button>
          </header>
          {children}
        </main>
      </div>
    </PortalProtectedRoute>
  );
}
