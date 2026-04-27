import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, Shield, UserCircle2 } from 'lucide-react';
import DataTable, { Column } from '../components/DataTable';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import api from '../services/api';

interface Company {
  id: string;
  name: string;
}

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  type: 'internal' | 'client';
  isActive: boolean;
  phone?: string;
  company?: { id: string; name: string };
  companyId?: string;
  permissions?: Record<string, boolean>;
}

interface UserForm {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: string;
  type: 'internal' | 'client';
  companyId: string;
  phone: string;
}

const ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'ceo', label: 'CEO' },
  { value: 'commerciale', label: 'Commerciale' },
  { value: 'pm', label: 'Project Manager' },
  { value: 'dev', label: 'Developer' },
  { value: 'design', label: 'Designer' },
  { value: 'support', label: 'Support' },
  { value: 'admin_legal', label: 'Admin Legal' },
  { value: 'client_admin', label: 'Client Admin' },
  { value: 'client_referente_operativo', label: 'Client Ref. Operativo' },
  { value: 'client_referente_admin', label: 'Client Ref. Admin' },
];

const ALL_PERMISSIONS = [
  { key: 'leads.read', label: 'Lead — Lettura' },
  { key: 'leads.write', label: 'Lead — Scrittura' },
  { key: 'opportunities.read', label: 'Opportunita — Lettura' },
  { key: 'opportunities.write', label: 'Opportunita — Scrittura' },
  { key: 'quotes.read', label: 'Preventivi — Lettura' },
  { key: 'quotes.write', label: 'Preventivi — Scrittura' },
  { key: 'quotes.approve', label: 'Preventivi — Approvazione' },
  { key: 'contracts.read', label: 'Contratti — Lettura' },
  { key: 'contracts.write', label: 'Contratti — Scrittura' },
  { key: 'invoices.read', label: 'Fatture — Lettura' },
  { key: 'invoices.write', label: 'Fatture — Scrittura' },
  { key: 'projects.read', label: 'Progetti — Lettura' },
  { key: 'projects.write', label: 'Progetti — Scrittura' },
  { key: 'tickets.read', label: 'Ticket — Lettura' },
  { key: 'tickets.write', label: 'Ticket — Scrittura' },
  { key: 'files.read', label: 'Documenti — Lettura' },
  { key: 'files.write', label: 'Documenti — Scrittura' },
];

const emptyForm: UserForm = {
  email: '',
  password: '',
  firstName: '',
  lastName: '',
  role: 'commerciale',
  type: 'internal',
  companyId: '',
  phone: '',
};

