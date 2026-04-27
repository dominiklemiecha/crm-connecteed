import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, Mail, Phone, Globe, MapPin, Pencil, Save, X, Plus, Trash2, User } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import api from '../services/api';

interface Company {
  id: string;
  name: string;
  vatNumber?: string;
  email?: string;
  phone?: string;
  address?: { street?: string; city?: string; province?: string; postalCode?: string; country?: string } | string;
  website?: string;
  notes?: string;
  createdAt: string;
}

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  role?: string;
  isPrimary?: boolean;
}

interface ContactForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  isPrimary: boolean;
}

interface Opportunity {
  id: string;
  name: string;
  status: string;
  estimatedValueCents?: number;
  nextDueDate?: string;
}

interface Ticket {
  id: string;
  ticketNumber?: string;
  subject: string;
  status: string;
  priority?: string;
  createdAt: string;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  type: string;
  status: string;
  totalCents: number;
  dueDate?: string;
}

const emptyContactForm: ContactForm = { firstName: '', lastName: '', email: '', phone: '', role: '', isPrimary: false };

type TabId = 'info' | 'contacts' | 'opportunities' | 'tickets' | 'invoices';

function fmtDate(d?: string) {
  if (!d) return '—';
  try { return format(new Date(d), 'dd/MM/yyyy', { locale: it }); } catch { return '—'; }
}

