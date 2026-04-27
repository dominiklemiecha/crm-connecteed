import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Building2, Pencil, Trash2, UserPlus, CheckCircle, Upload, FileSpreadsheet, AlertTriangle } from 'lucide-react';
import DataTable, { Column } from '../components/DataTable';
import Modal from '../components/Modal';
import api from '../services/api';

interface Company {
  id: string;
  name: string;
  vatNumber?: string;
  email?: string;
  phone?: string;
  address?: { street?: string; city?: string; province?: string; postalCode?: string; country?: string };
  createdAt: string;
}

interface CompanyForm {
  name: string;
  vatNumber: string;
  fiscalCode: string;
  email: string;
  phone: string;
  pec: string;
  sdiCode: string;
  address: string;
  city: string;
  country: string;
  website: string;
  notes: string;
}

interface ImportResult {
  imported: number;
  errors: { row: number; message: string }[];
}

const emptyForm: CompanyForm = {
  name: '', vatNumber: '', fiscalCode: '', email: '', phone: '',
  pec: '', sdiCode: '',
  address: '', city: '', country: 'IT', website: '', notes: '',
};

export default function CompaniesPage() {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<CompanyForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // CSV Import
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Portal user creation
  const [portalCompany, setPortalCompany] = useState<Company | null>(null);
  const [portalForm, setPortalForm] = useState({ email: '', password: '', firstName: '', lastName: '' });
  const [portalSaving, setPortalSaving] = useState(false);
  const [portalError, setPortalError] = useState('');
  const [portalCredentials, setPortalCredentials] = useState<{ email: string; password: string } | null>(null);

  const PAGE_SIZE = 20;

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/companies', {
        params: { page, limit: PAGE_SIZE, search: search || undefined },
      });
      const list = Array.isArray(data) ? data : (data.data ?? []);
      setCompanies(list);
      setTotal(data.total ?? list.length);
    } catch {
      setError('Impossibile caricare le aziende.');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { fetchCompanies(); }, [fetchCompanies]);

  useEffect(() => { setPage(1); }, [search]);

  const openNew = () => {
    setEditId(null);
    setForm(emptyForm);
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (c: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditId(c.id);
    setForm({
      name: c.name ?? '',
      vatNumber: c.vatNumber ?? '',
      fiscalCode: c.fiscalCode ?? '',
      email: c.email ?? '',
      phone: c.phone ?? '',
      pec: c.pec ?? '',
      sdiCode: c.sdiCode ?? '',
      address: c.address?.street ?? '',
      city: c.address?.city ?? '',
      country: c.address?.country ?? 'IT',
      website: c.website ?? '',
      notes: c.notes ?? '',
    });
    setFormError('');
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setFormError('Il nome azienda è obbligatorio.'); return; }
    setSaving(true);
    setFormError('');
    try {
      const payload = {
        name: form.name,
        vatNumber: form.vatNumber || undefined,
        fiscalCode: form.fiscalCode || undefined,
        email: form.email || undefined,
        phone: form.phone || undefined,
        pec: form.pec || undefined,
        sdiCode: form.sdiCode || undefined,
        website: form.website || undefined,
        notes: form.notes || undefined,
        address: form.address || form.city ? {
          street: form.address || '',
          city: form.city || '',
          province: '',
          postalCode: '',
          country: form.country || 'IT',
        } : undefined,
      };
      if (editId) {
        await api.put(`/companies/${editId}`, payload);
      } else {
        await api.post('/companies', payload);
      }
      setModalOpen(false);
      fetchCompanies();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setFormError(msg ?? 'Errore durante il salvataggio.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await api.delete(`/companies/${deleteId}`);
      setDeleteId(null);
      fetchCompanies();
    } catch {
      setError('Impossibile eliminare l\'azienda.');
    } finally {
      setDeleting(false);
    }
  };

  const handlePortalSave = async () => {
    if (!portalCompany) return;
    if (!portalForm.email.trim() || !portalForm.password.trim() || !portalForm.firstName.trim() || !portalForm.lastName.trim()) {
      setPortalError('Tutti i campi sono obbligatori.');
      return;
    }
    setPortalSaving(true);
    setPortalError('');
    try {
      await api.post('/users', {
        email: portalForm.email,
        password: portalForm.password,
        firstName: portalForm.firstName,
        lastName: portalForm.lastName,
        role: 'client_admin',
        type: 'client',
        companyId: portalCompany.id,
      });
      setPortalCredentials({ email: portalForm.email, password: portalForm.password });
      setPortalCompany(null);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setPortalError(Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Errore durante la creazione.'));
    } finally {
      setPortalSaving(false);
    }
  };

  const handleImport = async (file: File) => {
    setImporting(true);
    setImportError('');
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await api.post('/companies/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setImportResult(data);
      if (data.imported > 0) fetchCompanies();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setImportError(typeof msg === 'string' ? msg : 'Errore durante l\'importazione.');
    } finally {
      setImporting(false);
    }
  };

  const columns: Column<Company>[] = [
    {
      key: 'name', label: 'Azienda', sortable: true,
      render: (_, row) => (
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <Building2 className="w-4 h-4 text-blue-600" />
          </div>
          <span className="font-medium text-gray-900">{row.name}</span>
        </div>
      ),
    },
    { key: 'vatNumber', label: 'P.IVA', render: (v) => <span className="text-gray-600">{String(v ?? '—')}</span> },
    { key: 'email', label: 'Email', render: (v) => <span className="text-gray-600">{String(v ?? '—')}</span> },
    { key: 'phone', label: 'Telefono', render: (v) => <span className="text-gray-600">{String(v ?? '—')}</span> },
    { key: 'address', label: 'Città', render: (v: any) => <span className="text-gray-600">{String(v?.city ?? '—')}</span> },
    {
      key: 'actions', label: '',
      render: (_, row) => (
        <div className="flex items-center gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={(e) => { e.stopPropagation(); setPortalCompany(row); setPortalForm({ email: '', password: '', firstName: '', lastName: '' }); setPortalError(''); }}
            className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
            title="Crea Accesso Portale"
          >
            <UserPlus className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => openEdit(row, e)}
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setDeleteId(row.id); }}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Aziende</h1>
          <p className="text-sm text-gray-500 mt-1">{total} aziende nel sistema</p>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>
      )}

      <DataTable
        columns={columns}
        data={companies}
        loading={loading}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        onSearch={setSearch}
        searchValue={search}
        onRowClick={(row) => navigate(`/companies/${row.id}`)}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => { setImportModalOpen(true); setImportResult(null); setImportError(''); }}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors"
            >
              <Upload className="w-4 h-4" />
              Importa CSV
            </button>
            <button
              onClick={openNew}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nuova Azienda
            </button>
          </div>
        }
      />

      {/* Create/Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editId ? 'Modifica Azienda' : 'Nuova Azienda'}
        size="lg"
        actions={
          <>
            <button
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Annulla
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-blue-400 font-medium transition-colors"
            >
              {saving ? 'Salvataggio...' : editId ? 'Aggiorna' : 'Crea Azienda'}
            </button>
          </>
        }
      >
        {formError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{formError}</div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome Azienda *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Partita IVA</label>
            <input
              type="text"
              value={form.vatNumber}
              onChange={(e) => setForm({ ...form, vatNumber: e.target.value })}
              placeholder="11 cifre"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Codice Fiscale</label>
            <input
              type="text"
              value={form.fiscalCode}
              onChange={(e) => setForm({ ...form, fiscalCode: e.target.value.toUpperCase() })}
              placeholder="16 caratteri"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">PEC</label>
            <input
              type="email"
              value={form.pec}
              onChange={(e) => setForm({ ...form, pec: e.target.value })}
              placeholder="pec@esempio.it"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Codice SDI</label>
            <input
              type="text"
              value={form.sdiCode}
              onChange={(e) => setForm({ ...form, sdiCode: e.target.value.toUpperCase() })}
              placeholder="7 caratteri"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Telefono</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
            <input
              type="url"
              value={form.website}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
              placeholder="https://"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Indirizzo</label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Città</label>
            <input
              type="text"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Paese</label>
            <input
              type="text"
              value={form.country}
              onChange={(e) => setForm({ ...form, country: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
        </div>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Conferma Eliminazione"
        size="sm"
        actions={
          <>
            <button
              onClick={() => setDeleteId(null)}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50"
            >
              Annulla
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-4 py-2 text-sm bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:bg-red-400 font-medium"
            >
              {deleting ? 'Eliminazione...' : 'Elimina'}
            </button>
          </>
        }
      >
        <p className="text-gray-600 text-sm">
          Sei sicuro di voler eliminare questa azienda? L'azione non può essere annullata.
        </p>
      </Modal>

      {/* Crea Accesso Portale Modal */}
      <Modal
        open={!!portalCompany}
        onClose={() => setPortalCompany(null)}
        title={`Crea Accesso Portale — ${portalCompany?.name ?? ''}`}
        actions={
          <>
            <button onClick={() => setPortalCompany(null)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">Annulla</button>
            <button onClick={handlePortalSave} disabled={portalSaving} className="px-4 py-2 text-sm bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:bg-purple-400 font-medium">
              {portalSaving ? 'Creazione...' : 'Crea Accesso'}
            </button>
          </>
        }
      >
        {portalError && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{portalError}</div>}
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Crea un utente cliente per il portale di <strong>{portalCompany?.name}</strong>.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
              <input type="text" value={portalForm.firstName} onChange={(e) => setPortalForm({ ...portalForm, firstName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cognome *</label>
              <input type="text" value={portalForm.lastName} onChange={(e) => setPortalForm({ ...portalForm, lastName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input type="email" value={portalForm.email} onChange={(e) => setPortalForm({ ...portalForm, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
              <input type="password" value={portalForm.password} onChange={(e) => setPortalForm({ ...portalForm, password: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
          </div>
        </div>
      </Modal>

      {/* Portal Credentials Modal */}
      <Modal
        open={!!portalCredentials}
        onClose={() => setPortalCredentials(null)}
        title="Accesso Portale Creato"
        size="sm"
        actions={
          <button onClick={() => setPortalCredentials(null)} className="px-4 py-2 text-sm bg-purple-600 text-white rounded-xl hover:bg-purple-700 font-medium">
            Chiudi
          </button>
        }
      >
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-emerald-700">
            <CheckCircle className="w-5 h-5" />
            <p className="text-sm font-medium">Accesso portale creato con successo!</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-2">
            <div>
              <p className="text-xs text-gray-500 font-medium">Email</p>
              <p className="text-sm font-mono text-gray-900">{portalCredentials?.email}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Password</p>
              <p className="text-sm font-mono text-gray-900">{portalCredentials?.password}</p>
            </div>
          </div>
          <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
            Comunica queste credenziali al cliente. Potra accedere al portale su /portal/login
          </p>
        </div>
      </Modal>

      {/* CSV Import Modal */}
      <Modal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        title="Importa Aziende da CSV"
        size="lg"
        actions={
          <>
            <button
              onClick={() => setImportModalOpen(false)}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            >
              {importResult ? 'Chiudi' : 'Annulla'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {!importResult && (
            <>
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <div className="flex items-start gap-3">
                  <FileSpreadsheet className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">Formato CSV richiesto</p>
                    <p className="text-xs text-blue-700 mt-1">
                      Il file deve avere un'intestazione con almeno il campo <strong>name</strong>. Campi opzionali:
                      vatNumber, fiscalCode, email, phone, pec, sdi, address, city, province, cap, country, notes.
                    </p>
                    <p className="text-xs text-blue-600 mt-2 font-mono">
                      name,vatNumber,fiscalCode,email,phone,pec,sdi,address,city
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl p-8 hover:border-emerald-400 transition-colors">
                <Upload className="w-10 h-10 text-gray-400 mb-3" />
                <p className="text-sm text-gray-600 mb-3">Seleziona un file CSV da importare</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImport(file);
                    e.target.value = '';
                  }}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={importing}
                  className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:bg-emerald-400 font-medium transition-colors"
                >
                  {importing ? 'Importazione in corso...' : 'Scegli File CSV'}
                </button>
              </div>
            </>
          )}

          {importError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{importError}</span>
            </div>
          )}

          {importResult && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                <CheckCircle className="w-6 h-6 text-emerald-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-emerald-900">
                    Importazione completata: {importResult.imported} aziende importate
                  </p>
                  {importResult.errors.length > 0 && (
                    <p className="text-xs text-emerald-700 mt-1">
                      {importResult.errors.length} righe con errori (vedi sotto)
                    </p>
                  )}
                </div>
              </div>

              {importResult.errors.length > 0 && (
                <div className="border border-red-200 rounded-xl overflow-hidden">
                  <div className="bg-red-50 px-4 py-2 border-b border-red-200 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    <p className="text-sm font-medium text-red-800">Errori ({importResult.errors.length})</p>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {importResult.errors.map((err, i) => (
                      <div key={i} className="px-4 py-2 text-xs border-b border-red-100 last:border-0 flex gap-3">
                        <span className="font-medium text-red-700 flex-shrink-0">Riga {err.row}</span>
                        <span className="text-red-600">{err.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
