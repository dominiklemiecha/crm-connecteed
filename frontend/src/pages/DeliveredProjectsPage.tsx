import { useState, useEffect, useCallback } from 'react';
import { Plus, Globe, Pencil, Trash2, RefreshCw, AlertTriangle, Copy, Check, ExternalLink } from 'lucide-react';
import api from '@/services/api';
import Modal from '@/components/Modal';
import DataTable from '@/components/DataTable';
import type { Column } from '@/components/DataTable';

interface DeliveredProject {
  id: string;
  name: string;
  description?: string | null;
  url: string;
  username: string;
  password: string;
  createdAt: string;
}

type FormState = {
  name: string;
  description: string;
  url: string;
  username: string;
  password: string;
};

function getCurrentUser(): { role?: string } | null {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function canEdit(): boolean {
  const u = getCurrentUser();
  const role = (u?.role ?? '').toLowerCase();
  return role === 'admin' || role === 'ceo' || role === 'pm';
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const handle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* ignore */ }
  };
  return (
    <button
      onClick={handle}
      title={`Copia ${label}`}
      className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

function PasswordCell({ value }: { value: string }) {
  return (
    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
      <span className="font-mono text-sm text-gray-800 break-all tracking-widest">
        {'•'.repeat(Math.min(value.length || 8, 12))}
      </span>
      <CopyButton value={value} label="password" />
    </div>
  );
}

function ProjectModal({
  open,
  onClose,
  onSaved,
  editing,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editing: DeliveredProject | null;
}) {
  const empty = (): FormState => ({ name: '', description: '', url: '', username: '', password: '' });
  const [form, setForm] = useState<FormState>(empty());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      if (editing) {
        setForm({
          name: editing.name,
          description: editing.description ?? '',
          url: editing.url,
          username: editing.username,
          password: editing.password ?? '',
        });
      } else {
        setForm(empty());
      }
      setError('');
    }
  }, [open, editing]);

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError('Il nome è obbligatorio.'); return; }
    if (!form.url.trim()) { setError('La URL è obbligatoria.'); return; }
    if (!form.username.trim()) { setError('Lo username è obbligatorio.'); return; }
    if (!editing && !form.password) { setError('La password è obbligatoria.'); return; }

    setSaving(true);
    setError('');
    try {
      const payload: any = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        url: form.url.trim(),
        username: form.username.trim(),
      };
      if (form.password) payload.password = form.password;

      if (editing) {
        await api.patch(`/delivered-projects/${editing.id}`, payload);
      } else {
        await api.post('/delivered-projects', payload);
      }
      onSaved();
      onClose();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(typeof msg === 'string' ? msg : 'Errore durante il salvataggio.');
    }
    setSaving(false);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? `Modifica: ${editing.name}` : 'Nuovo Progetto Consegnato'}
      actions={
        <>
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Annulla</button>
          <button onClick={handleSubmit} disabled={saving}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Salvataggio...' : editing ? 'Salva' : 'Crea'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nome progetto *</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="es. Sito Cliente XYZ"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Descrizione</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            rows={3}
            placeholder="Breve descrizione del progetto, tecnologie, funzionalità chiave..."
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">URL *</label>
          <input
            type="text"
            value={form.url}
            onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
            placeholder="https://demo.cliente.it"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username *</label>
            <input
              type="text"
              value={form.username}
              onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
              autoComplete="off"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password {editing ? '(lascia vuoto per non modificare)' : '*'}
            </label>
            <input
              type="text"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              autoComplete="new-password"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}

function DeleteModal({
  project,
  onClose,
  onDeleted,
}: {
  project: DeliveredProject | null;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    if (!project) return;
    setDeleting(true);
    setError('');
    try {
      await api.delete(`/delivered-projects/${project.id}`);
      onDeleted();
      onClose();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(typeof msg === 'string' ? msg : "Errore durante l'eliminazione.");
    }
    setDeleting(false);
  };

  return (
    <Modal
      open={!!project}
      onClose={onClose}
      title="Elimina Progetto"
      size="sm"
      actions={
        <>
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Annulla</button>
          <button onClick={handleDelete} disabled={deleting}
            className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">
            {deleting ? 'Eliminazione...' : 'Elimina'}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-800">
            Eliminare <strong>{project?.name}</strong>? L'azione non può essere annullata.
          </p>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </Modal>
  );
}

export default function DeliveredProjectsPage() {
  const [items, setItems] = useState<DeliveredProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;
  const [search, setSearch] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<DeliveredProject | null>(null);
  const [deleting, setDeleting] = useState<DeliveredProject | null>(null);

  const editable = canEdit();

  const fetchItems = useCallback(async (p = 1, q = '') => {
    setLoading(true);
    try {
      const { data } = await api.get('/delivered-projects', {
        params: { page: p, limit: PAGE_SIZE, ...(q ? { search: q } : {}) },
      });
      setItems(data.data ?? data);
      setTotal(data.total ?? (data.data ?? data).length);
    } catch { setItems([]); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchItems(1, ''); }, [fetchItems]);

  const handleSearch = (q: string) => { setSearch(q); setPage(1); fetchItems(1, q); };
  const handlePageChange = (p: number) => { setPage(p); fetchItems(p, search); };

  const columns: Column<DeliveredProject>[] = [
    {
      key: 'name',
      label: 'Nome',
      sortable: true,
      render: (_, row) => (
        <div className="min-w-0">
          <div className="font-medium text-gray-900 truncate">{row.name}</div>
          {row.description && (
            <div className="text-xs text-gray-500 truncate max-w-xs">{row.description}</div>
          )}
        </div>
      ),
    },
    {
      key: 'url',
      label: 'URL',
      render: (_, row) => (
        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <a
            href={row.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:underline truncate max-w-[220px] inline-flex items-center gap-1"
          >
            {row.url}
            <ExternalLink className="w-3 h-3 flex-shrink-0" />
          </a>
          <CopyButton value={row.url} label="URL" />
        </div>
      ),
    },
    {
      key: 'username',
      label: 'Username',
      render: (_, row) => (
        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <span className="font-mono text-sm text-gray-800 break-all">{row.username}</span>
          <CopyButton value={row.username} label="username" />
        </div>
      ),
    },
    {
      key: 'password',
      label: 'Password',
      render: (_, row) => <PasswordCell value={row.password} />,
    },
    ...(editable ? [{
      key: 'id' as const,
      label: '',
      render: (_: unknown, row: DeliveredProject) => (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => { setEditing(row); setShowModal(true); }}
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Modifica"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={() => setDeleting(row)}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Elimina"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    }] : []),
  ];

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Globe className="w-6 h-6 text-blue-600" />
            Progetti Consegnati
          </h1>
          <p className="text-sm text-gray-500">Rubrica demo e installazioni con accessi rapidi per i sales</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => fetchItems(page, search)}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200 text-gray-600"
            title="Ricarica"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          {editable && (
            <button
              onClick={() => { setEditing(null); setShowModal(true); }}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              <Plus className="w-4 h-4" /> Nuovo
            </button>
          )}
        </div>
      </div>

      <DataTable
        columns={columns}
        data={items}
        loading={loading}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={handlePageChange}
        onSearch={handleSearch}
        searchValue={search}
        emptyText="Nessun progetto consegnato"
      />

      <ProjectModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onSaved={() => fetchItems(page, search)}
        editing={editing}
      />

      <DeleteModal
        project={deleting}
        onClose={() => setDeleting(null)}
        onDeleted={() => fetchItems(page, search)}
      />
    </div>
  );
}
