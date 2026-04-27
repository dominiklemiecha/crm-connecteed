import { useState, useEffect, useCallback } from 'react';
import { Plus, FileText, Euro, Clock, Download, Send, CheckCircle, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import DataTable, { Column } from '../components/DataTable';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import api from '../services/api';

interface Quote {
  id: string;
  quoteNumber?: string;
  title?: string;
  status: string;
  companyId?: string;
  company?: { name: string };
  totalCents?: number | string;
  totalAmountCents?: number | string; // legacy alias
  currentVersion?: number;
  validUntil?: string;
  notes?: string;
  createdAt: string;
}

interface QuoteVersion {
  id: string;
  versionNumber: number;
  status: string;
  totalCents?: number | string;
  totalAmountCents?: number | string; // legacy alias
  createdAt: string;
  notes?: string;
}

interface QuoteItem {
  id?: string;
  description: string;
  quantity: number;
  unitPriceCents: number;
  itemType: 'fixed' | 'tm';
}

interface Opportunity {
  id: string;
  name: string;
  company?: { name: string };
}

interface QuoteForm {
  title: string;
  companyId: string;
  opportunityId: string;
  notes: string;
  validUntil: string;
  items: QuoteItem[];
}

const emptyForm: QuoteForm = {
  title: '', companyId: '', opportunityId: '', notes: '', validUntil: '',
  items: [{ description: '', quantity: 1, unitPriceCents: 0, itemType: 'fixed' }],
};

function formatEur(cents?: number | string) {
  const n = Number(cents);
  if (!n || isNaN(n)) return '€ 0,00';
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n / 100);
}

