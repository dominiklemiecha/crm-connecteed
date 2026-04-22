import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Target, Calendar, DollarSign, User, X, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import api from '../services/api';

type LeadStatus = 'new' | 'qualifying' | 'qualified' | 'unqualified';

interface Lead {
  id: string;
  companyName?: string;
  contactName?: string;
  source?: string;
  ownerId?: string;
  nextDueDate?: string;
  status: LeadStatus;
  valueEstimateCents?: number;
  probability?: number;
  notes?: string;
  createdAt: string;
  leadProducts?: { productId: string }[];
}

interface Company { id: string; name: string; }

interface LeadForm {
  companyName: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  source: string;
  valueEstimateCents: string;
  probability: string;
  notes: string;
  nextDueDate: string;
  status: LeadStatus;
}

const emptyForm: LeadForm = {
  companyName: '', contactName: '', contactEmail: '', contactPhone: '',
  source: '', valueEstimateCents: '', probability: '20', notes: '',
  nextDueDate: '', status: 'new',
};

const COLUMNS: { id: LeadStatus; label: string }[] = [
  { id: 'new', label: 'Nuovo' },
  { id: 'qualifying', label: 'In Qualifica' },
  { id: 'qualified', label: 'Qualificato' },
  { id: 'unqualified', label: 'Non Qualificato' },
];

const SOURCES = ['Website', 'LinkedIn', 'Referral', 'Cold Email', 'Partner', 'Evento', 'Altro'];

function formatEur(cents?: number | string) {
  const n = Number(cents);
  if (!n || isNaN(n)) return null;
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n / 100);
}

