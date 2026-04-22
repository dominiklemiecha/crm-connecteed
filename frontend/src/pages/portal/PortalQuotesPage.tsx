import { useState, useEffect } from 'react';
import { FileText, CheckCircle, XCircle, ChevronLeft, Download } from 'lucide-react';
import StatusBadge from '../../components/StatusBadge';
import Modal from '../../components/Modal';
import api from '../../services/api';

interface PortalQuote {
  id: string;
  quoteNumber?: string;
  number?: string;
  title?: string;
  status: string;
  totalCents: number;
  totalAmountCents?: number;
  currency?: string;
  createdAt: string;
  expiresAt?: string;
  items?: { description: string; quantity: number; unitPriceCents: number; totalCents?: number }[];
  currentVersionDetail?: { items?: { description: string; quantity: number; unitPriceCents: number; totalCents?: number }[] };
  notes?: string;
}

const fmtEur = (cents: number) =>
  `€ ${(cents / 100).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmt = (d?: string) => {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return d; }
};

export default function PortalQuotesPage() {
  const [quotes, setQuotes] = useState<PortalQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedQuote, setSelectedQuote] = useState<PortalQuote | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [declineModalOpen, setDeclineModalOpen] = useState(false);
  const [changesModalOpen, setChangesModalOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [changesReason, setChangesReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  const fetchQuotes = () => {
    setLoading(true);
    api.get('/portal/quotes')
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : (data.data ?? []);
        setQuotes(list);
      })
      .catch(() => setError('Impossibile caricare i preventivi.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchQuotes(); }, []);

  const openDetail = (q: PortalQuote) => {
    setDetailLoading(true);
    setSelectedQuote(q);
    api.get(`/portal/quotes/${q.id}`)
      .then(({ data }) => setSelectedQuote(data))
      .catch(() => {})
      .finally(() => setDetailLoading(false));
  };

  const handleAccept = async (quoteId: string) => {
    setActionLoading(true);
    setActionError('');
    try {
      await api.post(`/portal/quotes/${quoteId}/accept`);
      fetchQuotes();
      setSelectedQuote(null);
    } catch {
      setActionError('Errore durante l\'accettazione del preventivo.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDecline = async (quoteId: string) => {
    if (!declineReason.trim()) { setActionError('Inserisci il motivo del rifiuto.'); return; }
    setActionLoading(true);
    setActionError('');
    try {
      await api.post(`/portal/quotes/${quoteId}/decline`, { reason: declineReason });
      fetchQuotes();
      setDeclineModalOpen(false);
      setSelectedQuote(null);
      setDeclineReason('');
    } catch {
      setActionError('Errore durante il rifiuto del preventivo.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestChanges = async (quoteId: string) => {
    if (!changesReason.trim()) { setActionError('Descrivi le modifiche richieste.'); return; }
    setActionLoading(true);
    setActionError('');
    try {
      await api.post(`/portal/quotes/${quoteId}/request-changes`, { reason: changesReason });
      fetchQuotes();
      setChangesModalOpen(false);
      setSelectedQuote(null);
      setChangesReason('');
    } catch {
      setActionError('Errore durante la richiesta di modifiche.');
    } finally {
      setActionLoading(false);
    }
  };

  const canAction = selectedQuote?.status === 'sent' || selectedQuote?.status === 'pending_approval';

  if (selectedQuote) {
    return (
      <div className="p-6 space-y-6 max-w-3xl mx-auto">
        <button
          onClick={() => setSelectedQuote(null)}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ChevronLeft className="w-4 h-4" />
          Torna ai preventivi
        </button>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{selectedQuote.title ?? `Preventivo #${selectedQuote.quoteNumber}`}</h1>
              <p className="text-sm text-gray-400 mt-1">Emesso il {fmt(selectedQuote.createdAt)}{selectedQuote.expiresAt ? ` — Scade il ${fmt(selectedQuote.expiresAt)}` : ''}</p>
            </div>
            <StatusBadge status={selectedQuote.status} />
          </div>

          {detailLoading && <div className="text-center py-8 text-gray-400 animate-pulse">Caricamento dettagli...</div>}

          {!detailLoading && (selectedQuote.currentVersionDetail?.items || selectedQuote.items) && (selectedQuote.currentVersionDetail?.items || selectedQuote.items)!.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Voci</h3>
              <div className="bg-gray-50 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Descrizione</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">Qty</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">Prezzo unit.</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">Totale</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedQuote.currentVersionDetail?.items || selectedQuote.items || []).map((item, i) => (
                      <tr key={i} className="border-b border-gray-100 last:border-0">
                        <td className="px-4 py-3 text-gray-700">{item.description}</td>
                        <td className="px-4 py-3 text-right text-gray-600">{item.quantity}</td>
                        <td className="px-4 py-3 text-right text-gray-600">{fmtEur(item.unitPriceCents)}</td>
                        <td className="px-4 py-3 text-right font-medium text-gray-900">{fmtEur(item.quantity * item.unitPriceCents)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-gray-200 bg-gray-100">
                      <td colSpan={3} className="px-4 py-3 font-semibold text-gray-700 text-right">Totale</td>
                      <td className="px-4 py-3 text-right font-bold text-gray-900 text-base">{fmtEur(selectedQuote.totalCents)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {selectedQuote.notes && (
            <div className="bg-blue-50 rounded-xl p-4 mb-6">
              <p className="text-sm font-medium text-blue-700 mb-1">Note</p>
              <p className="text-sm text-blue-800">{selectedQuote.notes}</p>
            </div>
          )}

          {/* FIX 6: Accepted status message */}
          {selectedQuote.status === 'accepted' && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6 flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-emerald-800">
                <span className="font-semibold">Preventivo accettato.</span> Il team Connecteed preparerà il contratto e vi contatterà per i prossimi passi.
              </p>
            </div>
          )}
          {selectedQuote.status === 'revision' && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3">
              <p className="text-sm text-amber-800">
                <span className="font-semibold">Modifiche richieste.</span> Il commerciale sta lavorando a una nuova versione del preventivo. Riceverai una notifica quando sarà disponibile.
              </p>
            </div>
          )}
          {selectedQuote.status === 'declined' && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start gap-3">
              <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">
                <span className="font-semibold">Preventivo rifiutato.</span>
              </p>
            </div>
          )}

          {/* FIX 2: Download PDF button */}
          <div className="mb-4">
            <button
              onClick={async () => {
                try {
                  const response = await api.get(`/quotes/${selectedQuote.id}/pdf`, { responseType: 'blob' });
                  const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
                  window.open(url, '_blank');
                } catch { /* silent */ }
              }}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Download className="w-4 h-4" />
              Scarica PDF
            </button>
          </div>

          {actionError && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 mb-4">{actionError}</div>}

          {canAction && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleAccept(selectedQuote.id)}
                disabled={actionLoading}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 disabled:bg-emerald-400 transition-colors"
              >
                <CheckCircle className="w-4 h-4" />
                {actionLoading ? 'Invio...' : 'Accetta Preventivo'}
              </button>
              <button
                onClick={() => { setChangesModalOpen(true); setActionError(''); }}
                disabled={actionLoading}
                className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-medium hover:bg-amber-600 disabled:bg-amber-400 transition-colors"
              >
                Richiedi Modifiche
              </button>
              <button
                onClick={() => { setDeclineModalOpen(true); setActionError(''); }}
                disabled={actionLoading}
                className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 disabled:bg-red-400 transition-colors"
              >
                <XCircle className="w-4 h-4" />
                Rifiuta
              </button>
            </div>
          )}
        </div>

        {/* Decline Modal */}
        <Modal
          open={declineModalOpen}
          onClose={() => setDeclineModalOpen(false)}
          title="Rifiuta Preventivo"
          size="sm"
          actions={
            <>
              <button onClick={() => setDeclineModalOpen(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">Annulla</button>
              <button
                onClick={() => handleDecline(selectedQuote.id)}
                disabled={actionLoading}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:bg-red-400 font-medium"
              >
                {actionLoading ? 'Invio...' : 'Conferma Rifiuto'}
              </button>
            </>
          }
        >
          {actionError && <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{actionError}</div>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Motivo del rifiuto *</label>
            <textarea
              rows={4}
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="Indica il motivo per cui stai rifiutando il preventivo..."
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
            />
          </div>
        </Modal>

        {/* Request Changes Modal */}
        <Modal
          open={changesModalOpen}
          onClose={() => setChangesModalOpen(false)}
          title="Richiedi Modifiche al Preventivo"
          actions={
            <>
              <button onClick={() => setChangesModalOpen(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">Annulla</button>
              <button
                onClick={() => handleRequestChanges(selectedQuote.id)}
                disabled={actionLoading}
                className="px-4 py-2 text-sm bg-amber-500 text-white rounded-xl hover:bg-amber-600 disabled:bg-amber-400 font-medium"
              >
                {actionLoading ? 'Invio...' : 'Invia Richiesta'}
              </button>
            </>
          }
        >
          {actionError && <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{actionError}</div>}
          <p className="text-sm text-gray-600 mb-3">Descrivi le modifiche che vorresti apportare al preventivo. Il commerciale creerà una nuova versione e te la invierà per approvazione.</p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Modifiche richieste *</label>
            <textarea
              rows={4}
              value={changesReason}
              onChange={(e) => setChangesReason(e.target.value)}
              placeholder="Es: vorremmo ridurre il numero di giornate di formazione, aggiungere un modulo newsletter..."
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
            />
          </div>
        </Modal>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Preventivi</h1>
        <p className="text-sm text-gray-500 mt-1">Visualizza e gestisci i tuoi preventivi</p>
      </div>

      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="text-center py-20 text-gray-400 animate-pulse">Caricamento...</div>
      ) : quotes.length === 0 ? (
        <div className="text-center py-20 text-gray-400">Nessun preventivo disponibile.</div>
      ) : (
        <div className="grid gap-3">
          {quotes.map((quote) => (
            <div
              key={quote.id}
              onClick={() => openDetail(quote)}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:border-blue-300 cursor-pointer transition-colors flex items-center gap-4"
            >
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <p className="font-medium text-gray-900">{quote.title ?? `Preventivo #${quote.quoteNumber ?? quote.id.slice(0, 8)}`}</p>
                  <StatusBadge status={quote.status} />
                </div>
                <div className="flex items-center gap-4 mt-1 text-sm text-gray-400">
                  <span>{fmt(quote.createdAt)}</span>
                  <span className="font-semibold text-gray-700">{fmtEur(quote.totalCents)}</span>
                </div>
              </div>
              <ChevronLeft className="w-4 h-4 text-gray-300 rotate-180" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
