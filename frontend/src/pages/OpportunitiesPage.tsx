import { useState, useEffect, useCallback } from 'react';
import { Plus, TrendingUp, X, Search, History } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import api from '../services/api';

type OppStatus = 'scoping' | 'presales' | 'quote_preparing' | 'awaiting_ceo' | 'sent_to_client' | 'negotiation' | 'accepted' | 'contract_signing' | 'awaiting_payment' | 'won' | 'lost';

interface TimelineEntry {
  id: string;
  action: string;
  description?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  createdAt: string;
  userEmail?: string;
}

interface Opportunity {
  id: string;
  name?: string;
  companyId?: string;
  company?: { name: string };
  source?: string;
  ownerId?: string;
  nextDueDate?: string;
  status: OppStatus;
  estimatedValueCents?: number;
  probability?: number;
  notes?: string;
  lostReason?: string;
  createdAt: string;
}

interface OppForm {
  name: string;
  companyId: string;
  source: string;
  estimatedValueCents: string;
  probability: string;
  notes: string;
  nextDueDate: string;
  status: OppStatus;
}

const emptyForm: OppForm = {
  name: '', companyId: '', source: '', estimatedValueCents: '',
  probability: '20', notes: '', nextDueDate: '', status: 'scoping',
};

const COLUMNS: { id: OppStatus; label: string; color: string }[] = [
  { id: 'scoping', label: 'Scoping', color: 'bg-sky-100 text-sky-800' },
  { id: 'presales', label: 'Pre-vendita', color: 'bg-indigo-100 text-indigo-800' },
  { id: 'quote_preparing', label: 'Preventivo', color: 'bg-violet-100 text-violet-800' },
  { id: 'awaiting_ceo', label: 'Attesa CEO', color: 'bg-amber-100 text-amber-800' },
  { id: 'sent_to_client', label: 'Inviato', color: 'bg-cyan-100 text-cyan-800' },
  { id: 'negotiation', label: 'Negoziazione', color: 'bg-orange-100 text-orange-800' },
  { id: 'accepted', label: 'Accettato', color: 'bg-emerald-100 text-emerald-800' },
  { id: 'contract_signing', label: 'Firma Contratto', color: 'bg-teal-100 text-teal-800' },
  { id: 'awaiting_payment', label: 'Attesa Pagamento', color: 'bg-lime-100 text-lime-800' },
  { id: 'won', label: 'Vinto', color: 'bg-green-100 text-green-800' },
  { id: 'lost', label: 'Perso', color: 'bg-red-100 text-red-800' },
];

function formatEur(cents?: number | string) {
  const n = Number(cents);
  if (!n || isNaN(n)) return null;
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n / 100);
}


