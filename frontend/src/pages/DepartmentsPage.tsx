import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, RefreshCw, Layers } from 'lucide-react';
import api from '@/services/api';
import Modal from '@/components/Modal';
import DataTable from '@/components/DataTable';
import type { Column } from '@/components/DataTable';

// ---- Types ----------------------------------------------------------------

interface Department {
  id: string;
  name: string;
  managerId?: string;
  manager?: { id: string; firstName: string; lastName: string };
  createdAt: string;
}

interface DeptForm {
  name: string;
  managerId: string;
}

interface UserOption {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
}

// ---- Create / Edit Modal ---------------------------------------------------

function DeptModal({
  open,
  onClose,
  onSaved,
  editing,
  users,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editing: Department | null;
  users: UserOption[];
}) {
  const emptyForm = (): DeptForm => ({ name: '', managerId: '' });
  const [form, setForm] = useState<DeptForm>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      if (editing) {
        setForm({
          name: editing.name,
          managerId: editing.managerId ?? '',
        });
      } else {
        setForm(emptyForm());
      }
      setError('');
    }
  }, [open, editing]);

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError('Il nome del reparto è obbligatorio.'); return; }
    setSaving(true);
    setError('');
    try {
      const payload = {
        name: form.name.trim(),
        managerId: form.managerId || undefined,
      };
      if (editing) {
        await api.put(`/departments/${editing.id}`, payload);
      } else {
        await api.post('/departments', payload);
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
      title={editing ? `Modifica: ${editing.name}` : 'Nuovo Reparto'}
      actions={
        <>
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Annulla</button>
          <button onClick={handleSubmit} disabled={saving}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Salvataggio...' : editing ? 'Salva' : 'Crea Reparto'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nome Reparto *</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="es. Backend, Frontend, Design..."
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Manager</label>
          <select
            value={form.managerId}
            onChange={(e) => setForm((f) => ({ ...f, managerId: e.target.value }))}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">— Nessun manager —</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.firstName} {u.lastName} ({u.role})
              </option>
            ))}
          </select>
        </div>
      </div>
    </Modal>
  );
}

// ---- Delete Confirm Modal --------------------------------------------------

function DeleteDeptModal({
  dept,
  onClose,
  onDeleted,
}: {
  dept: Department | null;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    if (!dept) return;
    setDeleting(true);
    setError('');
    try {
      await api.delete(`/departments/${dept.id}`);
      onDeleted();
      onClose();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(typeof msg === 'string' ? msg : 'Errore durante l\'eliminazione.');
    }
    setDeleting(false);
  };

  return (
    <Modal
      open={!!dept}
      onClose={onClose}
      title="Elimina Reparto"
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
        <p className="text-sm text-gray-700">
          Sei sicuro di voler eliminare il reparto <strong>{dept?.name}</strong>? Questa azione non può essere annullata.
        </p>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </Modal>
  );
}

// ---- Main Page -------------------------------------------------------------

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<UserOption[]>([]);

  const [showModal, setShowModal] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [deletingDept, setDeletingDept] = useState<Department | null>(null);

  const fetchDepartments = useCallback(async (p = 1, q = '') => {
    setLoading(true);
    try {
      const { data } = await api.get('/departments', {
        params: { page: p, limit: PAGE_SIZE, ...(q ? { search: q } : {}) },
      });
      const list = Array.isArray(data) ? data : (data.data ?? []);
      setDepartments(list);
      setTotal(data.total ?? list.length);
    } catch {
      setDepartments([]);
    }
    setLoading(false);
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const { data } = await api.get('/users', { params: { limit: 100 } });
      const list = Array.isArray(data) ? data : (data.data ?? []);
      setUsers(list);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchDepartments(1, ''); fetchUsers(); }, []);

  const handleSearch = (q: string) => { setSearch(q); setPage(1); fetchDepartments(1, q); };
  const handlePageChange = (p: number) => { setPage(p); fetchDepartments(p, search); };

  const columns: Column<Department>[] = [
    {
      key: 'name',
      label: 'Nome',
      sortable: true,
      render: (v) => (
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <Layers className="w-4 h-4 text-indigo-600" />
          </div>
          <span className="font-medium text-gray-900">{String(v)}</span>
        </div>
      ),
    },
    {
      key: 'manager',
      label: 'Manager',
      render: (_, row) => row.manager
        ? <span className="text-gray-700">{row.manager.firstName} {row.manager.lastName}</span>
        : <span className="text-gray-400">—</span>,
    },
    {
      key: 'id',
      label: '',
      render: (_, row) => (
        <div className="flex items-center gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => { setEditingDept(row); setShowModal(true); }}
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Modifica"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={() => setDeletingDept(row)}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Elimina"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Layers className="w-6 h-6 text-indigo-600" />
            Reparti
          </h1>
          <p className="text-sm text-gray-500">Gestione reparti e team interni</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => fetchDepartments(page, search)}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200 text-gray-600"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => { setEditingDept(null); setShowModal(true); }}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
          >
            <Plus className="w-4 h-4" /> Nuovo Reparto
          </button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={departments}
        loading={loading}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={handlePageChange}
        onSearch={handleSearch}
        searchValue={search}
        emptyText="Nessun reparto trovato"
      />

      <DeptModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onSaved={() => fetchDepartments(page, search)}
        editing={editingDept}
        users={users}
      />

      <DeleteDeptModal
        dept={deletingDept}
        onClose={() => setDeletingDept(null)}
        onDeleted={() => fetchDepartments(page, search)}
      />
    </div>
  );
}
