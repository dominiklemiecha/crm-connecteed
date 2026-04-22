import { useState, useEffect, useCallback } from 'react';
import { CheckCircle, XCircle, Clock, RefreshCw, FileText, Building2, User, Euro } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import api from '../services/api';

interface EntityDetail {
  quoteNumber?: string;
  contractNumber?: string;
  totalCents?: number;
  notes?: string;
  companyName?: string;
}

interface Approval {
  id: string;
  type: string;
  entityType?: string; // legacy alias
  entityId: string;
  entityRef?: string;
  requestedBy?: string;
  requestedByName?: string;
  notes?: string;
  status: 'pending' | 'approved' | 'rejected';
  amount?: number;
  clientName?: string;
  entityDetail?: EntityDetail;
  createdAt: string;
  requestedAt?: string;
  decidedAt?: string;
  decisionNotes?: string;
}

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState<'pending' | 'all'>('pending');

  const [confirmModal, setConfirmModal] = useState<{ approval: Approval; action: 'approve' | 'reject' } | null>(null);
  const [rejectNotes, setRejectNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [processError, setProcessError] = useState('');

  const fetchApprovals = useCallback(async () => {
    setLoading(true);
    try {
      const endpoint = filterStatus === 'pending' ? '/approvals/pending' : '/approvals';
      const { data } = await api.get(endpoint);
      setApprovals(Array.isArray(data) ? data : data.data ?? []);
    } catch {
      setError('Impossibile caricare le approvazioni.');
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => { fetchApprovals(); }, [fetchApprovals]);

  const handleAction = async () => {
    if (!confirmModal) return;
    if (confirmModal.action === 'reject' && !rejectNotes.trim()) {
      setProcessError('Le note sono obbligatorie per il rifiuto.');
      return;
    }
    setProcessing(true);
    setProcessError('');
    try {
      if (confirmModal.action === 'approve') {
        await api.post(`/approvals/${confirmModal.approval.id}/approve`);
      } else {
        await api.post(`/approvals/${confirmModal.approval.id}/reject`, { notes: rejectNotes });
      }
      setConfirmModal(null);
      setRejectNotes('');
      fetchApprovals();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setProcessError(msg ?? 'Errore durante l\'operazione.');
    } finally {
      setProcessing(false);
    }
  };

  const getType = (a: Approval) => a.type || a.entityType || '';

  const entityTypeLabel: Record<string, string> = {
    quote: 'Preventivo',
    contract: 'Contratto',
    change_request: 'Change Request',
  };

  const entityTypeColor: Record<string, string> = {
    quote: 'bg-purple-100 text-purple-700',
    contract: 'bg-blue-100 text-blue-700',
    change_request: 'bg-orange-100 text-orange-700',
  };

  const formatAmount = (cents?: number) => {
    if (!cents || isNaN(cents)) return null;
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(cents / 100);
  };

  const pendingCount = approvals.filter((a) => a.status === 'pending').length;

  // Build a summary for the confirm modal
  const getApprovalSummary = (a: Approval) => {
    const type = getType(a);
    const detail = a.entityDetail;
    const ref = a.entityRef || detail?.quoteNumber || detail?.contractNumber;
    const label = entityTypeLabel[type] || type;
    return { label, ref, detail };
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Approvazioni CEO</h1>
          <p className="text-sm text-gray-500 mt-1">Gestione approvazioni preventivi e contratti</p>
        </div>
        <div className="flex items-center gap-3">
          {pendingCount > 0 && (
            <span className="bg-amber-100 text-amber-800 text-sm font-bold px-3 py-1 rounded-full flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              {pendingCount} in attesa
            </span>
          )}
          <button onClick={fetchApprovals} className="p-2 text-gray-500 hover:text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {(['pending', 'all'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilterStatus(f)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              filterStatus === f ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {f === 'pending' ? 'In Attesa' : 'Tutte'}
          </button>
        ))}
      </div>

      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>}

      {/* List */}
      <div className="space-y-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-24 h-6 bg-gray-200 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/3" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            </div>
          ))
        ) : approvals.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 flex flex-col items-center py-16 text-gray-400">
            <CheckCircle className="w-12 h-12 mb-3 opacity-40 text-green-500" />
            <p className="font-medium text-gray-600">Nessuna approvazione{filterStatus === 'pending' ? ' in attesa' : ''}</p>
            <p className="text-sm">Tutte le richieste sono state elaborate.</p>
          </div>
        ) : (
          approvals.map((a) => {
            const type = getType(a);
            const detail = a.entityDetail;
            const ref = a.entityRef || detail?.quoteNumber || detail?.contractNumber;

            return (
              <div key={a.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-shadow">
                <div className="flex items-start gap-4">
                  {/* Type badge */}
                  <div className="flex-shrink-0 pt-0.5">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${entityTypeColor[type] ?? 'bg-gray-100 text-gray-600'}`}>
                      {entityTypeLabel[type] ?? type}
                    </span>
                  </div>

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    {/* Title row */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {ref && <p className="font-bold text-gray-900 font-mono">{ref}</p>}
                      <StatusBadge status={a.status} />
                    </div>

                    {/* Detail card */}
                    <div className="mt-2 flex items-center gap-4 flex-wrap text-sm">
                      {(a.clientName || detail?.companyName) && (
                        <span className="flex items-center gap-1 text-gray-600">
                          <Building2 className="w-3.5 h-3.5 text-gray-400" />
                          {a.clientName || detail?.companyName}
                        </span>
                      )}
                      {(a.amount || detail?.totalCents) && (
                        <span className="flex items-center gap-1 font-semibold text-gray-800">
                          <Euro className="w-3.5 h-3.5 text-gray-400" />
                          {formatAmount(a.amount || detail?.totalCents)}
                        </span>
                      )}
                      {a.requestedByName && (
                        <span className="flex items-center gap-1 text-gray-500">
                          <User className="w-3.5 h-3.5 text-gray-400" />
                          {a.requestedByName}
                        </span>
                      )}
                      <span className="text-gray-400">
                        {format(new Date(a.requestedAt || a.createdAt), 'dd/MM/yyyy HH:mm', { locale: it })}
                      </span>
                    </div>

                    {/* Quote notes preview */}
                    {detail?.notes && (
                      <div className="mt-2 bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-600 flex items-start gap-2">
                        <FileText className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                        <span className="line-clamp-2">{detail.notes}</span>
                      </div>
                    )}

                    {/* Decision notes (for already decided) */}
                    {a.decisionNotes && (
                      <p className="mt-2 text-sm text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                        <span className="font-medium">Note decisione:</span> {a.decisionNotes}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  {a.status === 'pending' && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => { setConfirmModal({ approval: a, action: 'approve' }); setRejectNotes(''); setProcessError(''); }}
                        className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Approva
                      </button>
                      <button
                        onClick={() => { setConfirmModal({ approval: a, action: 'reject' }); setRejectNotes(''); setProcessError(''); }}
                        className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-colors"
                      >
                        <XCircle className="w-4 h-4" />
                        Rifiuta
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Confirm Modal */}
      <Modal
        open={!!confirmModal}
        onClose={() => setConfirmModal(null)}
        title={confirmModal?.action === 'approve' ? 'Conferma Approvazione' : 'Conferma Rifiuto'}
        actions={
          <>
            <button
              onClick={() => setConfirmModal(null)}
              className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50"
            >
              Annulla
            </button>
            <button
              onClick={handleAction}
              disabled={processing}
              className={`px-4 py-2 text-sm text-white rounded-xl font-medium transition-colors disabled:opacity-50 ${
                confirmModal?.action === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {processing ? 'Elaborazione...' : confirmModal?.action === 'approve' ? 'Conferma Approvazione' : 'Conferma Rifiuto'}
            </button>
          </>
        }
      >
        {processError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{processError}</div>
        )}

        {/* Show what they're approving */}
        {confirmModal && (() => {
          const { label, ref, detail } = getApprovalSummary(confirmModal.approval);
          return (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-500">{label}</span>
                  {ref && <span className="font-mono font-bold text-gray-900">{ref}</span>}
                </div>
                {(confirmModal.approval.clientName || detail?.companyName) && (
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Building2 className="w-4 h-4 text-gray-400" />
                    {confirmModal.approval.clientName || detail?.companyName}
                  </div>
                )}
                {(confirmModal.approval.amount || detail?.totalCents) && (
                  <div className="flex items-center gap-2 text-lg font-bold text-gray-900">
                    <Euro className="w-4 h-4 text-gray-400" />
                    {formatAmount(confirmModal.approval.amount || detail?.totalCents)}
                  </div>
                )}
                {detail?.notes && (
                  <p className="text-sm text-gray-600 border-t border-gray-200 pt-2 mt-2">{detail.notes}</p>
                )}
              </div>

              {confirmModal.action === 'approve' ? (
                <p className="text-sm text-gray-600">
                  Confermi l'approvazione di questo {label.toLowerCase()}?
                </p>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">Inserisci le motivazioni del rifiuto (obbligatorio):</p>
                  <textarea
                    rows={3}
                    value={rejectNotes}
                    onChange={(e) => setRejectNotes(e.target.value)}
                    placeholder="Motivo del rifiuto..."
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                  />
                </div>
              )}
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
