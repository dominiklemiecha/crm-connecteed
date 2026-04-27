import { useState, useEffect, useRef } from 'react';
import { Plus, ChevronLeft, Send } from 'lucide-react';
import StatusBadge from '../../components/StatusBadge';
import Modal from '../../components/Modal';
import api from '../../services/api';

interface PortalTicket {
  id: string;
  subject: string;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt?: string;
}

interface TicketMessage {
  id: string;
  body: string;
  createdAt: string;
  author?: { firstName: string; lastName: string; type: string };
  isInternal?: boolean;
}

interface NewTicketForm {
  subject: string;
  body: string;
  priority: string;
}

const emptyForm: NewTicketForm = { subject: '', body: '', priority: 'medium' };

const fmt = (d?: string) => {
  if (!d) return '';
  try { return new Date(d).toLocaleString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); }
  catch { return d; }
};

export default function PortalTicketsPage() {
  const [tickets, setTickets] = useState<PortalTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedTicket, setSelectedTicket] = useState<PortalTicket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [reply, setReply] = useState('');
  const [replying, setReplying] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [newModalOpen, setNewModalOpen] = useState(false);
  const [form, setForm] = useState<NewTicketForm>(emptyForm);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchTickets = () => {
    setLoading(true);
    api.get('/portal/tickets')
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : (data.data ?? []);
        setTickets(list);
      })
      .catch(() => setError('Impossibile caricare i ticket.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchTickets(); }, []);

  const openTicket = (ticket: PortalTicket) => {
    setSelectedTicket(ticket);
    setMessagesLoading(true);
    api.get(`/portal/tickets/${ticket.id}/messages`)
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : (data.data ?? []);
        setMessages(list);
      })
      .catch(() => setMessages([]))
      .finally(() => setMessagesLoading(false));
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleReply = async () => {
    if (!reply.trim() || !selectedTicket) return;
    setReplying(true);
    try {
      await api.post(`/portal/tickets/${selectedTicket.id}/reply`, { body: reply });
      setReply('');
      // Refresh messages
      const { data } = await api.get(`/portal/tickets/${selectedTicket.id}/messages`);
      setMessages(Array.isArray(data) ? data : (data.data ?? []));
    } catch {
      // ignore
    } finally {
      setReplying(false);
    }
  };

  const handleCreate = async () => {
    if (!form.subject.trim() || !form.body.trim()) {
      setFormError('Oggetto e messaggio sono obbligatori.');
      return;
    }
    setCreating(true);
    setFormError('');
    try {
      await api.post('/portal/tickets', form);
      setNewModalOpen(false);
      setForm(emptyForm);
      fetchTickets();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setFormError(Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Errore creazione ticket.'));
    } finally {
      setCreating(false);
    }
  };

  if (selectedTicket) {
    return (
      <div className="p-4 sm:p-6 space-y-4 max-w-3xl mx-auto flex flex-col h-[calc(100dvh-56px)]">
        <button
          onClick={() => setSelectedTicket(null)}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 self-start"
        >
          <ChevronLeft className="w-4 h-4" />
          Torna ai ticket
        </button>

        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-900">{selectedTicket.subject}</h2>
            <p className="text-xs text-gray-400 mt-0.5">Aperto il {fmt(selectedTicket.createdAt)}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={selectedTicket.priority} />
            <StatusBadge status={selectedTicket.status} />
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 bg-white rounded-xl border border-gray-200 overflow-y-auto p-4 space-y-4">
          {messagesLoading ? (
            <div className="text-center py-8 text-gray-400 animate-pulse">Caricamento messaggi...</div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8 text-gray-400">Nessun messaggio.</div>
          ) : (
            messages.map((msg) => {
              const isClient = msg.author?.type === 'client' || !msg.author?.type;
              return (
                <div key={msg.id} className={`flex ${isClient ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${isClient ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'}`}>
                    {!isClient && (
                      <p className={`text-xs font-semibold mb-1 ${isClient ? 'text-blue-100' : 'text-gray-500'}`}>
                        {msg.author?.firstName} {msg.author?.lastName} — Supporto Connecteed
                      </p>
                    )}
                    <p className="text-sm whitespace-pre-wrap">{msg.body}</p>
                    <p className={`text-xs mt-1 ${isClient ? 'text-blue-200' : 'text-gray-400'}`}>{fmt(msg.createdAt)}</p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Reply */}
        <div className="bg-white rounded-xl border border-gray-200 p-3 flex items-end gap-3">
          <textarea
            rows={2}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleReply(); }}
            placeholder="Scrivi una risposta... (Ctrl+Enter per inviare)"
            className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
          <button
            onClick={handleReply}
            disabled={replying || !reply.trim()}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
          >
            <Send className="w-4 h-4" />
            {replying ? '...' : 'Invia'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Ticket di Supporto</h1>
          <p className="text-sm text-gray-500 mt-1">Apri e gestisci le tue richieste di supporto</p>
        </div>
        <button
          onClick={() => { setForm(emptyForm); setFormError(''); setNewModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nuovo Ticket
        </button>
      </div>

      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="text-center py-20 text-gray-400 animate-pulse">Caricamento...</div>
      ) : tickets.length === 0 ? (
        <div className="text-center py-20 text-gray-400">Nessun ticket. Hai bisogno di aiuto? Apri un nuovo ticket.</div>
      ) : (
        <div className="grid gap-3">
          {tickets.map((ticket) => (
            <div
              key={ticket.id}
              onClick={() => openTicket(ticket)}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:border-blue-300 cursor-pointer transition-colors"
            >
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="font-medium text-gray-900">{ticket.subject}</h3>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={ticket.priority} />
                  <StatusBadge status={ticket.status} />
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-2">Aperto il {fmt(ticket.createdAt)}</p>
            </div>
          ))}
        </div>
      )}

      {/* New Ticket Modal */}
      <Modal
        open={newModalOpen}
        onClose={() => setNewModalOpen(false)}
        title="Nuovo Ticket di Supporto"
        size="md"
        actions={
          <>
            <button onClick={() => setNewModalOpen(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">Annulla</button>
            <button onClick={handleCreate} disabled={creating} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-blue-400 font-medium">
              {creating ? 'Invio...' : 'Apri Ticket'}
            </button>
          </>
        }
      >
        {formError && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{formError}</div>}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Oggetto *</label>
            <input
              type="text"
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              placeholder="Descrivi brevemente il problema"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Priorita</label>
            <select
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="low">Bassa</option>
              <option value="medium">Media</option>
              <option value="high">Alta</option>
              <option value="urgent">Urgente</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Messaggio *</label>
            <textarea
              rows={5}
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              placeholder="Descrivi il problema in dettaglio..."
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