function fmtCents(cents?: number) {
  if (cents == null) return '—';
  return `€ ${(cents / 100).toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export default function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [company, setCompany] = useState<Company | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<TabId>('info');

  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Company>>({});
  const [saving, setSaving] = useState(false);

  const [contactModal, setContactModal] = useState(false);
  const [contactForm, setContactForm] = useState<ContactForm>(emptyContactForm);
  const [contactSaving, setContactSaving] = useState(false);
  const [contactError, setContactError] = useState('');
  const [deleteContactId, setDeleteContactId] = useState<string | null>(null);

  const fetchCompany = useCallback(async () => {
    if (!id) return;
    try {
      const { data } = await api.get(`/companies/${id}`);
      setCompany(data);
      setEditForm(data);
    } catch {
      setError('Impossibile caricare i dati azienda.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchContacts = useCallback(async () => {
    if (!id) return;
    try {
      const { data } = await api.get('/contacts', { params: { companyId: id } });
      setContacts(Array.isArray(data) ? data : data.data ?? []);
    } catch { /* silent */ }
  }, [id]);

  const fetchOpportunities = useCallback(async () => {
    if (!id) return;
    try {
      const { data } = await api.get('/opportunities', { params: { companyId: id, limit: 50 } });
      const list = Array.isArray(data) ? data : (data.data ?? []);
      // Client-side filter as backup
      setOpportunities(list.filter((o: Opportunity & { companyId?: string }) => !o.companyId || o.companyId === id));
    } catch { setOpportunities([]); }
  }, [id]);

  const fetchTickets = useCallback(async () => {
    if (!id) return;
    try {
      const { data } = await api.get('/tickets', { params: { limit: 50 } });
      const list = Array.isArray(data) ? data : (data.data ?? []);
      // Filter tickets related to this company
      setTickets(list.filter((t: Ticket & { companyId?: string }) => t.companyId === id).slice(0, 20));
    } catch { setTickets([]); }
  }, [id]);

  const fetchInvoices = useCallback(async () => {
    if (!id) return;
    try {
      const { data } = await api.get('/invoices', { params: { companyId: id, limit: 50 } });
      const list = Array.isArray(data) ? data : (data.data ?? []);
      setInvoices(list.filter((i: Invoice & { companyId?: string }) => !i.companyId || i.companyId === id));
    } catch { setInvoices([]); }
  }, [id]);

  useEffect(() => { fetchCompany(); }, [fetchCompany]);

  useEffect(() => {
    if (tab === 'contacts') fetchContacts();
    if (tab === 'opportunities') fetchOpportunities();
    if (tab === 'tickets') fetchTickets();
    if (tab === 'invoices') fetchInvoices();
  }, [tab, fetchContacts, fetchOpportunities, fetchTickets, fetchInvoices]);

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    try {
      const { data } = await api.put(`/companies/${id}`, editForm);
      setCompany(data);
      setEditing(false);
    } catch {
      setError('Errore durante l\'aggiornamento.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddContact = async () => {
    if (!contactForm.firstName || !contactForm.lastName) {
      setContactError('Nome e cognome sono obbligatori.');
      return;
    }
    setContactSaving(true);
    setContactError('');
    try {
      await api.post('/contacts', { ...contactForm, companyId: id });
      setContactModal(false);
      setContactForm(emptyContactForm);
      fetchContacts();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setContactError(msg ?? 'Errore durante il salvataggio.');
    } finally {
      setContactSaving(false);
    }
  };

  const handleDeleteContact = async () => {
    if (!deleteContactId) return;
    try {
      await api.delete(`/contacts/${deleteContactId}`);
      setDeleteContactId(null);
      fetchContacts();
    } catch {
      setError('Impossibile eliminare il contatto.');
    }
  };

  if (loading) return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/3" />
        <div className="h-48 bg-gray-200 rounded-2xl" />
      </div>
    </div>
  );

  if (!company) return (
    <div className="p-4 sm:p-6 text-center text-gray-500">Azienda non trovata.</div>
  );

  const TAB_LABELS: Record<TabId, string> = {
    info: 'Informazioni',
    contacts: `Contatti (${contacts.length})`,
    opportunities: 'Opportunita',
    tickets: 'Ticket',
    invoices: 'Fatture',
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6">
      {/* Back + Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/companies')} className="text-gray-400 hover:text-gray-600 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <Building2 className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{company.name}</h1>
            <p className="text-sm text-gray-500">P.IVA: {company.vatNumber ?? '—'}</p>
          </div>
        </div>
        {!editing && (
          <button
            onClick={() => { setEditing(true); setEditForm(company); }}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <Pencil className="w-4 h-4" />
            Modifica
          </button>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {(['info', 'contacts', 'opportunities', 'tickets', 'invoices'] as TabId[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${
              tab === t
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {/* Tab: Info */}
      {tab === 'info' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          {editing ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { key: 'name', label: 'Nome Azienda', type: 'text' },
                  { key: 'vatNumber', label: 'Partita IVA', type: 'text' },
                  { key: 'email', label: 'Email', type: 'email' },
                  { key: 'phone', label: 'Telefono', type: 'tel' },
                  { key: 'website', label: 'Website', type: 'url' },
                  { key: 'city', label: 'Città', type: 'text' },
                  { key: 'country', label: 'Paese', type: 'text' },
                  { key: 'address', label: 'Indirizzo', type: 'text' },
                ].map(({ key, label, type }) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                    <input
                      type={type}
                      value={String((editForm as any)[key] ?? '')}
                      onChange={(e) => setEditForm({ ...editForm, [key]: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                ))}
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
                  <textarea
                    rows={3}
                    value={String(editForm.notes ?? '')}
                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setEditing(false)}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50"
                >
                  <X className="w-4 h-4" />Annulla
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:bg-blue-400"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Salvataggio...' : 'Salva'}
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {[
                { icon: Mail, label: 'Email', value: company.email },
                { icon: Phone, label: 'Telefono', value: company.phone },
                { icon: Globe, label: 'Website', value: company.website },
                { icon: MapPin, label: 'Città', value: typeof company.address === 'object' ? company.address?.city : '' },
                { icon: MapPin, label: 'Paese', value: typeof company.address === 'object' ? company.address?.country : '' },
                { icon: MapPin, label: 'Indirizzo', value: typeof company.address === 'object' ? company.address?.street : (company.address || '') },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-start gap-3">
                  <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-medium">{label}</p>
                    <p className="text-sm text-gray-800 mt-0.5">{value ?? '—'}</p>
                  </div>
                </div>
              ))}
              {company.notes && (
                <div className="sm:col-span-2 border-t border-gray-100 pt-4">
                  <p className="text-xs text-gray-400 font-medium mb-1">Note</p>
                  <p className="text-sm text-gray-700 whitespace-pre-line">{company.notes}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab: Contacts */}
      {tab === 'contacts' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => { setContactForm(emptyContactForm); setContactError(''); setContactModal(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              Aggiungi Contatto
            </button>
          </div>

          {contacts.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center text-gray-400">
              <User className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p>Nessun contatto associato a questa azienda.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              {contacts.map((c, i) => (
                <div key={c.id} className={`flex items-center gap-4 px-6 py-4 ${i < contacts.length - 1 ? 'border-b border-gray-100' : ''}`}>
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center font-semibold text-blue-700 text-sm flex-shrink-0">
                    {c.firstName[0]}{c.lastName[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {c.firstName} {c.lastName}
                      {c.isPrimary && <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Principale</span>}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{c.role ?? ''} {c.email ? `· ${c.email}` : ''} {c.phone ? `· ${c.phone}` : ''}</p>
                  </div>
                  <button
                    onClick={() => setDeleteContactId(c.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Opportunities */}
      {tab === 'opportunities' && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {opportunities.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <p>Nessuna opportunita associata a questa azienda.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Nome</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Stato</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Valore</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Scadenza</th>
                </tr>
              </thead>
              <tbody>
                {opportunities.map((o) => (
                  <tr key={o.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{o.name}</td>
                    <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                    <td className="px-4 py-3 text-gray-700">{fmtCents(o.estimatedValueCents)}</td>
                    <td className="px-4 py-3 text-gray-500">{fmtDate(o.nextDueDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Tab: Tickets */}
      {tab === 'tickets' && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {tickets.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <p>Nessun ticket associato a questa azienda.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Numero</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Oggetto</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Stato</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Priorita</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Data</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((t) => (
                  <tr key={t.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{t.ticketNumber ?? '—'}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{t.subject}</td>
                    <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                    <td className="px-4 py-3">{t.priority ? <StatusBadge status={t.priority} /> : <span className="text-gray-400">—</span>}</td>
                    <td className="px-4 py-3 text-gray-500">{fmtDate(t.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Tab: Invoices */}
      {tab === 'invoices' && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {invoices.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <p>Nessuna fattura associata a questa azienda.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Numero</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Tipo</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Stato</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Totale</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Scadenza</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono font-semibold text-gray-800">{inv.invoiceNumber}</td>
                    <td className="px-4 py-3"><StatusBadge status={inv.type} /></td>
                    <td className="px-4 py-3"><StatusBadge status={inv.status} /></td>
                    <td className="px-4 py-3 font-medium text-gray-900">{fmtCents(inv.totalCents)}</td>
                    <td className="px-4 py-3 text-gray-500">{fmtDate(inv.dueDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Add Contact Modal */}
      <Modal
        open={contactModal}
        onClose={() => setContactModal(false)}
        title="Aggiungi Contatto"
        actions={
          <>
            <button onClick={() => setContactModal(false)} className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50">Annulla</button>
            <button onClick={handleAddContact} disabled={contactSaving} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:bg-blue-400">
              {contactSaving ? 'Salvataggio...' : 'Aggiungi'}
            </button>
          </>
        }
      >
        {contactError && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{contactError}</div>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { key: 'firstName', label: 'Nome *', type: 'text' },
            { key: 'lastName', label: 'Cognome *', type: 'text' },
            { key: 'email', label: 'Email', type: 'email' },
            { key: 'phone', label: 'Telefono', type: 'tel' },
            { key: 'role', label: 'Ruolo', type: 'text' },
          ].map(({ key, label, type }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
              <input
                type={type}
                value={String((contactForm as any)[key] ?? '')}
                onChange={(e) => setContactForm({ ...contactForm, [key]: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          ))}
          <div className="col-span-2 flex items-center gap-2">
            <input
              type="checkbox"
              id="isPrimary"
              checked={contactForm.isPrimary}
              onChange={(e) => setContactForm({ ...contactForm, isPrimary: e.target.checked })}
              className="w-4 h-4 rounded border-gray-300 text-blue-600"
            />
            <label htmlFor="isPrimary" className="text-sm text-gray-700">Contatto principale</label>
          </div>
        </div>
      </Modal>

      {/* Delete Contact Confirm */}
      <Modal
        open={!!deleteContactId}
        onClose={() => setDeleteContactId(null)}
        title="Elimina Contatto"
        size="sm"
        actions={
          <>
            <button onClick={() => setDeleteContactId(null)} className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50">Annulla</button>
            <button onClick={handleDeleteContact} className="px-4 py-2 text-sm bg-red-600 text-white rounded-xl font-medium hover:bg-red-700">Elimina</button>
          </>
        }
      >
        <p className="text-sm text-gray-600">Sei sicuro di voler eliminare questo contatto?</p>
      </Modal>
    </div>
  );
}