interface Product { id: string; name: string; code: string; }

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [newModal, setNewModal] = useState(false);
  const [form, setForm] = useState<LeadForm>(emptyForm);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Convert to opportunity state
  const [convertModal, setConvertModal] = useState(false);
  const [convertCompanies, setConvertCompanies] = useState<Company[]>([]);
  const [convertForm, setConvertForm] = useState({ name: '', companyId: '' });
  const [converting, setConverting] = useState(false);
  const [convertError, setConvertError] = useState('');
  const [successBanner, setSuccessBanner] = useState('');
  const bannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchLeads = useCallback(async () => {
    try {
      const { data } = await api.get('/leads', { params: { limit: 100 } });
      setLeads(Array.isArray(data) ? data : data.data ?? []);
    } catch {
      setError('Impossibile caricare i lead.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      const { data } = await api.get('/products', { params: { limit: 100 } });
      setProducts(Array.isArray(data) ? data : data.data ?? []);
    } catch { /* empty */ }
  }, []);

  const fetchConvertCompanies = useCallback(async () => {
    try {
      const { data } = await api.get('/companies', { params: { limit: 100 } });
      setConvertCompanies(Array.isArray(data) ? data : data.data ?? []);
    } catch { /* empty */ }
  }, []);

  useEffect(() => { fetchLeads(); fetchProducts(); fetchConvertCompanies(); }, [fetchLeads, fetchProducts, fetchConvertCompanies]);

  const openConvertModal = (lead: Lead) => {
    setConvertForm({ name: lead.companyName ?? '', companyId: '' });
    setConvertError('');
    setConvertModal(true);
  };

  const handleConvert = async () => {
    if (!selectedLead) return;
    if (!convertForm.name.trim()) { setConvertError('Il nome opportunità è obbligatorio.'); return; }
    if (!convertForm.companyId) { setConvertError('Seleziona un\'azienda.'); return; }
    setConverting(true); setConvertError('');
    try {
      const productId = selectedLead.leadProducts?.[0]?.productId;
      await api.post(`/leads/${selectedLead.id}/convert`, {
        name: convertForm.name,
        companyId: convertForm.companyId,
        ...(productId ? { productId } : {}),
      });
      setConvertModal(false);
      setSelectedLead(null);
      fetchLeads();
      const bannerText = `Opportunità '${convertForm.name}' creata con successo!`;
      setSuccessBanner(bannerText);
      if (bannerTimer.current) clearTimeout(bannerTimer.current);
      bannerTimer.current = setTimeout(() => setSuccessBanner(''), 3000);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setConvertError(msg ?? 'Errore durante la conversione.');
    } finally {
      setConverting(false);
    }
  };

  const handleStatusChange = async (leadId: string, newStatus: LeadStatus) => {
    try {
      await api.put(`/leads/${leadId}/status`, { status: newStatus });
      setLeads((prev) => prev.map((l) => l.id === leadId ? { ...l, status: newStatus } : l));
      setSelectedLead((prev) => prev ? { ...prev, status: newStatus } : null);
      setError('');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(typeof msg === 'string' ? msg : 'Errore durante l\'aggiornamento dello stato.');
    }
  };

  // Valid transitions map (must match backend)
  const VALID_TRANSITIONS: Record<LeadStatus, LeadStatus[]> = {
    new: ['qualifying', 'unqualified'],
    qualifying: ['qualified', 'unqualified'],
    qualified: [],
    unqualified: ['new'],
  };

  const handleSave = async () => {
    if (!form.companyName.trim()) { setFormError('Il nome azienda è obbligatorio.'); return; }
    if (!selectedProductId) { setFormError('Seleziona almeno un prodotto.'); return; }
    setSaving(true); setFormError('');
    try {
      const userStr = localStorage.getItem('user');
      const userId = userStr ? JSON.parse(userStr).id : undefined;
      const payload = {
        companyName: form.companyName,
        contactName: form.contactName || undefined,
        contactEmail: form.contactEmail || undefined,
        contactPhone: form.contactPhone || undefined,
        source: form.source || undefined,
        notes: form.notes || undefined,
        status: form.status,
        ownerId: userId,
        assignedToUserId: userId,
        nextDueDate: form.nextDueDate || undefined,
        productIds: [selectedProductId],
        valueEstimateCents: form.valueEstimateCents ? parseInt(form.valueEstimateCents) * 100 : undefined,
        probability: form.probability ? parseInt(form.probability) : undefined,
      };
      await api.post('/leads', payload);
      setNewModal(false);
      setForm(emptyForm);
      fetchLeads();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setFormError(msg ?? 'Errore durante il salvataggio.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (leadId: string) => {
    if (!confirm('Eliminare questo lead?')) return;
    try {
      await api.delete(`/leads/${leadId}`);
      setSelectedLead(null);
      fetchLeads();
    } catch {
      setError('Impossibile eliminare il lead.');
    }
  };

  const [statusFilter, setStatusFilter] = useState<LeadStatus | ''>('');
  const [searchText, setSearchText] = useState('');

  const filteredLeads = leads.filter((l) => {
    if (statusFilter && l.status !== statusFilter) return false;
    if (searchText) {
      const s = searchText.toLowerCase();
      return (l.companyName ?? '').toLowerCase().includes(s) || (l.contactName ?? '').toLowerCase().includes(s) || (l.source ?? '').toLowerCase().includes(s);
    }
    return true;
  });

  const pipelineCards = COLUMNS.map((col) => {
    const items = leads.filter((l) => l.status === col.id);
    const totalValue = items.reduce((s, l) => s + (Number(l.valueEstimateCents) || 0), 0);
    return { ...col, count: items.length, totalValue };
  });

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Target className="w-6 h-6 text-blue-600" />
            Lead Pipeline
          </h1>
          <p className="text-sm text-gray-500 mt-1">{leads.length} lead totali{statusFilter ? ` · Filtro: ${COLUMNS.find(c => c.id === statusFilter)?.label}` : ''}</p>
        </div>
        <button
          onClick={() => { setForm(emptyForm); setFormError(''); setSelectedProductId(''); setNewModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nuovo Lead
        </button>
      </div>

      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>}
      {successBanner && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-800 font-medium">
          {successBanner}
        </div>
      )}

      {/* Pipeline Summary Cards */}
      <div className="grid grid-cols-4 gap-3">
        {pipelineCards.map((card) => {
          const borderColors: Record<string, string> = { new: 'border-l-blue-500', qualifying: 'border-l-amber-500', qualified: 'border-l-emerald-500', unqualified: 'border-l-gray-400' };
          const isActive = statusFilter === card.id;
          return (
            <button
              key={card.id}
              onClick={() => setStatusFilter(statusFilter === card.id ? '' : card.id)}
              className={`bg-white rounded-xl border border-gray-200 border-l-4 ${borderColors[card.id]} p-4 text-left transition-all hover:shadow-md ${isActive ? 'ring-2 ring-blue-500 shadow-md' : ''}`}
            >
              <p className="text-xs text-gray-500 font-medium">{card.label}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{card.count}</p>
              <p className="text-xs text-gray-400 mt-1">{formatEur(card.totalValue) || '€ 0'}</p>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative">
        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder="Cerca per azienda, contatto, fonte..."
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {[
          { id: '', label: 'Tutti' },
          { id: 'new', label: 'Nuovi' },
          { id: 'qualifying', label: 'In Qualifica' },
          { id: 'qualified', label: 'Qualificati' },
          { id: 'unqualified', label: 'Non Qualificati' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id as LeadStatus | '')}
            className={`px-4 py-1.5 text-sm rounded-lg font-medium transition-colors ${
              statusFilter === tab.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Azienda</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Contatto</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Fonte</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Stato</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Valore</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Prob.</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Scadenza</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400">Nessun lead trovato</td></tr>
              ) : filteredLeads.map((lead) => {
                const isOverdue = lead.nextDueDate && new Date(lead.nextDueDate) < new Date();
                return (
                  <tr
                    key={lead.id}
                    onClick={() => setSelectedLead(lead)}
                    className="border-b border-gray-50 hover:bg-blue-50/50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900">{lead.companyName || '—'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-gray-600">
                        <User className="w-3.5 h-3.5 text-gray-400" />
                        {lead.contactName || '—'}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {lead.source ? <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{lead.source}</span> : '—'}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={lead.status} /></td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">{formatEur(lead.valueEstimateCents)}</td>
                    <td className="px-4 py-3 text-right">
                      {lead.probability != null ? (
                        <div className="flex items-center gap-2 justify-end">
                          <div className="w-12 bg-gray-100 rounded-full h-1.5">
                            <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${lead.probability}%` }} />
                          </div>
                          <span className="text-xs text-gray-500 w-8">{lead.probability}%</span>
                        </div>
                      ) : '—'}
                    </td>
                    <td className={`px-4 py-3 text-sm ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                      {lead.nextDueDate ? (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {format(new Date(lead.nextDueDate), 'dd MMM yyyy', { locale: it })}
                        </div>
                      ) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Lead Detail Sidebar */}
      {selectedLead && (
        <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl border-l border-gray-200 z-40 flex flex-col">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">{selectedLead.companyName}</h3>
            <button onClick={() => setSelectedLead(null)} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="flex items-center gap-2">
              <StatusBadge status={selectedLead.status} />
            </div>

            <div className="space-y-3">
              {[
                { label: 'Contatto', value: selectedLead.contactName },
                { label: 'Fonte', value: selectedLead.source },
                { label: 'Valore stimato', value: formatEur(selectedLead.valueEstimateCents) },
                { label: 'Probabilità', value: selectedLead.probability ? `${selectedLead.probability}%` : undefined },
                { label: 'Scadenza', value: selectedLead.nextDueDate ? format(new Date(selectedLead.nextDueDate), 'dd/MM/yyyy', { locale: it }) : undefined },
              ].map(({ label, value }) => (
                value && (
                  <div key={label}>
                    <p className="text-xs text-gray-400 font-medium">{label}</p>
                    <p className="text-sm text-gray-800 mt-0.5">{value}</p>
                  </div>
                )
              ))}

              {selectedLead.notes && (
                <div>
                  <p className="text-xs text-gray-400 font-medium">Note</p>
                  <p className="text-sm text-gray-700 mt-0.5 whitespace-pre-line">{selectedLead.notes}</p>
                </div>
              )}
            </div>

            <div>
              <p className="text-xs text-gray-400 font-medium mb-2">Cambia Stato</p>
              {VALID_TRANSITIONS[selectedLead.status]?.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {VALID_TRANSITIONS[selectedLead.status].map((targetStatus) => {
                    const col = COLUMNS.find((c) => c.id === targetStatus);
                    if (!col) return null;
                    return (
                      <button
                        key={col.id}
                        onClick={() => handleStatusChange(selectedLead.id, col.id)}
                        className="px-3 py-2 text-xs rounded-lg font-medium transition-colors bg-gray-100 text-gray-600 hover:bg-gray-200"
                      >
                        → {col.label}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic">Nessuna transizione disponibile da questo stato.</p>
              )}
            </div>
          </div>
          <div className="border-t border-gray-100 p-4 space-y-2">
            {(selectedLead.status === 'qualifying' || selectedLead.status === 'qualified') && (
              <button
                onClick={() => openConvertModal(selectedLead)}
                className="w-full py-2 text-sm text-white bg-emerald-600 border border-emerald-600 rounded-xl hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
              >
                <ArrowRight className="w-4 h-4" />
                Converti in Opportunità
              </button>
            )}
            <button
              onClick={() => handleDelete(selectedLead.id)}
              className="w-full py-2 text-sm text-red-600 border border-red-200 rounded-xl hover:bg-red-50 transition-colors"
            >
              Elimina Lead
            </button>
          </div>
        </div>
      )}

      {/* Convert to Opportunity Modal */}
      <Modal
        open={convertModal}
        onClose={() => setConvertModal(false)}
        title="Converti in Opportunità"
        size="lg"
        actions={
          <>
            <button onClick={() => setConvertModal(false)} className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50">Annulla</button>
            <button onClick={handleConvert} disabled={converting} className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 disabled:bg-emerald-400">
              {converting ? 'Conversione...' : 'Converti'}
            </button>
          </>
        }
      >
        {convertError && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{convertError}</div>}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome Opportunità *</label>
            <input
              type="text"
              value={convertForm.name}
              onChange={(e) => setConvertForm({ ...convertForm, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Azienda *</label>
            <select
              value={convertForm.companyId}
              onChange={(e) => setConvertForm({ ...convertForm, companyId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            >
              <option value="">Seleziona azienda...</option>
              {convertCompanies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
      </Modal>

      {/* New Lead Modal */}
      <Modal
        open={newModal}
        onClose={() => setNewModal(false)}
        title="Nuovo Lead"
        size="lg"
        actions={
          <>
            <button onClick={() => setNewModal(false)} className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50">Annulla</button>
            <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:bg-blue-400">
              {saving ? 'Salvataggio...' : 'Crea Lead'}
            </button>
          </>
        }
      >
        {formError && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{formError}</div>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome Azienda *</label>
            <input type="text" value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Prodotto/Linea *</label>
            <select value={selectedProductId} onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="">Seleziona prodotto...</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome Contatto</label>
            <input type="text" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Contatto</label>
            <input type="email" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fonte</label>
            <select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="">Seleziona fonte...</option>
              {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Valore Stimato (€)</label>
            <input type="number" min="0" value={form.valueEstimateCents} onChange={(e) => setForm({ ...form, valueEstimateCents: e.target.value })}
              placeholder="0"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Probabilità (%)</label>
            <input type="number" min="0" max="100" value={form.probability} onChange={(e) => setForm({ ...form, probability: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Scadenza</label>
            <input type="date" value={form.nextDueDate} onChange={(e) => setForm({ ...form, nextDueDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Stato iniziale</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as LeadStatus })}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              {COLUMNS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
            <textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
        </div>
      </Modal>
    </div>
  );
}
