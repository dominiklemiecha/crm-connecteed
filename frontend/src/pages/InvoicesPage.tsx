import { useState, useEffect, useCallback } from 'react';
import { Plus, Receipt, RefreshCw, ChevronRight, AlertCircle, CreditCard, Trash2, Calendar, Printer, FileText, Check } from 'lucide-react';
import { format, isPast, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import api from '@/services/api';
import StatusBadge from '@/components/StatusBadge';
import Modal from '@/components/Modal';
import DataTable from '@/components/DataTable';
import type { Column } from '@/components/DataTable';

// ---- Types ----------------------------------------------------------------

interface Company { id: string; name: string; }

interface InvoiceItem {
  id?: string;
  description: string;
  quantity: number;
  unitPriceCents: number;
  vatPercent: number;
}

interface Payment {
  id: string;
  amountCents: number;
  method: string;
  reference?: string;
  paymentDate: string;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  type: string;
  status: string;
  totalCents: number;
  paidCents?: number;
  dueDate?: string;
  paidAt?: string;
  createdAt: string;
  companyId: string;
  company?: { name: string };
  notes?: string;
  items?: InvoiceItem[];
  payments?: Payment[];
}

interface ScheduleEntry {
  id: string;
  installmentNumber: number;
  dueDate: string;
  amountCents: number;
  status: 'pending' | 'paid' | 'overdue';
  paidAt?: string;
}

// ---- Helpers ---------------------------------------------------------------

function fmtDate(d?: string) {
  if (!d) return '—';
  try { return format(new Date(d), 'dd/MM/yyyy', { locale: it }); } catch { return '—'; }
}

function fmtCents(cents?: number | string) {
  const n = Number(cents);
  if (cents == null || isNaN(n)) return '—';
  return `€ ${(n / 100).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function isOverdue(invoice: Invoice) {
  if (!invoice.dueDate) return false;
  if (invoice.status === 'paid') return false;
  try { return isPast(parseISO(invoice.dueDate)); } catch { return false; }
}

// ---- Item Row (create form) ------------------------------------------------

interface ItemRowProps {
  item: InvoiceItem;
  index: number;
  onChange: (i: number, field: keyof InvoiceItem, value: string | number) => void;
  onRemove: (i: number) => void;
}

function ItemRow({ item, index, onChange, onRemove }: ItemRowProps) {
  return (
    <tr>
      <td className="px-2 py-1">
        <input
          type="text"
          value={item.description}
          onChange={(e) => onChange(index, 'description', e.target.value)}
          placeholder="Descrizione"
          className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </td>
      <td className="px-2 py-1 w-20">
        <input
          type="number"
          min={1}
          value={item.quantity}
          onChange={(e) => onChange(index, 'quantity', Number(e.target.value))}
          className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 text-right"
        />
      </td>
      <td className="px-2 py-1 w-28">
        <input
          type="number"
          min={0}
          step={0.01}
          value={(item.unitPriceCents / 100).toFixed(2)}
          onChange={(e) => { const v = parseFloat(e.target.value); onChange(index, 'unitPriceCents', isNaN(v) ? 0 : Math.round(v * 100)); }}
          className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 text-right"
          placeholder="0.00"
        />
      </td>
      <td className="px-2 py-1 w-20">
        <select
          value={item.vatPercent}
          onChange={(e) => onChange(index, 'vatPercent', Number(e.target.value))}
          className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {[0, 4, 5, 10, 22].map((v) => <option key={v} value={v}>{v}%</option>)}
        </select>
      </td>
      <td className="px-2 py-1 w-28 text-right text-sm text-gray-600">
        {fmtCents(Math.round(item.quantity * item.unitPriceCents * (1 + item.vatPercent / 100)))}
      </td>
      <td className="px-2 py-1 w-8">
        <button onClick={() => onRemove(index)} className="text-red-400 hover:text-red-600">
          <Trash2 className="w-4 h-4" />
        </button>
      </td>
    </tr>
  );
}

// ---- Create Invoice Modal --------------------------------------------------

function CreateInvoiceModal({
  open,
  onClose,
  onCreated,
  companies,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  companies: Company[];
}) {
  const emptyItem = (): InvoiceItem => ({ description: '', quantity: 1, unitPriceCents: 0, vatPercent: 22 });

  const [form, setForm] = useState({
    type: 'invoice',
    companyId: '',
    dueDate: '',
    notes: '',
  });
  const [items, setItems] = useState<InvoiceItem[]>([emptyItem()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleItemChange = (i: number, field: keyof InvoiceItem, value: string | number) => {
    setItems((prev) => prev.map((it, idx) => idx === i ? { ...it, [field]: value } : it));
  };
  const handleItemRemove = (i: number) => setItems((prev) => prev.filter((_, idx) => idx !== i));

  const totalCents = items.reduce((sum, it) =>
    sum + Math.round(it.quantity * it.unitPriceCents * (1 + it.vatPercent / 100)), 0);

  const handleSubmit = async () => {
    if (!form.companyId) { setError('Seleziona un\'azienda.'); return; }
    if (items.some((it) => !it.description.trim())) { setError('Tutti gli articoli devono avere una descrizione.'); return; }
    setSaving(true);
    setError('');
    try {
      await api.post('/invoices', {
        type: form.type,
        companyId: form.companyId,
        dueDate: form.dueDate || undefined,
        notes: form.notes || undefined,
        items,
      });
      onCreated();
      onClose();
      setForm({ type: 'invoice', companyId: '', dueDate: '', notes: '' });
      setItems([emptyItem()]);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(typeof msg === 'string' ? msg : 'Errore durante la creazione.');
    }
    setSaving(false);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nuova Fattura"
      size="xl"
      actions={
        <>
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Annulla</button>
          <button onClick={handleSubmit} disabled={saving}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Creazione...' : 'Crea Fattura'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
            <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="proforma">Proforma</option>
              <option value="invoice">Fattura</option>
              <option value="credit_note">Nota di credito</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Azienda *</label>
            <select value={form.companyId} onChange={(e) => setForm((f) => ({ ...f, companyId: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Seleziona...</option>
              {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Scadenza</label>
            <input type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
            <input type="text" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Note aggiuntive..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        {/* Items */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-700">Articoli *</p>
            <button onClick={() => setItems((p) => [...p, emptyItem()])}
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1">
              <Plus className="w-3.5 h-3.5" /> Aggiungi riga
            </button>
          </div>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500">
                <tr>
                  <th className="text-left px-2 py-2 font-medium">Descrizione</th>
                  <th className="text-right px-2 py-2 font-medium">Qtà</th>
                  <th className="text-right px-2 py-2 font-medium">Prezzo (€)</th>
                  <th className="text-right px-2 py-2 font-medium">IVA</th>
                  <th className="text-right px-2 py-2 font-medium">Totale</th>
                  <th className="px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {items.map((it, i) => (
                  <ItemRow key={i} item={it} index={i} onChange={handleItemChange} onRemove={handleItemRemove} />
                ))}
              </tbody>
              <tfoot className="bg-gray-50 border-t border-gray-200">
                <tr>
                  <td colSpan={4} className="px-2 py-2 text-right text-sm font-semibold text-gray-700">Totale:</td>
                  <td className="px-2 py-2 text-right text-sm font-bold text-gray-900">{fmtCents(totalCents)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ---- Detail Modal ----------------------------------------------------------

function InvoiceDetailModal({
  invoice,
  onClose,
  onUpdated,
  companies,
}: {
  invoice: Invoice | null;
  onClose: () => void;
  onUpdated: () => void;
  companies: Company[];
}) {
  const [detail, setDetail] = useState<Invoice | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [payForm, setPayForm] = useState({ amountCents: '', method: 'bank_transfer', reference: '', paymentDate: '' });
  const [payingSaving, setPayingSaving] = useState(false);
  const [payError, setPayError] = useState('');
  const [paySuccess, setPaySuccess] = useState(false);

  // Schedule state
  const [schedules, setSchedules] = useState<ScheduleEntry[]>([]);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [scheduleRows, setScheduleRows] = useState<{ dueDate: string; amountCents: string }[]>([]);
  const [scheduleSaving, setScheduleSaving] = useState(false);

  const fetchSchedules = useCallback(async (id: string) => {
    try {
      const { data } = await api.get(`/invoices/${id}/schedule`);
      setSchedules(Array.isArray(data) ? data : []);
    } catch { setSchedules([]); }
  }, []);

  const fetchDetail = useCallback(async (id: string) => {
    setLoadingDetail(true);
    try {
      const { data } = await api.get(`/invoices/${id}`);
      setDetail(data);
      fetchSchedules(id);
    } catch { setDetail(null); }
    setLoadingDetail(false);
  }, [fetchSchedules]);

  useEffect(() => {
    if (invoice) {
      fetchDetail(invoice.id);
      setPaySuccess(false);
      setPayError('');
    } else {
      setDetail(null);
    }
  }, [invoice, fetchDetail]);

  // Pre-fill payment amount when detail loads
  useEffect(() => {
    if (detail) {
      const paidCentsCalc = Number(detail.paidCents) || detail.payments?.reduce((s, p) => s + Number(p.amountCents), 0) || 0;
      const rem = Math.max(0, (Number(detail.totalCents) || 0) - paidCentsCalc);
      setPayForm((f) => ({
        ...f,
        amountCents: (rem / 100).toFixed(2),
        paymentDate: format(new Date(), 'yyyy-MM-dd'),
      }));
    }
  }, [detail]);

  const paidCents = Number(detail?.paidCents) || detail?.payments?.reduce((s, p) => s + Number(p.amountCents), 0) || 0;
  const totalCents = Number(detail?.totalCents) || 0;
  const remaining = Math.max(0, totalCents - paidCents);
  const paidPct = totalCents > 0 ? Math.min(100, (paidCents / totalCents) * 100) : 0;

  const handleRegisterPayment = async () => {
    if (!detail) return;
    const parsed = parseFloat(payForm.amountCents);
    const cents = isNaN(parsed) ? 0 : Math.round(parsed * 100);
    if (!cents || cents <= 0) { setPayError('Inserisci un importo valido.'); return; }
    setPayingSaving(true);
    setPayError('');
    try {
      await api.post(`/invoices/${detail.id}/payments`, {
        amountCents: cents,
        method: payForm.method,
        reference: payForm.reference || undefined,
        paymentDate: payForm.paymentDate || undefined,
      });
      await fetchDetail(detail.id);
      onUpdated();
      setPaySuccess(true);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setPayError(typeof msg === 'string' ? msg : 'Errore registrazione pagamento.');
    }
    setPayingSaving(false);
  };

  return (
    <Modal
      open={!!invoice}
      onClose={onClose}
      title={detail ? `Fattura ${detail.invoiceNumber}` : 'Dettaglio Fattura'}
      size="xl"
    >
      {loadingDetail ? (
        <div className="py-12 text-center text-gray-400">Caricamento...</div>
      ) : !detail ? (
        <div className="py-12 text-center text-gray-400">Nessun dato disponibile.</div>
      ) : (
        <div className="space-y-5">
          {/* Header info */}
          <div className="grid grid-cols-3 gap-4">
            <div><p className="text-xs text-gray-500">Numero</p><p className="font-semibold">{detail.invoiceNumber}</p></div>
            <div><p className="text-xs text-gray-500">Tipo</p><StatusBadge status={detail.type} /></div>
            <div><p className="text-xs text-gray-500">Stato</p><StatusBadge status={detail.status} /></div>
            <div><p className="text-xs text-gray-500">Azienda</p><p className="text-gray-700">{detail.company?.name ?? companies.find((c) => c.id === detail.companyId)?.name ?? '—'}</p></div>
            <div><p className="text-xs text-gray-500">Scadenza</p>
              <p className={isOverdue(detail) ? 'text-red-600 font-medium' : 'text-gray-700'}>
                {fmtDate(detail.dueDate)}
                {isOverdue(detail) && <AlertCircle className="w-4 h-4 inline ml-1" />}
              </p>
            </div>
            <div><p className="text-xs text-gray-500">Totale</p><p className="font-bold text-gray-900">{fmtCents(totalCents)}</p></div>
          </div>

          {/* Progress bar */}
          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Pagato: {fmtCents(paidCents)}</span>
              <span>Residuo: {fmtCents(remaining)}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5">
              <div
                className={`h-2.5 rounded-full transition-all ${paidPct >= 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                style={{ width: `${paidPct}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1 text-right">{Math.round(paidPct)}% pagato</p>
            {paidPct >= 100 && (
              <p className="text-xs text-emerald-600 font-medium mt-1">Fattura completamente saldata.</p>
            )}
          </div>

          {/* Items */}
          {detail.items && detail.items.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Articoli</p>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium">Descrizione</th>
                      <th className="text-right px-3 py-2 font-medium">Qtà</th>
                      <th className="text-right px-3 py-2 font-medium">Prezzo</th>
                      <th className="text-right px-3 py-2 font-medium">IVA</th>
                      <th className="text-right px-3 py-2 font-medium">Totale</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.items.map((it, i) => (
                      <tr key={i} className="border-t border-gray-100">
                        <td className="px-3 py-2">{it.description}</td>
                        <td className="px-3 py-2 text-right">{it.quantity}</td>
                        <td className="px-3 py-2 text-right">{fmtCents(it.unitPriceCents)}</td>
                        <td className="px-3 py-2 text-right">{it.vatPercent}%</td>
                        <td className="px-3 py-2 text-right font-medium">
                          {fmtCents(Math.round(it.quantity * it.unitPriceCents * (1 + it.vatPercent / 100)))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Payments history */}
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Storico Pagamenti</p>
            {!detail.payments || detail.payments.length === 0 ? (
              <p className="text-sm text-gray-400 italic">Nessun pagamento registrato.</p>
            ) : (
              <div className="space-y-2">
                {detail.payments.map((pay) => (
                  <div key={pay.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{fmtCents(pay.amountCents)}</p>
                      <p className="text-xs text-gray-500">{pay.method}{pay.reference ? ` — ${pay.reference}` : ''}</p>
                    </div>
                    <p className="text-sm text-gray-500">{fmtDate(pay.paymentDate)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Schedule / Scadenziario */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> Scadenziario Rate
              </p>
              {schedules.length === 0 && !showScheduleForm && (
                <button onClick={() => {
                  setScheduleRows([{ dueDate: '', amountCents: '' }]);
                  setShowScheduleForm(true);
                }} className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1">
                  <Plus className="w-3 h-3" /> Crea piano rate
                </button>
              )}
            </div>
            {schedules.length > 0 && (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium">Rata</th>
                      <th className="text-right px-3 py-2 font-medium">Scadenza</th>
                      <th className="text-right px-3 py-2 font-medium">Importo</th>
                      <th className="text-center px-3 py-2 font-medium">Stato</th>
                      <th className="px-3 py-2 font-medium" />
                    </tr>
                  </thead>
                  <tbody>
                    {schedules.map((s) => (
                      <tr key={s.id} className="border-t border-gray-100">
                        <td className="px-3 py-2">Rata {s.installmentNumber}</td>
                        <td className={`px-3 py-2 text-right ${s.status === 'overdue' ? 'text-red-600 font-medium' : ''}`}>
                          {fmtDate(s.dueDate)}
                        </td>
                        <td className="px-3 py-2 text-right font-medium">{fmtCents(Number(s.amountCents))}</td>
                        <td className="px-3 py-2 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            s.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                            s.status === 'overdue' ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {s.status === 'paid' ? 'Pagata' : s.status === 'overdue' ? 'Scaduta' : 'In attesa'}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center">
                          {s.status !== 'paid' && (
                            <button
                              onClick={async () => {
                                try {
                                  await api.post(`/invoices/schedule/${s.id}/pay`);
                                  if (detail) { fetchDetail(detail.id); onUpdated(); }
                                } catch { /* silent */ }
                              }}
                              className="text-xs text-emerald-600 hover:text-emerald-800 flex items-center gap-1"
                            >
                              <Check className="w-3 h-3" /> Salda
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {showScheduleForm && (
              <div className="mt-3 space-y-2 border border-blue-200 rounded-lg p-3 bg-blue-50">
                <p className="text-xs font-medium text-blue-700">Nuovo piano di pagamento</p>
                {scheduleRows.map((row, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <span className="text-xs text-gray-500 w-12">Rata {i + 1}</span>
                    <input type="date" value={row.dueDate}
                      onChange={(e) => setScheduleRows((prev) => prev.map((r, idx) => idx === i ? { ...r, dueDate: e.target.value } : r))}
                      className="flex-1 border border-gray-200 rounded px-2 py-1.5 text-sm" />
                    <input type="number" step={0.01} min={0} placeholder="Importo €" value={row.amountCents}
                      onChange={(e) => setScheduleRows((prev) => prev.map((r, idx) => idx === i ? { ...r, amountCents: e.target.value } : r))}
                      className="w-28 border border-gray-200 rounded px-2 py-1.5 text-sm text-right" />
                    <button onClick={() => setScheduleRows((prev) => prev.filter((_, idx) => idx !== i))}
                      className="text-red-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <button onClick={() => setScheduleRows((prev) => [...prev, { dueDate: '', amountCents: '' }])}
                    className="text-xs text-blue-600 hover:text-blue-800">+ Aggiungi rata</button>
                  <div className="flex-1" />
                  <button onClick={() => setShowScheduleForm(false)}
                    className="text-xs text-gray-500 hover:text-gray-700">Annulla</button>
                  <button
                    disabled={scheduleSaving}
                    onClick={async () => {
                      if (!detail) return;
                      const installments = scheduleRows
                        .filter((r) => r.dueDate && r.amountCents)
                        .map((r) => ({ dueDate: r.dueDate, amountCents: Math.round(parseFloat(r.amountCents) * 100) }));
                      if (installments.length === 0) return;
                      setScheduleSaving(true);
                      try {
                        await api.post(`/invoices/${detail.id}/schedule`, { installments });
                        setShowScheduleForm(false);
                        fetchSchedules(detail.id);
                      } catch { /* silent */ }
                      setScheduleSaving(false);
                    }}
                    className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    {scheduleSaving ? 'Salvataggio...' : 'Salva piano'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* PDF / Print */}
          <div className="flex gap-2 border-t border-gray-200 pt-4">
            <button
              onClick={() => window.open(`${api.defaults.baseURL}/invoices/${detail.id}/print`, '_blank')}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200 text-gray-700"
            >
              <Printer className="w-4 h-4" /> Stampa / PDF
            </button>
            <button
              onClick={async () => {
                try {
                  const { data } = await api.get(`/invoices/${detail.id}/pdf`);
                  const link = document.createElement('a');
                  link.href = `data:application/pdf;base64,${data.pdf}`;
                  link.download = data.filename;
                  link.click();
                } catch { /* silent */ }
              }}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200 text-gray-700"
            >
              <FileText className="w-4 h-4" /> Scarica PDF
            </button>
          </div>

          {/* Inline payment registration form */}
          {remaining > 0 && (
            <div className="border-t border-gray-200 pt-4">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1">
                <CreditCard className="w-3.5 h-3.5" /> Registra Pagamento
              </p>
              {payError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-3">{payError}</p>}
              {paySuccess && (
                <p className="text-sm text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg mb-3">
                  Pagamento registrato con successo.{paidPct >= 100 ? ' Fattura completamente saldata!' : ''}
                </p>
              )}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Importo (€) *</label>
                  <input
                    type="number" min={0} step={0.01} value={payForm.amountCents}
                    onChange={(e) => setPayForm((f) => ({ ...f, amountCents: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Metodo</label>
                  <select value={payForm.method} onChange={(e) => setPayForm((f) => ({ ...f, method: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    <option value="bank_transfer">Bonifico bancario</option>
                    <option value="credit_card">Carta di credito</option>
                    <option value="cash">Contanti</option>
                    <option value="check">Assegno</option>
                    <option value="paypal">PayPal</option>
                    <option value="other">Altro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Riferimento</label>
                  <input type="text" value={payForm.reference} onChange={(e) => setPayForm((f) => ({ ...f, reference: e.target.value }))}
                    placeholder="CRO / numero transazione..."
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Data pagamento</label>
                  <input type="date" value={payForm.paymentDate} onChange={(e) => setPayForm((f) => ({ ...f, paymentDate: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
              </div>
              <button
                onClick={handleRegisterPayment}
                disabled={payingSaving}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 font-medium"
              >
                <CreditCard className="w-4 h-4" />
                {payingSaving ? 'Registrazione...' : 'Registra Pagamento'}
              </button>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

// ---- Main Page -------------------------------------------------------------

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const [companies, setCompanies] = useState<Company[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [search, setSearch] = useState('');

  const fetchInvoices = useCallback(async (p = 1, q = '') => {
    setLoading(true);
    try {
      const { data } = await api.get('/invoices', { params: { page: p, limit: PAGE_SIZE, ...(q ? { search: q } : {}) } });
      setInvoices(data.data ?? data);
      setTotal(data.total ?? (data.data ?? data).length);
    } catch { setInvoices([]); }
    setLoading(false);
  }, []);

  const fetchCompanies = useCallback(async () => {
    try {
      const { data } = await api.get('/companies', { params: { limit: 100 } });
      setCompanies(data.data ?? data);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchInvoices(1, ''); fetchCompanies(); }, []);

  const handleSearch = (q: string) => { setSearch(q); setPage(1); fetchInvoices(1, q); };
  const handlePageChange = (p: number) => { setPage(p); fetchInvoices(p, search); };

  const TYPE_LABELS: Record<string, string> = { proforma: 'Proforma', invoice: 'Fattura', credit_note: 'Nota credito' };

  const columns: Column<Invoice>[] = [
    {
      key: 'invoiceNumber',
      label: 'Numero',
      sortable: true,
      render: (v) => <span className="font-mono font-semibold text-gray-800">{String(v)}</span>,
    },
    {
      key: 'type',
      label: 'Tipo',
      render: (v) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
          {TYPE_LABELS[String(v)] ?? String(v)}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Stato',
      render: (v, row) => (
        <div className="flex items-center gap-1">
          <StatusBadge status={String(v)} />
          {isOverdue(row) && <span title="Scaduta"><AlertCircle className="w-4 h-4 text-red-500" /></span>}
        </div>
      ),
    },
    {
      key: 'totalCents',
      label: 'Totale',
      sortable: true,
      className: 'text-right',
      render: (v) => <span className="font-medium text-gray-900">{fmtCents(Number(v))}</span>,
    },
    {
      key: 'dueDate',
      label: 'Scadenza',
      sortable: true,
      render: (v, row) => (
        <span className={isOverdue(row) ? 'text-red-600 font-medium' : 'text-gray-500'}>
          {fmtDate(String(v))}
        </span>
      ),
    },
    {
      key: 'paidAt',
      label: 'Pagato il',
      render: (v) => <span className="text-gray-500">{fmtDate(v ? String(v) : undefined)}</span>,
    },
    {
      key: 'id',
      label: '',
      render: () => <ChevronRight className="w-4 h-4 text-gray-400" />,
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Receipt className="w-6 h-6 text-blue-600" />
            Fatture
          </h1>
          <p className="text-sm text-gray-500">Fatturazione e scadenziario pagamenti</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => fetchInvoices(page, search)}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200 text-gray-600">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
            <Plus className="w-4 h-4" /> Nuova Fattura
          </button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={invoices}
        loading={loading}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={handlePageChange}
        onSearch={handleSearch}
        searchValue={search}
        onRowClick={(row) => setSelectedInvoice(row)}
        emptyText="Nessuna fattura trovata"
      />

      <CreateInvoiceModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => fetchInvoices(1, search)}
        companies={companies}
      />

      <InvoiceDetailModal
        invoice={selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
        onUpdated={() => fetchInvoices(page, search)}
        companies={companies}
      />
    </div>
  );
}
