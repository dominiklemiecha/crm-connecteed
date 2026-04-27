import { useState, useEffect, useCallback } from 'react';
import { Plus, FileSignature, RefreshCw, ChevronRight, User, CheckCircle, Clock, XCircle, Download, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import api from '@/services/api';
import StatusBadge from '@/components/StatusBadge';
import Modal from '@/components/Modal';
import DataTable from '@/components/DataTable';
import type { Column } from '@/components/DataTable';

// ---- Types ----------------------------------------------------------------

interface Company { id: string; name: string; }

interface Signature {
  id: string;
  signerEmail: string;
  signerName: string;
  status: string;
  signedAt?: string;
}

interface Contract {
  id: string;
  contractNumber: string;
  companyId: string;
  company?: { name: string };
  status: string;
  createdAt: string;
  signedAt?: string;
  opportunityId?: string;
  quoteId?: string;
  signatures?: Signature[];
}

// ---- Status workflow -------------------------------------------------------

const STATUS_FLOW: Record<string, { next: string[]; label: string }> = {
  draft:          { next: ['awaiting_ceo', 'void'],      label: 'Bozza' },
  awaiting_ceo:   { next: ['ready_to_sign', 'void'],     label: 'Attesa CEO' },
  ready_to_sign:  { next: ['signing', 'void'],           label: 'Pronto firma' },
  signing:        { next: ['signed', 'void'],            label: 'In firma' },
  signed:         { next: [],                            label: 'Firmato' },
  void:           { next: [],                            label: 'Annullato' },
};

const STATUS_BTN: Record<string, string> = {
  awaiting_ceo:  'Invia a CEO',
  ready_to_sign: 'Segna Pronto',
  signing:       'Avvia Firma',
  signed:        'Conferma Firma',
  void:          'Annulla',
};

// ---- Helpers ---------------------------------------------------------------

function fmtDate(d?: string) {
  if (!d) return '—';
  try { return format(new Date(d), 'dd/MM/yyyy', { locale: it }); } catch { return '—'; }
}

function signerStatusIcon(status: string) {
  if (status === 'signed') return <CheckCircle className="w-4 h-4 text-emerald-500" />;
  if (status === 'declined') return <XCircle className="w-4 h-4 text-red-500" />;
  return <Clock className="w-4 h-4 text-amber-500" />;
}

// ---- Create Modal ----------------------------------------------------------

function CreateContractModal({
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
  const [form, setForm] = useState({ companyId: '', opportunityId: '', quoteId: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!form.companyId) { setError('Seleziona un\'azienda.'); return; }
    setSaving(true);
    setError('');
    try {
      await api.post('/contracts', {
        companyId: form.companyId,
        ...(form.opportunityId ? { opportunityId: form.opportunityId } : {}),
        ...(form.quoteId ? { quoteId: form.quoteId } : {}),
      });
      onCreated();
      onClose();
      setForm({ companyId: '', opportunityId: '', quoteId: '' });
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
      title="Nuovo Contratto"
      actions={
        <>
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Annulla</button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Creazione...' : 'Crea Contratto'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Azienda *</label>
          <select
            value={form.companyId}
            onChange={(e) => setForm((f) => ({ ...f, companyId: e.target.value }))}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Seleziona azienda...</option>
            {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">ID Opportunità (opzionale)</label>
          <input
            type="text"
            value={form.opportunityId}
            onChange={(e) => setForm((f) => ({ ...f, opportunityId: e.target.value }))}
            placeholder="UUID opportunità..."
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">ID Preventivo (opzionale)</label>
          <input
            type="text"
            value={form.quoteId}
            onChange={(e) => setForm((f) => ({ ...f, quoteId: e.target.value }))}
            placeholder="UUID preventivo..."
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
    </Modal>
  );
}

// ---- Detail Modal ----------------------------------------------------------

function ContractDetailModal({
  contract,
  onClose,
  onUpdated,
  companies,
}: {
  contract: Contract | null;
  onClose: () => void;
  onUpdated: () => void;
  companies: Company[];
}) {
  const [detail, setDetail] = useState<Contract | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [signerForm, setSignerForm] = useState({ signerEmail: '', signerName: '' });
  const [addingSigner, setAddingSigner] = useState(false);
  const [signerError, setSignerError] = useState('');
  const [statusError, setStatusError] = useState('');
  const [changingStatus, setChangingStatus] = useState('');

  const fetchDetail = useCallback(async (id: string) => {
    setLoadingDetail(true);
    try {
      const { data } = await api.get(`/contracts/${id}`);
      setDetail(data);
    } catch {
      setDetail(null);
    }
    setLoadingDetail(false);
  }, []);

  useEffect(() => {
    if (contract) fetchDetail(contract.id);
    else setDetail(null);
  }, [contract, fetchDetail]);

  const handleStatusChange = async (nextStatus: string) => {
    if (!detail) return;
    setChangingStatus(nextStatus);
    setStatusError('');
    try {
      await api.post(`/contracts/${detail.id}/status`, { status: nextStatus });
      await fetchDetail(detail.id);
      onUpdated();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setStatusError(typeof msg === 'string' ? msg : 'Errore cambio stato.');
    }
    setChangingStatus('');
  };

  const handleAddSigner = async () => {
    if (!detail) return;
    if (!signerEmail.trim() || !signerName.trim()) { setSignerError('Email e nome sono obbligatori.'); return; }
    setAddingSigner(true);
    setSignerError('');
    try {
      await api.post(`/contracts/${detail.id}/signatures`, {
        signerEmail: signerForm.signerEmail.trim(),
        signerName: signerForm.signerName.trim(),
      });
      setSignerForm({ signerEmail: '', signerName: '' });
      await fetchDetail(detail.id);
      onUpdated();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setSignerError(typeof msg === 'string' ? msg : 'Errore aggiunta firmatario.');
    }
    setAddingSigner(false);
  };

  const { signerEmail, signerName } = signerForm;
  const nextStates = detail ? (STATUS_FLOW[detail.status]?.next ?? []) : [];

  return (
    <Modal
      open={!!contract}
      onClose={onClose}
      title={detail ? `Contratto ${detail.contractNumber}` : 'Dettaglio Contratto'}
      size="lg"
    >
      {loadingDetail ? (
        <div className="py-12 text-center text-gray-400">Caricamento...</div>
      ) : !detail ? (
        <div className="py-12 text-center text-gray-400">Nessun dato disponibile.</div>
      ) : (
        <div className="space-y-6">
          {/* Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500">Numero</p>
              <p className="font-semibold text-gray-900">{detail.contractNumber}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Stato</p>
              <StatusBadge status={detail.status} />
            </div>
            <div>
              <p className="text-xs text-gray-500">Azienda</p>
              <p className="font-medium text-gray-700">{detail.company?.name ?? companies.find((c) => c.id === detail.companyId)?.name ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Data creazione</p>
              <p className="text-gray-700">{fmtDate(detail.createdAt)}</p>
            </div>
            {detail.signedAt && (
              <div>
                <p className="text-xs text-gray-500">Firmato il</p>
                <p className="text-emerald-700 font-medium">{fmtDate(detail.signedAt)}</p>
              </div>
            )}
          </div>

          {/* Document actions */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={async () => {
                try {
                  const { data } = await api.get(`/contracts/${detail.id}/document`, { responseType: 'text' });
                  const html = typeof data === 'string' ? data : JSON.stringify(data);
                  const w = window.open('', '_blank');
                  if (w) { w.document.write(html); w.document.close(); }
                } catch { setStatusError('Errore generazione documento.'); }
              }}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium"
            >
              <ExternalLink className="w-4 h-4" /> Genera Documento
            </button>
            {['ready_to_sign', 'signing', 'signed'].includes(detail.status) && (
              <button
                onClick={async () => {
                  try {
                    const response = await api.get(`/contracts/${detail.id}/pdf`, { responseType: 'blob' });
                    const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
                    window.open(url, '_blank');
                  } catch { setStatusError('Errore download PDF.'); }
                }}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-800 text-white rounded-lg hover:bg-gray-900 font-medium"
              >
                <Download className="w-4 h-4" /> Scarica PDF Contratto
              </button>
            )}
          </div>

          {/* Workflow buttons */}
          {nextStates.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Azioni stato</p>
              {statusError && <p className="text-sm text-red-600 mb-2">{statusError}</p>}
              <div className="flex flex-wrap gap-2">
                {nextStates.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleStatusChange(s)}
                    disabled={!!changingStatus}
                    className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors disabled:opacity-50 ${
                      s === 'void'
                        ? 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                        : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                    }`}
                  >
                    {changingStatus === s ? 'Aggiornamento...' : (STATUS_BTN[s] ?? s)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Signatures */}
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Firmatari</p>
            {!detail.signatures || detail.signatures.length === 0 ? (
              <p className="text-sm text-gray-400 italic">Nessun firmatario aggiunto.</p>
            ) : (
              <div className="space-y-2">
                {detail.signatures.map((sig) => (
                  <div key={sig.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    {signerStatusIcon(sig.status)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{sig.signerName}</p>
                      <p className="text-xs text-gray-500 truncate">{sig.signerEmail}</p>
                    </div>
                    <div className="text-right">
                      <StatusBadge status={sig.status} />
                      {sig.signedAt && <p className="text-xs text-gray-400 mt-0.5">{fmtDate(sig.signedAt)}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add signer form */}
          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-medium text-gray-500 mb-3 uppercase tracking-wide flex items-center gap-1">
              <User className="w-3.5 h-3.5" /> Aggiungi Firmatario
            </p>
            {signerError && <p className="text-sm text-red-600 mb-2">{signerError}</p>}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <input
                type="email"
                value={signerEmail}
                onChange={(e) => setSignerForm((f) => ({ ...f, signerEmail: e.target.value }))}
                placeholder="Email firmatario *"
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                value={signerName}
                onChange={(e) => setSignerForm((f) => ({ ...f, signerName: e.target.value }))}
                placeholder="Nome firmatario *"
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={handleAddSigner}
              disabled={addingSigner}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              {addingSigner ? 'Aggiunta...' : 'Aggiungi'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ---- Main Page -------------------------------------------------------------

export default function ContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const [companies, setCompanies] = useState<Company[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [search, setSearch] = useState('');

  const fetchContracts = useCallback(async (p = 1, q = '') => {
    setLoading(true);
    try {
      const { data } = await api.get('/contracts', { params: { page: p, limit: PAGE_SIZE, ...(q ? { search: q } : {}) } });
      setContracts(data.data ?? data);
      setTotal(data.total ?? (data.data ?? data).length);
    } catch {
      setContracts([]);
    }
    setLoading(false);
  }, []);

  const fetchCompanies = useCallback(async () => {
    try {
      const { data } = await api.get('/companies', { params: { limit: 100 } });
      setCompanies(data.data ?? data);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchContracts(1, search); }, []);
  useEffect(() => { fetchCompanies(); }, [fetchCompanies]);

  const handleSearch = (q: string) => {
    setSearch(q);
    setPage(1);
    fetchContracts(1, q);
  };

  const handlePageChange = (p: number) => {
    setPage(p);
    fetchContracts(p, search);
  };

  const columns: Column<Contract>[] = [
    {
      key: 'contractNumber',
      label: 'Numero',
      sortable: true,
      render: (v) => <span className="font-mono font-semibold text-gray-800">{String(v)}</span>,
    },
    {
      key: 'companyId',
      label: 'Azienda',
      render: (_, row) => {
        const company = companies.find((c) => c.id === row.companyId);
        return <span className="text-gray-700">{company?.name ?? row.company?.name ?? '—'}</span>;
      },
    },
    {
      key: 'status',
      label: 'Stato',
      render: (v) => <StatusBadge status={String(v)} />,
    },
    {
      key: 'createdAt',
      label: 'Data Creazione',
      sortable: true,
      render: (v) => <span className="text-gray-500">{fmtDate(String(v))}</span>,
    },
    {
      key: 'signedAt',
      label: 'Firma',
      render: (v) => v ? (
        <span className="flex items-center gap-1 text-emerald-700">
          <CheckCircle className="w-4 h-4" />
          {fmtDate(String(v))}
        </span>
      ) : <span className="text-gray-400">—</span>,
    },
    {
      key: 'id',
      label: '',
      render: () => <ChevronRight className="w-4 h-4 text-gray-400" />,
    },
  ];

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileSignature className="w-6 h-6 text-blue-600" />
            Contratti
          </h1>
          <p className="text-sm text-gray-500">Gestione contratti con workflow firma</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => fetchContracts(page, search)}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200 text-gray-600"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            <Plus className="w-4 h-4" /> Nuovo Contratto
          </button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={contracts}
        loading={loading}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={handlePageChange}
        onSearch={handleSearch}
        searchValue={search}
        onRowClick={(row) => setSelectedContract(row)}
        emptyText="Nessun contratto trovato"
      />

      <CreateContractModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => fetchContracts(1, search)}
        companies={companies}
      />

      <ContractDetailModal
        contract={selectedContract}
        onClose={() => setSelectedContract(null)}
        onUpdated={() => fetchContracts(page, search)}
        companies={companies}
      />
    </div>
  );
}
