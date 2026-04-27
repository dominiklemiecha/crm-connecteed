import { useState, useEffect, useCallback } from 'react';
import { FolderKanban, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';
import StatusBadge from '@/components/StatusBadge';

interface Project {
  id: string;
  projectNumber: string;
  name: string;
  status: string;
  progressPercent: number;
  createdAt: string;
  company?: { name: string };
  pmUser?: { firstName: string; lastName: string };
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/projects');
      setProjects(data.data ?? data);
    } catch { setProjects([]); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FolderKanban className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 flex-shrink-0" />
            Progetti
          </h1>
          <p className="text-xs sm:text-sm text-gray-500">Gestione progetti e delivery</p>
        </div>
        <button
          onClick={fetchProjects}
          className="flex items-center justify-center gap-2 px-3 py-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200 text-gray-600 self-start"
          aria-label="Ricarica"
        >
          <RefreshCw className="w-4 h-4" />
          <span className="sm:hidden">Ricarica</span>
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
              <div className="h-3 bg-gray-200 rounded w-20 mb-3" />
              <div className="h-5 bg-gray-200 rounded w-3/4 mb-4" />
              <div className="h-2 bg-gray-200 rounded w-full" />
            </div>
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-20">
          <FolderKanban className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Nessun progetto attivo</p>
          <p className="text-xs text-gray-400 mt-1">
            I progetti vengono creati automaticamente da opportunità vinte con pagamento OK
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p) => (
            <div
              key={p.id}
              onClick={() => navigate(`/projects/${p.id}`)}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md hover:border-blue-200 transition-all cursor-pointer group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="min-w-0">
                  <p className="text-xs text-gray-400 font-mono">{p.projectNumber}</p>
                  <h3 className="font-semibold text-gray-900 mt-1 group-hover:text-blue-700 transition-colors truncate">
                    {p.name || 'Progetto'}
                  </h3>
                  {p.company && (
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{p.company.name}</p>
                  )}
                </div>
                <StatusBadge status={p.status} />
              </div>

              {p.pmUser && (
                <p className="text-xs text-gray-400 mb-3">
                  PM: {p.pmUser.firstName} {p.pmUser.lastName}
                </p>
              )}

              <div className="mt-3">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Avanzamento</span>
                  <span className="font-medium">{p.progressPercent || 0}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      p.progressPercent >= 100
                        ? 'bg-emerald-500'
                        : p.progressPercent > 50
                        ? 'bg-blue-500'
                        : 'bg-blue-400'
                    }`}
                    style={{ width: `${p.progressPercent || 0}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
