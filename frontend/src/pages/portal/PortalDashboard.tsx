import { useState, useEffect } from 'react';
import { FolderOpen, FileText, Ticket, Upload, AlertTriangle } from 'lucide-react';
import api from '../../services/api';

interface PortalProject {
  id: string;
  name: string;
  status: string;
  progress: number;
  estimatedEnd?: string;
}

interface DocumentRequest {
  id: string;
  subject: string;
  description?: string;
  status: string;
  createdAt: string;
}

interface DashboardData {
  projects: PortalProject[];
  openTickets: number;
  pendingQuotes: number;
  documentRequests: DocumentRequest[];
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="w-full bg-gray-100 rounded-full h-2">
      <div
        className="bg-blue-500 h-2 rounded-full transition-all"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export default function PortalDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get('/portal/projects'),
      api.get('/portal/tickets'),
      api.get('/portal/quotes'),
      api.get('/portal/document-requests').catch(() => ({ data: [] })),
    ]).then(([projRes, ticketRes, quotesRes, docReqRes]) => {
      const projects: PortalProject[] = Array.isArray(projRes.data) ? projRes.data : (projRes.data.data ?? []);
      const tickets = Array.isArray(ticketRes.data) ? ticketRes.data : (ticketRes.data.data ?? []);
      const quotes = Array.isArray(quotesRes.data) ? quotesRes.data : (quotesRes.data.data ?? []);
      const docRequests: DocumentRequest[] = Array.isArray(docReqRes.data) ? docReqRes.data : (docReqRes.data.data ?? []);
      setData({
        projects,
        openTickets: tickets.filter((t: { status: string }) => t.status === 'open' || t.status === 'in_progress').length,
        pendingQuotes: quotes.filter((q: { status: string }) => q.status === 'sent' || q.status === 'pending').length,
        documentRequests: docRequests,
      });
    }).catch(() => setError('Errore caricamento dati portale.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-4 sm:p-6 flex items-center justify-center h-64">
        <div className="text-gray-400 animate-pulse">Caricamento...</div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Benvenuto nel tuo Portale</h1>
        <p className="text-sm text-gray-500 mt-1">Monitora i tuoi progetti, preventivi e richieste di supporto.</p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <a href="/portal/projects" className="bg-blue-50 border border-blue-200 rounded-xl p-5 hover:bg-blue-100 transition-colors">
          <div className="flex flex-wrap items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <FolderOpen className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-blue-700 font-medium">Progetti Attivi</p>
              <p className="text-xl sm:text-2xl font-bold text-blue-800">{data?.projects.length ?? 0}</p>
            </div>
          </div>
        </a>
        <a href="/portal/tickets" className="bg-orange-50 border border-orange-200 rounded-xl p-5 hover:bg-orange-100 transition-colors">
          <div className="flex flex-wrap items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Ticket className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-orange-700 font-medium">Ticket Aperti</p>
              <p className="text-xl sm:text-2xl font-bold text-orange-800">{data?.openTickets ?? 0}</p>
            </div>
          </div>
        </a>
        <a href="/portal/quotes" className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 hover:bg-emerald-100 transition-colors">
          <div className="flex flex-wrap items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-emerald-700 font-medium">Preventivi in Attesa</p>
              <p className="text-xl sm:text-2xl font-bold text-emerald-800">{data?.pendingQuotes ?? 0}</p>
            </div>
          </div>
        </a>
      </div>

      {/* Projects */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-900">I tuoi Progetti</h2>
          <a href="/portal/projects" className="text-sm text-blue-600 hover:text-blue-800">Vedi tutti →</a>
        </div>

        {(data?.projects.length ?? 0) === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">Nessun progetto attivo.</p>
        ) : (
          <div className="space-y-4">
            {data?.projects.slice(0, 5).map((project) => (
              <div key={project.id} className="flex items-center gap-4">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FolderOpen className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{project.name}</p>
                    <span className="text-sm font-semibold text-blue-700 ml-2 flex-shrink-0">{project.progress ?? 0}%</span>
                  </div>
                  <ProgressBar value={project.progress ?? 0} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Document Requests */}
      {(data?.documentRequests?.length ?? 0) > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex flex-wrap items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <h2 className="text-lg font-semibold text-gray-900">Documenti da Caricare</h2>
            </div>
            <a href="/portal/files" className="text-sm text-blue-600 hover:text-blue-800">Vai ai documenti &rarr;</a>
          </div>
          <div className="space-y-3">
            {data?.documentRequests.map((req) => (
              <div key={req.id} className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Upload className="w-4 h-4 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{req.subject}</p>
                  {req.description && (
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{req.description}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(req.createdAt).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <a
                  href="/portal/files"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors flex-shrink-0"
                >
                  <Upload className="w-3 h-3" />
                  Carica
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
