import { useState, useEffect, useCallback } from 'react';
import { Plus, Package, Pencil, Trash2, RefreshCw, AlertTriangle } from 'lucide-react';
import api from '@/services/api';
import Modal from '@/components/Modal';
import DataTable from '@/components/DataTable';
import type { Column } from '@/components/DataTable';

// ---- Types ----------------------------------------------------------------

interface Product {
  id: string;
  code: string;
  name: string;
  description?: string;
  category?: string;
  isActive: boolean;
  createdAt: string;
}

type ProductForm = {
  code: string;
  name: string;
  description: string;
  category: string;
  isActive: boolean;
};

// ---- Create / Edit Modal ---------------------------------------------------

function ProductModal({
  open,
  onClose,
  onSaved,
  editing,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editing: Product | null;
}) {
  const emptyForm = (): ProductForm => ({ code: '', name: '', description: '', category: '', isActive: true });

  const [form, setForm] = useState<ProductForm>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      if (editing) {
        setForm({
          code: editing.code,
          name: editing.name,
          description: editing.description ?? '',
          category: editing.category ?? '',
          isActive: editing.isActive,
        });
      } else {
        setForm(emptyForm());
      }
      setError('');
    }
  }, [open, editing]);

  const handleSubmit = async () => {
    if (!form.code.trim()) { setError('Il codice prodotto è obbligatorio.'); return; }
    if (!form.name.trim()) { setError('Il nome prodotto è obbligatorio.'); return; }
    setSaving(true);
    setError('');
    try {
      const payload = {
        code: form.code.trim(),
        name: form.name.trim(),
        description: form.description || undefined,
        category: form.category || undefined,
        isActive: form.isActive,
      };
      if (editing) {
        await api.put(`/products/${editing.id}`, payload);
      } else {
        await api.post('/products', payload);
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
      title={editing ? `Modifica: ${editing.name}` : 'Nuovo Prodotto'}
      actions={
        <>
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Annulla</button>
          <button onClick={handleSubmit} disabled={saving}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Salvataggio...' : editing ? 'Salva' : 'Crea Prodotto'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Codice *</label>
            <input
              type="text"
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
              placeholder="es. PROD-001"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Nome prodotto"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
          <input
            type="text"
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            placeholder="es. Software, Hardware, Servizi..."
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Descrizione</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            rows={3}
            placeholder="Descrizione opzionale..."
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => setForm((f) => ({ ...f, isActive: !f.isActive }))}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${form.isActive ? 'bg-blue-600' : 'bg-gray-300'}`}
          >
            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow ${form.isActive ? 'translate-x-4' : 'translate-x-1'}`} />
          </button>
          <label className="text-sm text-gray-700">Prodotto attivo</label>
        </div>
      </div>
    </Modal>
  );
}

// ---- Delete Confirm Modal --------------------------------------------------

function DeleteModal({
  product,
  onClose,
  onDeleted,
}: {
  product: Product | null;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    if (!product) return;
    setDeleting(true);
    setError('');
    try {
      await api.delete(`/products/${product.id}`);
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
      open={!!product}
      onClose={onClose}
      title="Elimina Prodotto"
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
            Sei sicuro di voler eliminare <strong>{product?.name}</strong>? Questa azione non può essere annullata.
          </p>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </Modal>
  );
}

// ---- ActiveToggle ----------------------------------------------------------

function ActiveToggle({ product, onToggled }: { product: Product; onToggled: () => void }) {
  const [loading, setLoading] = useState(false);

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoading(true);
    try {
      await api.put(`/products/${product.id}`, { isActive: !product.isActive });
      onToggled();
    } catch { /* silent */ }
    setLoading(false);
  };

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      title={product.isActive ? 'Disattiva' : 'Attiva'}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${product.isActive ? 'bg-blue-600' : 'bg-gray-300'} disabled:opacity-50`}
    >
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow ${product.isActive ? 'translate-x-4' : 'translate-x-1'}`} />
    </button>
  );
}

// ---- Main Page -------------------------------------------------------------

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;
  const [search, setSearch] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);

  const fetchProducts = useCallback(async (p = 1, q = '') => {
    setLoading(true);
    try {
      const { data } = await api.get('/products', { params: { page: p, limit: PAGE_SIZE, ...(q ? { search: q } : {}) } });
      setProducts(data.data ?? data);
      setTotal(data.total ?? (data.data ?? data).length);
    } catch { setProducts([]); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchProducts(1, ''); }, []);

  const handleSearch = (q: string) => { setSearch(q); setPage(1); fetchProducts(1, q); };
  const handlePageChange = (p: number) => { setPage(p); fetchProducts(p, search); };

  const columns: Column<Product>[] = [
    {
      key: 'code',
      label: 'Codice',
      sortable: true,
      render: (v) => <span className="font-mono text-sm font-semibold text-gray-700">{String(v)}</span>,
    },
    {
      key: 'name',
      label: 'Nome',
      sortable: true,
      render: (v) => <span className="font-medium text-gray-900">{String(v)}</span>,
    },
    {
      key: 'category',
      label: 'Categoria',
      render: (v) => v ? (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
          {String(v)}
        </span>
      ) : <span className="text-gray-400">—</span>,
    },
    {
      key: 'isActive',
      label: 'Attivo',
      render: (_, row) => <ActiveToggle product={row} onToggled={() => fetchProducts(page, search)} />,
    },
    {
      key: 'id',
      label: '',
      render: (_, row) => (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => { setEditingProduct(row); setShowModal(true); }}
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Modifica"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={() => setDeletingProduct(row)}
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
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="w-6 h-6 text-blue-600" />
            Prodotti
          </h1>
          <p className="text-sm text-gray-500">Catalogo prodotti e servizi</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchProducts(page, search)}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200 text-gray-600"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => { setEditingProduct(null); setShowModal(true); }}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            <Plus className="w-4 h-4" /> Nuovo Prodotto
          </button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={products}
        loading={loading}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={handlePageChange}
        onSearch={handleSearch}
        searchValue={search}
        emptyText="Nessun prodotto trovato"
      />

      <ProductModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onSaved={() => fetchProducts(page, search)}
        editing={editingProduct}
      />

      <DeleteModal
        product={deletingProduct}
        onClose={() => setDeletingProduct(null)}
        onDeleted={() => fetchProducts(page, search)}
      />
    </div>
  );
}