export default function QuotesPage() {
  
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [versions, setVersions] = useState<QuoteVersion[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);

  const [newModal, setNewModal] = useState(false);
  const [form, setForm] = useState<QuoteForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const PAGE_SIZE = 20;

  const fetchQuotes = useCallback(async () => {
    setLoading(true);
    try {
      const [qRes, cRes, oRes] = await Promise.all([
        api.get('/quotes', { params: { page, limit: PAGE_SIZE, search: search || undefined } }),
        api.get('/companies', { params: { limit: 100 } }),
        api.get('/opportunities', { params: { limit: 100 } }),
      ]);
      const list = Array.isArray(qRes.data) ? qRes.data : qRes.data.data ?? [];
      setQuotes(list);
      setTotal(qRes.data.total ?? list.length);
      setCompanies(Array.isArray(cRes.data) ? cRes.data : cRes.data.data ?? []);
      setOpportunities(Array.isArray(oRes.data) ? oRes.data : oRes.data.data ?? []);
    } catch {
      setError('Impossibile caricare i preventivi.');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { fetchQuotes(); }, [fetchQuotes]);
  useEffect(() => { setPage(1); }, [search]);

  const fetchVersions = async (quoteId: string) => {
    setVersionsLoading(true);
    try {
      const { data } = await api.get(`/quotes/${quoteId}/versions`);
      setVersions(Array.isArray(data) ? data : data.data ?? []);
    } catch { /* silent */ }
    finally { setVersionsLoading(false); }
  };

  const openDetail = (q: Quote) => {
    setSelectedQuote(q);
    setSendSuccess(false);
    fetchVersions(q.id);
  };

  const handleDownloadPdf = async (quoteId: string) => {
    try {
      const response = await api.get(`/quotes/${quoteId}/pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      window.open(url, '_blank');
    } catch {
      setError('Errore nel download del PDF.');
    }
  };

  const handleGenerateDocument = async (quoteId: string) => {
    try {
      const { data } = await api.get(`/quotes/${quoteId}/document`, { responseType: 'text' });
      const html = typeof data === 'string' ? data : JSON.stringify(data);
      const w = window.open('', '_blank');
      if (w) { w.document.write(html); w.document.close(); }
    } catch {
      setError('Errore nella generazione del documento.');
    }
  };

  const handleSendToClient = async (quoteId: string) => {
    try {
      await api.post(`/quotes/${quoteId}/status`, { status: 'sent' });
      setQuotes((prev) => prev.map((q) => q.id === quoteId ? { ...q, status: 'sent' } : q));
      setSelectedQuote((prev) => prev ? { ...prev, status: 'sent' } : null);
      setSendSuccess(true);
    } catch {
      setError('Errore durante l\'invio del preventivo.');
    }
  };

  const addItem = () => {
    setForm({
      ...form,
      items: [...form.items, { description: '', quantity: 1, unitPriceCents: 0, itemType: 'fixed' }],
    });
  };

  const removeItem = (i: number) => {
    setForm({ ...form, items: form.items.filter((_, idx) => idx !== i) });
  };

  const updateItem = (i: number, field: keyof QuoteItem, value: string | number) => {
    const items = [...form.items];
    items[i] = { ...items[i], [field]: value };
    setForm({ ...form, items });
  };

  const totalItems = form.items.reduce((sum, item) => sum + item.quantity * item.unitPriceCents, 0);

  const handleSave = async () => {
    if (!form.title.trim()) { setFormError('Il titolo è obbligatorio.'); return; }
    if (!form.companyId) { setFormError('Seleziona un\'azienda.'); return; }
    setSaving(true); setFormError('');
    try {
      await api.post('/quotes', {
        ...form,
        validUntil: form.validUntil || undefined,
        opportunityId: form.opportunityId || undefined,
      });
      setNewModal(false);
      setForm(emptyForm);
      fetchQuotes();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setFormError(msg ?? 'Errore durante la creazione del preventivo.');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (quoteId: string, newStatus: string) => {
    try {
      await api.post(`/quotes/${quoteId}/status`, { status: newStatus });
      setQuotes((prev) => prev.map((q) => q.id === quoteId ? { ...q, status: newStatus } : q));
      if (selectedQuote?.id === quoteId) setSelectedQuote((prev) => prev ? { ...prev, status: newStatus } : null);
    } catch {
      setError('Errore durante l\'aggiornamento stato.');
    }
  };

  const columns: Column<Quote>[] = [
    {
      key: 'quoteNumber', label: 'N. Preventivo',
      render: (v) => <span className="font-mono text-xs text-gray-600">{String(v ?? '—')}</span>,
    },
    {
      key: 'notes', label: 'Descrizione / Cliente',
      render: (v, row) => (
        <div>
          <p className="font-medium text-gray-900">{row.company?.name ?? companies.find((c) => c.id === row.companyId)?.name ?? '—'}</p>
          {v ? <p className="text-xs text-gray-500 truncate max-w-[250px]">{String(v)}</p> : null}
        </div>
      ),
    },
    { key: 'status', label: 'Stato', render: (v) => <StatusBadge status={String(v)} /> },
    {
      key: 'totalCents', label: 'Importo',
      render: (v) => <span className="font-semibold text-gray-900">{formatEur(v != null ? Number(v) : undefined)}</span>,
    },
    {
      key: 'currentVersion', label: 'Versione',
      render: (v) => v ? <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">v{String(v)}</span> : <span className="text-gray-400">—</span>,
    },
    {
      key: 'validUntil', label: 'Valido fino',
      render: (v) => v ? (
        <div className="flex items-center gap-1 text-sm">
          <Clock className="w-3.5 h-3.5 text-gray-400" />
          <span className={new Date(String(v)) < new Date() ? 'text-red-600' : 'text-gray-600'}>
            {format(new Date(String(v)), 'dd/MM/yyyy', { locale: it })}
          </span>
        </div>
      ) : <span className="text-gray-400">—</span>,
    },
    {
      key: 'createdAt', label: 'Creato',
      render: (v) => <span className="text-xs text-gray-400">{format(new Date(String(v)), 'dd/MM/yyyy', { locale: it })}</span>,
    },
  ];

  const STATUSES = ['draft', 'pending_approval', 'approved', 'sent', 'rejected', 'cancelled'];

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-violet-600" />
            Preventivi
          </h1>
          <p className="text-sm text-gray-500 mt-1">{total} preventivi nel sistema</p>
        </div>
        <button
          onClick={() => { setForm(emptyForm); setFormError(''); setNewModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-700"
        >
          <Plus className="w-4 h-4" />
          Nuovo Preventivo
        </button>
      </div>

      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>}

      <DataTable
        columns={columns}
        data={quotes}
        loading={loading}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        onSearch={setSearch}
        searchValue={search}
        onRowClick={openDetail}
      />

      {/* Detail Modal */}
      <Modal
        open={!!selectedQuote}
        onClose={() => setSelectedQuote(null)}
        title={selectedQuote?.title ?? 'Dettaglio Preventivo'}
        size="xl"
      >
        {selectedQuote && (
          <div className="space-y-6">
            {/* Header info */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-gray-400">Numero</p>
                <p className="font-mono text-sm">{selectedQuote.quoteNumber ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Stato</p>
                <div className="mt-1"><StatusBadge status={selectedQuote.status} /></div>
              </div>
              <div>
                <p className="text-xs text-gray-400">Importo totale</p>
                <p className="font-bold text-lg text-gray-900">{formatEur(Number(selectedQuote.totalCents ?? selectedQuote.totalAmountCents ?? 0))}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Azienda</p>
                <p className="text-sm text-gray-800">{selectedQuote.company?.name ?? companies.find((c) => c.id === selectedQuote.companyId)?.name ?? '—'}</p>
              </div>
            </div>

            {/* Document actions */}
            <div className="flex flex-wrap gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
              <button
                onClick={() => handleGenerateDocument(selectedQuote.id)}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-violet-600 text-white rounded-lg hover:bg-violet-700 font-medium"
              >
                <ExternalLink className="w-4 h-4" /> Genera Documento
              </button>
              {selectedQuote.status === 'approved' && (
                <>
                  <button
                    onClick={() => handleDownloadPdf(selectedQuote.id)}
                    className="flex items-center gap-2 px-4 py-2 text-sm bg-white border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50 font-medium"
                  >
                    <Download className="w-4 h-4" /> Scarica PDF
                  </button>
                  <button
                    onClick={() => handleSendToClient(selectedQuote.id)}
                    className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                  >
                    <Send className="w-4 h-4" /> Invia al Cliente
                  </button>
                </>
              )}
            </div>
            {sendSuccess && (
              <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-800">
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                Preventivo inviato! Il cliente lo vedra nel portale.
              </div>
            )}

            {/* Status change */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Cambia stato:</p>
              <div className="flex flex-wrap gap-2">
                {STATUSES.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleStatusChange(selectedQuote.id, s)}
                    disabled={selectedQuote.status === s}
                    className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                      selectedQuote.status === s ? 'ring-2 ring-offset-1 ring-violet-500' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <StatusBadge status={s} />
                  </button>
                ))}
              </div>
            </div>

            {/* Versions */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-3">Versioni:</p>
              {versionsLoading ? (
                <div className="animate-pulse h-16 bg-gray-100 rounded-xl" />
              ) : versions.length === 0 ? (
                <p className="text-sm text-gray-400">Nessuna versione registrata.</p>
              ) : (
                <div className="space-y-2">
                  {versions.map((v) => (
                    <div key={v.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl border border-gray-200">
                      <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded-full font-mono">v{v.versionNumber}</span>
                      <StatusBadge status={v.status} />
                      <span className="font-medium text-sm">{formatEur(Number(v.totalCents ?? v.totalAmountCents ?? 0))}</span>
                      <span className="text-xs text-gray-400 ml-auto">{format(new Date(v.createdAt), 'dd/MM/yyyy', { locale: it })}</span>
                      {v.notes && <span className="text-xs text-gray-500 italic truncate max-w-xs">{v.notes}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* New Quote Modal */}
      <Modal
        open={newModal}
        onClose={() => setNewModal(false)}
        title="Nuovo Preventivo"
        size="xl"
        actions={
          <>
            <button onClick={() => setNewModal(false)} className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50">Annulla</button>
            <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm bg-violet-600 text-white rounded-xl font-medium hover:bg-violet-700 disabled:bg-violet-400">
              {saving ? 'Salvataggio...' : 'Crea Preventivo'}
            </button>
          </>
        }
      >
        {formError && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{formError}</div>}
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Titolo *</label>
              <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Azienda *</label>
              <select value={form.companyId} onChange={(e) => setForm({ ...form, companyId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white">
                <option value="">Seleziona azienda...</option>
                {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Opportunità</label>
              <select value={form.opportunityId} onChange={(e) => setForm({ ...form, opportunityId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white">
                <option value="">Nessuna opportunità...</option>
                {opportunities.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}{o.company?.name ? ` — ${o.company.name}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valido fino</label>
              <input type="date" value={form.validUntil} onChange={(e) => setForm({ ...form, validUntil: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-700">Voci</label>
              <button onClick={addItem} className="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-700 font-medium">
                <Plus className="w-3.5 h-3.5" />
                Aggiungi voce
              </button>
            </div>
            <div className="space-y-2">
              {form.items.map((item, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-start p-3 bg-gray-50 rounded-xl">
                  <div className="col-span-5">
                    <input
                      type="text" placeholder="Descrizione"
                      value={item.description}
                      onChange={(e) => updateItem(i, 'description', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number" min="1" placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => updateItem(i, 'quantity', parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                  <div className="col-span-3">
                    <input
                      type="number" min="0" placeholder="Prezzo (€)"
                      value={item.unitPriceCents / 100 || ''}
                      onChange={(e) => { const v = parseFloat(e.target.value); updateItem(i, 'unitPriceCents', isNaN(v) ? 0 : Math.round(v * 100)); }}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                  <div className="col-span-1">
                    <select
                      value={item.itemType}
                      onChange={(e) => updateItem(i, 'itemType', e.target.value)}
                      className="w-full px-2 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
                    >
                      <option value="fixed">Fixed</option>
                      <option value="tm">T&M</option>
                    </select>
                  </div>
                  <div className="col-span-1 flex justify-end pt-1">
                    <button onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600 text-sm">×</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end mt-3 pt-3 border-t border-gray-200">
              <div className="flex flex-wrap items-center gap-2">
                <Euro className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-bold text-gray-900">Totale: {formatEur(totalItems)}</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
            <textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none" />
          </div>
        </div>
      </Modal>
    </div>
  );
}