const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [companies, setCompanies] = useState<Company[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<UserForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [clientCredentials, setClientCredentials] = useState<{ email: string; password: string } | null>(null);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [permUser, setPermUser] = useState<User | null>(null);
  const [perms, setPerms] = useState<Record<string, boolean>>({});
  const [savingPerms, setSavingPerms] = useState(false);

  const PAGE_SIZE = 20;

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/users', {
        params: { page, limit: PAGE_SIZE, search: search || undefined },
      });
      const list = Array.isArray(data) ? data : (data.data ?? []);
      setUsers(list);
      setTotal(data.total ?? list.length);
    } catch {
      setError('Impossibile caricare gli utenti.');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);
  useEffect(() => { setPage(1); }, [search]);

  useEffect(() => {
    api.get('/companies', { params: { limit: 200 } }).then(({ data }) => {
      const list = Array.isArray(data) ? data : (data.data ?? []);
      setCompanies(list);
    }).catch(() => {});
  }, []);

  const openNew = (prefill?: Partial<UserForm>) => {
    setEditId(null);
    setForm({ ...emptyForm, ...prefill });
    setFormError('');
    setClientCredentials(null);
    setModalOpen(true);
  };

  const openEdit = (u: User, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditId(u.id);
    setForm({
      email: u.email,
      password: '',
      firstName: u.firstName,
      lastName: u.lastName,
      role: u.role,
      type: u.type,
      companyId: u.company?.id ?? u.companyId ?? '',
      phone: u.phone ?? '',
    });
    setFormError('');
    setClientCredentials(null);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.email.trim() || !form.firstName.trim() || !form.lastName.trim()) {
      setFormError('Email, nome e cognome sono obbligatori.');
      return;
    }
    if (!editId && !form.password.trim()) {
      setFormError('La password è obbligatoria per il nuovo utente.');
      return;
    }
    if (form.type === 'client' && !form.companyId) {
      setFormError('Per un utente cliente, l\'azienda è obbligatoria.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const payload: Record<string, unknown> = {
        email: form.email,
        firstName: form.firstName,
        lastName: form.lastName,
        role: form.role,
        type: form.type,
        phone: form.phone || undefined,
        companyId: form.companyId || undefined,
      };
      if (!editId) payload.password = form.password;
      if (editId) {
        await api.put(`/users/${editId}`, payload);
        setModalOpen(false);
      } else {
        await api.post('/users', payload);
        if (form.type === 'client') {
          setClientCredentials({ email: form.email, password: form.password });
        } else {
          setModalOpen(false);
        }
      }
      fetchUsers();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setFormError(Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Errore durante il salvataggio.'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await api.delete(`/users/${deleteId}`);
      setDeleteId(null);
      fetchUsers();
    } catch {
      setError('Impossibile disattivare l\'utente.');
    } finally {
      setDeleting(false);
    }
  };

  const openPerms = (u: User, e: React.MouseEvent) => {
    e.stopPropagation();
    setPermUser(u);
    const base: Record<string, boolean> = {};
    ALL_PERMISSIONS.forEach(({ key }) => { base[key] = u.permissions?.[key] ?? false; });
    setPerms(base);
  };

  const handleSavePerms = async () => {
    if (!permUser) return;
    setSavingPerms(true);
    try {
      await api.put(`/users/${permUser.id}/permissions`, { permissions: perms });
      setPermUser(null);
      fetchUsers();
    } catch {
      setError('Errore salvataggio permessi.');
    } finally {
      setSavingPerms(false);
    }
  };

  const columns: Column<User>[] = [
    {
      key: 'firstName', label: 'Nome', sortable: true,
      render: (_, row) => (
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
            <UserCircle2 className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">{row.firstName} {row.lastName}</p>
            <p className="text-xs text-gray-400">{row.email}</p>
          </div>
        </div>
      ),
    },
    { key: 'email', label: 'Email', render: (v) => <span className="text-gray-600 text-xs">{String(v ?? '')}</span> },
    {
      key: 'role', label: 'Ruolo',
      render: (v) => <StatusBadge status={String(v ?? '')} />,
    },
    {
      key: 'type', label: 'Tipo',
      render: (v) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${v === 'internal' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
          {v === 'internal' ? 'Interno' : 'Cliente'}
        </span>
      ),
    },
    {
      key: 'isActive', label: 'Stato',
      render: (v) => <StatusBadge status={v ? 'active' : 'cancelled'} />,
    },
    {
      key: 'company', label: 'Azienda',
      render: (v) => <span className="text-gray-600 text-sm">{(v as Company)?.name ?? '—'}</span>,
    },
    {
      key: 'actions', label: '',
      render: (_, row) => (
        <div className="flex items-center gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={(e) => openPerms(row, e)}
            className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
            title="Permessi"
          >
            <Shield className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => openEdit(row, e)}
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setDeleteId(row.id ?? ''); }}
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
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Utenti</h1>
          <p className="text-sm text-gray-500 mt-1">{total} utenti nel sistema</p>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>
      )}

      <DataTable
        columns={columns}
        data={users}
        loading={loading}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        onSearch={setSearch}
        searchValue={search}
        emptyText="Nessun utente trovato"
        actions={
          <button
            onClick={() => openNew()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nuovo Utente
          </button>
        }
      />

      {/* Create/Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editId ? 'Modifica Utente' : 'Nuovo Utente'}
        size="lg"
        actions={
          <>
            <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">Annulla</button>
            <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-blue-400 font-medium">
              {saving ? 'Salvataggio...' : editId ? 'Aggiorna' : 'Crea Utente'}
            </button>
          </>
        }
      >
        {formError && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{formError}</div>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
            <input type="text" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cognome *</label>
            <input type="text" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} className={inputCls} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputCls} />
          </div>
          {!editId && (
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
              <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={inputCls} />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ruolo</label>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className={inputCls}>
              {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as 'internal' | 'client' })} className={inputCls}>
              <option value="internal">Interno</option>
              <option value="client">Cliente</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Telefono</label>
            <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Azienda{form.type === 'client' && <span className="text-red-500 ml-1">*</span>}
            </label>
            <select value={form.companyId} onChange={(e) => setForm({ ...form, companyId: e.target.value })}
              className={`${inputCls} ${form.type === 'client' && !form.companyId ? 'border-red-300 ring-red-200' : ''}`}>
              <option value="">— Nessuna —</option>
              {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {form.type === 'client' && !form.companyId && (
              <p className="text-xs text-red-500 mt-1">Obbligatorio per utenti cliente</p>
            )}
          </div>
        </div>
      </Modal>

      {/* Client Credentials Modal */}
      <Modal
        open={!!clientCredentials}
        onClose={() => { setClientCredentials(null); setModalOpen(false); }}
        title="Utente Cliente Creato"
        size="sm"
        actions={
          <button
            onClick={() => { setClientCredentials(null); setModalOpen(false); }}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium"
          >
            Chiudi
          </button>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-700">
            Utente cliente creato con successo. Le credenziali di accesso al portale sono:
          </p>
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-2">
            <div>
              <p className="text-xs text-gray-500 font-medium">Email</p>
              <p className="text-sm font-mono text-gray-900">{clientCredentials?.email}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Password</p>
              <p className="text-sm font-mono text-gray-900">{clientCredentials?.password}</p>
            </div>
          </div>
          <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
            Conserva queste credenziali e comunicale al cliente. Non potranno essere recuperate in seguito.
          </p>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <Modal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Disattiva Utente"
        size="sm"
        actions={
          <>
            <button onClick={() => setDeleteId(null)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">Annulla</button>
            <button onClick={handleDelete} disabled={deleting} className="px-4 py-2 text-sm bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:bg-red-400 font-medium">
              {deleting ? 'Disattivazione...' : 'Disattiva'}
            </button>
          </>
        }
      >
        <p className="text-gray-600 text-sm">Sei sicuro di voler disattivare questo utente?</p>
      </Modal>

      {/* Permissions Modal */}
      <Modal
        open={!!permUser}
        onClose={() => setPermUser(null)}
        title={`Permessi — ${permUser?.firstName} ${permUser?.lastName}`}
        size="lg"
        actions={
          <>
            <button onClick={() => setPermUser(null)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">Annulla</button>
            <button onClick={handleSavePerms} disabled={savingPerms} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-blue-400 font-medium">
              {savingPerms ? 'Salvataggio...' : 'Salva Permessi'}
            </button>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {ALL_PERMISSIONS.map(({ key, label }) => (
            <label key={key} className="flex items-center gap-3 p-3 border border-gray-100 rounded-lg hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                checked={perms[key] ?? false}
                onChange={(e) => setPerms({ ...perms, [key]: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm text-gray-700">{label}</span>
            </label>
          ))}
        </div>
      </Modal>
    </div>
  );
}