export default function OpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [products, setProducts] = useState<{ id: string; name: string; code: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedOpp, setSelectedOpp] = useState<Opportunity | null>(null);
  const [newModal, setNewModal] = useState(false);
  const [form, setForm] = useState<OppForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [searchText, setSearchText] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<OppStatus | ''>('');
  const [quickTab, setQuickTab] = useState('');

  // Notes state
  const [newNote, setNewNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  // Timeline state
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [loadingTimeline, setLoadingTimeline] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const [oppRes, coRes, prRes] = await Promise.all([
        api.get('/opportunities', { params: { limit: 200 } }),
        api.get('/companies', { params: { limit: 100 } }),
        api.get('/products', { params: { limit: 100 } }),
      ]);
      setOpportunities(Array.isArray(oppRes.data) ? oppRes.data : oppRes.data.data ?? []);
      setCompanies(Array.isArray(coRes.data) ? coRes.data : coRes.data.data ?? []);
      setProducts(Array.isArray(prRes.data) ? prRes.data : prRes.data.data ?? []);
    } catch {
      setError('Impossibile caricare i dati.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Fetch timeline when an opportunity is selected
  useEffect(() => {
    if (!selectedOpp) { setTimeline([]); return; }
    setLoadingTimeline(true);
    api.get(`/opportunities/${selectedOpp.id}/timeline`)
      .then(({ data }) => setTimeline(Array.isArray(data) ? data : []))
      .catch(() => setTimeline([]))
      .finally(() => setLoadingTimeline(false));
  }, [selectedOpp?.id]);

  // FIX 4: save notes handler
  const handleSaveNote = async () => {
    if (!selectedOpp || !newNote.trim()) return;
    setSavingNote(true);
    try {
      const combined = selectedOpp.notes
        ? `${selectedOpp.notes}\n\n[${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: it })}] ${newNote.trim()}`
        : `[${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: it })}] ${newNote.trim()}`;
      await api.put(`/opportunities/${selectedOpp.id}`, { notes: combined });
      setSelectedOpp((prev) => prev ? { ...prev, notes: combined } : null);
      setOpportunities((prev) => prev.map((o) => o.id === selectedOpp.id ? { ...o, notes: combined } : o));
      setNewNote('');
    } catch {
      setError('Errore durante il salvataggio della nota.');
    } finally {
      setSavingNote(false);
    }
  };

  const filteredOpportunities = opportunities.filter((o) => {
    const matchSearch = !searchText.trim() ||
      (o.name ?? '').toLowerCase().includes(searchText.toLowerCase()) ||
      (o.company?.name ?? '').toLowerCase().includes(searchText.toLowerCase());
    const matchCompany = !companyFilter || o.companyId === companyFilter;
    return matchSearch && matchCompany;
  });

  const displayOpps = filteredOpportunities.filter((o) => {
    if (statusFilter) return o.status === statusFilter;
    if (quickTab === 'active') return !['won', 'lost'].includes(o.status);
    if (quickTab === 'won') return o.status === 'won';
    if (quickTab === 'lost') return o.status === 'lost';
    return true;
  });

  const handleStatusChange = async (oppId: string, newStatus: OppStatus, lostReason?: string) => {
    try {
      await api.put(`/opportunities/${oppId}/status`, { status: newStatus, ...(lostReason ? { lostReason } : {}) });
      setOpportunities((prev) => prev.map((o) => o.id === oppId ? { ...o, status: newStatus } : o));
      setSelectedOpp((prev) => prev ? { ...prev, status: newStatus } : null);
      setError('');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(typeof msg === 'string' ? msg : 'Errore durante l\'aggiornamento dello stato.');
    }
  };

  // Valid transitions (must match backend)
  const VALID_TRANSITIONS: Record<OppStatus, OppStatus[]> = {
    scoping: ['presales', 'lost'],
    presales: ['quote_preparing', 'lost'],
    quote_preparing: ['awaiting_ceo', 'lost'],
    awaiting_ceo: ['sent_to_client', 'quote_preparing', 'lost'],
    sent_to_client: ['negotiation', 'accepted', 'lost'],
    negotiation: ['accepted', 'quote_preparing', 'lost'],
    accepted: ['contract_signing', 'lost'],
    contract_signing: ['awaiting_payment', 'lost'],
    awaiting_payment: ['won', 'lost'],
    won: [],
    lost: ['scoping', 'presales', 'quote_preparing', 'negotiation'],
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setFormError('Il nome opportunità è obbligatorio.'); return; }
    setSaving(true); setFormError('');
    try {
      const userStr = localStorage.getItem('user');
      const userId = userStr ? JSON.parse(userStr).id : undefined;
      const payload = {
        name: form.name,
        source: form.source || undefined,
        notes: form.notes || undefined,
        status: form.status,
        companyId: form.companyId || undefined,
        productId: products[0]?.id || undefined,
        ownerId: userId,
        assignedToUserId: userId,
        nextDueDate: form.nextDueDate || undefined,
        estimatedValueCents: form.estimatedValueCents ? parseInt(form.estimatedValueCents) * 100 : undefined,
        probability: form.probability ? parseInt(form.probability) : undefined,
      };
      await api.post('/opportunities', payload);
      setNewModal(false);
      setForm(emptyForm);
      fetchAll();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setFormError(msg ?? 'Errore durante il salvataggio.');
    } finally {
      setSaving(false);
    }
  };

  const totalValue = opportunities
    .filter((o) => !['lost'].includes(o.status))
    .reduce((sum, o) => sum + (Number(o.estimatedValueCents) || 0), 0);

  return (
    <div className="p-4 sm:p-6 flex flex-col gap-4 sm:gap-6 h-full max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 flex-shrink-0">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600 flex-shrink-0" />
            Pipeline Opportunità
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            {filteredOpportunities.length !== opportunities.length
              ? `${filteredOpportunities.length} di ${opportunities.length} opportunità`
              : `${opportunities.length} opportunità`}
            {' '}· {formatEur(totalValue)}
          </p>
        </div>
        <button
          onClick={() => { setForm(emptyForm); setFormError(''); setNewModal(true); }}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 transition-colors w-full sm:w-auto"
        >
          <Plus className="w-4 h-4" />
          Nuova Opportunità
        </button>
      </div>

      {/* FIX 1: Search & filter bar */}
      <div className="flex gap-3 flex-wrap flex-shrink-0">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Cerca opportunità..."
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
        <select
          value={companyFilter}
          onChange={(e) => setCompanyFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value="">Tutte le aziende</option>
          {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {(searchText || companyFilter) && (
          <button
            onClick={() => { setSearchText(''); setCompanyFilter(''); }}
            className="px-3 py-2 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50"
          >
            Cancella filtri
          </button>
        )}
      </div>

      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>}

      {/* Pipeline Funnel */}
      {!loading && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex rounded-lg overflow-hidden">
            {COLUMNS.map((col) => {
              const count = filteredOpportunities.filter(o => o.status === col.id).length;
              const funnelColors: Record<string, string> = {
                scoping: 'bg-sky-100 text-sky-800', presales: 'bg-indigo-100 text-indigo-800',
                quote_preparing: 'bg-violet-100 text-violet-800', awaiting_ceo: 'bg-amber-100 text-amber-800',
                sent_to_client: 'bg-cyan-100 text-cyan-800', negotiation: 'bg-orange-100 text-orange-800',
                accepted: 'bg-emerald-100 text-emerald-800', contract_signing: 'bg-teal-100 text-teal-800',
                awaiting_payment: 'bg-lime-100 text-lime-800', won: 'bg-green-200 text-green-900',
                lost: 'bg-red-100 text-red-800',
              };
              return (
                <button
                  key={col.id}
                  onClick={() => setStatusFilter(statusFilter === col.id ? '' : col.id as OppStatus)}
                  className={`flex-1 py-2 px-1 text-center border-r border-white/50 last:border-r-0 transition-all ${funnelColors[col.id]} ${statusFilter === col.id ? 'ring-2 ring-purple-500 z-10 scale-105' : 'hover:brightness-95'}`}
                >
                  <p className="text-[10px] font-medium truncate leading-tight">{col.label}</p>
                  <p className="text-lg font-bold leading-tight">{count}</p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick Filter Tabs */}
      <div className="flex gap-2">
        {[
          { id: '', label: 'Tutte' },
          { id: 'active', label: 'Attive' },
          { id: 'won', label: 'Vinte' },
          { id: 'lost', label: 'Perse' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              if (tab.id === 'active') {
                setStatusFilter('' as OppStatus);
                setQuickTab('active');
              } else if (tab.id === 'won') {
                setStatusFilter('won');
                setQuickTab('won');
              } else if (tab.id === 'lost') {
                setStatusFilter('lost');
                setQuickTab('lost');
              } else {
                setStatusFilter('' as OppStatus);
                setQuickTab('');
              }
            }}
            className={`px-4 py-1.5 text-sm rounded-lg font-medium transition-colors ${
              quickTab === tab.id ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />)}</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Nome</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Azienda</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Stato</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Valore</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Prob.</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Scadenza</th>
              </tr>
            </thead>
            <tbody>
              {displayOpps.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400">Nessuna opportunità trovata</td></tr>
              ) : displayOpps.map((opp) => (
                <tr
                  key={opp.id}
                  onClick={() => { setSelectedOpp(opp); setNewNote(''); }}
                  className="border-b border-gray-50 hover:bg-purple-50/50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 font-semibold text-gray-900">{opp.name || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{opp.company?.name || '—'}</td>
                  <td className="px-4 py-3"><StatusBadge status={opp.status} /></td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">{formatEur(opp.estimatedValueCents)}</td>
                  <td className="px-4 py-3 text-right text-gray-500">{opp.probability != null ? `${opp.probability}%` : '—'}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {opp.nextDueDate ? format(new Date(opp.nextDueDate), 'dd MMM yyyy', { locale: it }) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Sidebar */}
      {selectedOpp && (
        <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl border-l border-gray-200 z-40 flex flex-col">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900 truncate">{selectedOpp.name ?? selectedOpp.company?.name}</h3>
            <button onClick={() => setSelectedOpp(null)} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <StatusBadge status={selectedOpp.status} />

            {/* Lost reason banner */}
            {selectedOpp.status === 'lost' && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-xs font-semibold text-red-700 mb-1">Motivo perdita</p>
                <p className="text-sm text-red-800">{selectedOpp.lostReason || 'Non specificato'}</p>
              </div>
            )}

            <div className="space-y-3">
              {[
                { label: 'Azienda', value: selectedOpp.company?.name },
                { label: 'Fonte', value: selectedOpp.source },
                { label: 'Valore stimato', value: formatEur(selectedOpp.estimatedValueCents) },
                { label: 'Probabilità', value: selectedOpp.probability ? `${selectedOpp.probability}%` : undefined },
                { label: 'Scadenza', value: selectedOpp.nextDueDate ? format(new Date(selectedOpp.nextDueDate), 'dd/MM/yyyy', { locale: it }) : undefined },
              ].map(({ label, value }) => value && (
                <div key={label}>
                  <p className="text-xs text-gray-400 font-medium">{label}</p>
                  <p className="text-sm text-gray-800 mt-0.5">{value}</p>
                </div>
              ))}
              {/* FIX 4: Note section */}
              <div>
                <p className="text-xs text-gray-400 font-medium mb-1">Note</p>
                {selectedOpp.notes ? (
                  <p className="text-sm text-gray-700 whitespace-pre-line bg-gray-50 rounded-lg p-3 border border-gray-100">{selectedOpp.notes}</p>
                ) : (
                  <p className="text-sm text-gray-400 italic">Nessuna nota</p>
                )}
                <div className="mt-2 space-y-2">
                  <textarea
                    rows={3}
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Aggiungi nota..."
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                  />
                  <button
                    onClick={handleSaveNote}
                    disabled={savingNote || !newNote.trim()}
                    className="w-full px-3 py-2 bg-purple-600 text-white text-sm font-medium rounded-xl hover:bg-purple-700 disabled:bg-purple-300 transition-colors"
                  >
                    {savingNote ? 'Salvataggio...' : 'Salva nota'}
                  </button>
                </div>
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium mb-1">Stato attuale</p>
              <div className="mb-3">
                <StatusBadge status={selectedOpp.status} />
              </div>
              {selectedOpp.status === 'lost' ? (
                <>
                  <p className="text-xs text-gray-400 font-medium mb-2">Riapri opportunità</p>
                  <div className="space-y-1.5">
                    {[
                      { id: 'scoping' as OppStatus, label: 'Ricomincia da Scoping', desc: 'Requisiti cambiati' },
                      { id: 'presales' as OppStatus, label: 'Torna in Pre-vendita', desc: 'Riprendere contatto' },
                      { id: 'quote_preparing' as OppStatus, label: 'Rifare Preventivo', desc: 'Prezzo/condizioni da rivedere' },
                      { id: 'negotiation' as OppStatus, label: 'Rinegoziare', desc: 'Il cliente ci ripensa' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => handleStatusChange(selectedOpp.id, opt.id)}
                        className="w-full text-left px-3 py-2.5 rounded-lg font-medium transition-colors bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200"
                      >
                        <span className="text-xs font-semibold">↩ {opt.label}</span>
                        <span className="block text-[10px] text-amber-600 mt-0.5">{opt.desc}</span>
                      </button>
                    ))}
                  </div>
                </>
              ) : VALID_TRANSITIONS[selectedOpp.status]?.length > 0 ? (
                <>
                  <p className="text-xs text-gray-400 font-medium mb-2">Avanza a</p>
                  <div className="space-y-1.5">
                    {VALID_TRANSITIONS[selectedOpp.status]
                      .filter((s) => s !== 'lost')
                      .map((targetStatus) => {
                        const col = COLUMNS.find((c) => c.id === targetStatus);
                        if (!col) return null;
                        return (
                          <button
                            key={col.id}
                            onClick={() => handleStatusChange(selectedOpp.id, col.id)}
                            className={`w-full text-left px-3 py-2 text-xs rounded-lg font-medium transition-colors ${col.color} hover:brightness-95`}
                          >
                            → {col.label}
                          </button>
                        );
                      })}
                    {VALID_TRANSITIONS[selectedOpp.status].includes('lost') && (
                      <button
                        onClick={() => {
                          const reason = prompt('Motivo della perdita:');
                          if (reason !== null) handleStatusChange(selectedOpp.id, 'lost', reason);
                        }}
                        className="w-full text-left px-3 py-2 text-xs rounded-lg font-medium transition-colors bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
                      >
                        ✕ Segna come Persa
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-xs text-gray-400 italic">Stato finale — nessuna transizione disponibile.</p>
              )}
            </div>

            {/* Timeline / Cronologia */}
            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs text-gray-400 font-medium mb-3 flex items-center gap-1">
                <History className="w-3.5 h-3.5" /> Cronologia
              </p>
              {loadingTimeline ? (
                <p className="text-xs text-gray-400">Caricamento...</p>
              ) : timeline.length === 0 ? (
                <p className="text-xs text-gray-400 italic">Nessun evento registrato.</p>
              ) : (
                <div className="relative pl-4 border-l-2 border-gray-200 space-y-3">
                  {timeline.map((entry) => {
                    const oldStatus = (entry.oldValues as Record<string, string>)?.status;
                    const newStatus = (entry.newValues as Record<string, string>)?.status;
                    const lostReason = (entry.newValues as Record<string, string>)?.lostReason;

                    let label = entry.description || entry.action;
                    if (entry.action === 'status_change' && oldStatus && newStatus) {
                      const fromLabel = COLUMNS.find(c => c.id === oldStatus)?.label || oldStatus;
                      const toLabel = COLUMNS.find(c => c.id === newStatus)?.label || newStatus;
                      label = `${fromLabel} → ${toLabel}`;
                    } else if (entry.action === 'create') {
                      label = 'Opportunità creata';
                    } else if (entry.action === 'update') {
                      label = 'Dati aggiornati';
                    }

                    const dotColor = newStatus === 'lost' ? 'bg-red-500'
                      : newStatus === 'won' ? 'bg-green-500'
                      : entry.action === 'create' ? 'bg-blue-500'
                      : 'bg-gray-400';

                    return (
                      <div key={entry.id} className="relative">
                        <div className={`absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full ${dotColor} ring-2 ring-white`} />
                        <div>
                          <p className="text-xs font-medium text-gray-800">{label}</p>
                          {lostReason && (
                            <p className="text-[10px] text-red-600 mt-0.5">Motivo: {lostReason}</p>
                          )}
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            {format(new Date(entry.createdAt), 'dd/MM/yyyy HH:mm', { locale: it })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* New Opportunity Modal */}
      <Modal
        open={newModal}
        onClose={() => setNewModal(false)}
        title="Nuova Opportunità"
        size="lg"
        actions={
          <>
            <button onClick={() => setNewModal(false)} className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50">Annulla</button>
            <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 disabled:bg-purple-400">
              {saving ? 'Salvataggio...' : 'Crea Opportunità'}
            </button>
          </>
        }
      >
        {formError && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{formError}</div>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome Opportunità *</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Azienda</label>
            <select value={form.companyId} onChange={(e) => setForm({ ...form, companyId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white">
              <option value="">Seleziona azienda...</option>
              {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fonte</label>
            <input type="text" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Valore Stimato (€)</label>
            <input type="number" min="0" value={form.estimatedValueCents} onChange={(e) => setForm({ ...form, estimatedValueCents: e.target.value })}
              placeholder="0"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Probabilità (%)</label>
            <input type="number" min="0" max="100" value={form.probability} onChange={(e) => setForm({ ...form, probability: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Scadenza</label>
            <input type="date" value={form.nextDueDate} onChange={(e) => setForm({ ...form, nextDueDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Stato iniziale</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as OppStatus })}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white">
              {COLUMNS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
            <textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none" />
          </div>
        </div>
      </Modal>
    </div>
  );
}
