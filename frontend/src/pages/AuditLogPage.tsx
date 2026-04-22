import { useState, useEffect, useCallback } from 'react';
import { Shield, ChevronDown, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import StatusBadge from '../components/StatusBadge';
import api from '../services/api';

interface AuditLogEntry {
  id: string;
  createdAt: string;
  userId?: string;
  user?: { firstName?: string; lastName?: string; email?: string };
  entityType: string;
  entityId: string;
  action: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  details?: string;
}

interface AuditLogResponse {
  data: AuditLogEntry[];
  total: number;
}

const ENTITY_TYPES = [
  { value: '', label: 'Tutte le entità' },
  { value: 'company', label: 'Azienda' },
  { value: 'lead', label: 'Lead' },
  { value: 'opportunity', label: 'Opportunità' },
  { value: 'ticket', label: 'Ticket' },
  { value: 'quote', label: 'Preventivo' },
  { value: 'contract', label: 'Contratto' },
  { value: 'invoice', label: 'Fattura' },
  { value: 'project', label: 'Progetto' },
];

const PAGE_SIZE = 25;

function JsonViewer({ label, data }: { label: string; data?: Record<string, unknown> }) {
  const [open, setOpen] = useState(false);
  if (!data || Object.keys(data).length === 0) return null;
  return (
    <div className="mt-1">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
      >
        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        {label}
      </button>
      {open && (
        <pre className="mt-1 p-2 bg-gray-50 rounded text-xs text-gray-700 overflow-auto max-h-40 border border-gray-200 whitespace-pre-wrap break-all">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}

export default function AuditLogPage() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [entityType, setEntityType] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string | number> = {
        page,
        limit: PAGE_SIZE,
      };
      if (entityType) params.entityType = entityType;
      if (dateFrom) params.from = dateFrom;
      if (dateTo) params.to = dateTo;
      if (search.trim()) params.search = search.trim();

      const { data } = await api.get<AuditLogResponse | AuditLogEntry[]>('/audit-logs', { params });
      if (Array.isArray(data)) {
        setEntries(data);
        setTotal(data.length);
      } else {
        setEntries(data.data ?? []);
        setTotal(data.total ?? 0);
      }
    } catch {
      setError('Impossibile caricare il registro attività.');
    } finally {
      setLoading(false);
    }
  }, [page, entityType, dateFrom, dateTo, search]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);
  useEffect(() => { setPage(1); }, [entityType, dateFrom, dateTo, search]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const getUserLabel = (entry: AuditLogEntry) => {
    if (entry.user) {
      const name = [entry.user.firstName, entry.user.lastName].filter(Boolean).join(' ');
      return name || entry.user.email || entry.userId || '—';
    }
    return entry.userId ?? '—';
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Shield className="w-6 h-6 text-slate-600" />
          Registro Attività
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Storico completo delle azioni eseguite nel sistema
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs text-gray-500 mb-1">Cerca</label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca per azione, entità..."
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Tipo entità</label>
          <select
            value={entityType}
            onChange={(e) => setEntityType(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-500"
          >
            {ENTITY_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Dal</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Al</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
          />
        </div>
        {(entityType || dateFrom || dateTo || search) && (
          <button
            onClick={() => { setEntityType(''); setDateFrom(''); setDateTo(''); setSearch(''); }}
            className="px-3 py-2 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50"
          >
            Cancella
          </button>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Data/Ora</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Utente</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Entità</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Azione</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Dettagli</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-100 last:border-0">
                    {Array.from({ length: 5 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-gray-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-gray-400">
                    Nessuna attività trovata.
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr key={entry.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">
                      {format(new Date(entry.createdAt), 'dd/MM/yyyy HH:mm', { locale: it })}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{getUserLabel(entry)}</td>
                    <td className="px-4 py-3">
                      <div>
                        <span className="font-medium text-gray-800 capitalize">{entry.entityType}</span>
                        <p className="text-xs text-gray-400 font-mono">{entry.entityId.slice(0, 8)}...</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={entry.action} />
                    </td>
                    <td className="px-4 py-3">
                      {entry.details && (
                        <p className="text-xs text-gray-600 mb-1">{entry.details}</p>
                      )}
                      <JsonViewer label="Valori precedenti" data={entry.oldValues} />
                      <JsonViewer label="Nuovi valori" data={entry.newValues} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && total > PAGE_SIZE && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
            <p className="text-xs text-gray-500">
              {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, total)} di {total} voci
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Precedente
              </button>
              <span className="text-xs text-gray-500">{page} / {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Successivo
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
