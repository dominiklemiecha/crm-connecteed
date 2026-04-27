import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Ticket, Send, X, Clock, MessageSquare, Settings, Trash2, Edit2, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import DataTable, { Column } from '../components/DataTable';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import api from '../services/api';

type TicketStatus = 'open' | 'in_progress' | 'waiting' | 'closed';
type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

interface TicketItem {
  id: string;
  ticketNumber: string;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  assignedTeam?: string;
  assignedTo?: string;
  slaDeadline?: string;
  createdAt: string;
  description?: string;
  category?: string;
  type?: string;
  channel?: string;
}

interface UserItem { id: string; firstName?: string; lastName?: string; email: string; }

interface TicketMessage {
  id: string;
  content: string;
  authorId: string;
  authorType: string;
  authorName: string | null;
  isInternal: boolean;
  createdAt: string;
}

interface CannedResponseItem {
  id: string;
  title: string;
  content: string;
  category?: string;
  sortOrder: number;
}

interface CannedResponseForm {
  title: string;
  content: string;
  category: string;
  sortOrder: number;
}

const emptyCannedForm: CannedResponseForm = { title: '', content: '', category: '', sortOrder: 0 };

interface TicketForm {
  subject: string;
  description: string;
  priority: TicketPriority;
  type: string;
  category: string;
  assignedTeam: string;
  slaClass: string;
}

const emptyForm: TicketForm = {
  subject: '', description: '', priority: 'medium',
  type: '', category: '', assignedTeam: '', slaClass: 'support',
};

export default function TicketsPage() {
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedTicket, setSelectedTicket] = useState<TicketItem | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [replyContent, setReplyContent] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [replying, setReplying] = useState(false);

  const [newModal, setNewModal] = useState(false);
  const [form, setForm] = useState<TicketForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Canned responses state
  const [cannedResponses, setCannedResponses] = useState<CannedResponseItem[]>([]);
  const [cannedDropdownOpen, setCannedDropdownOpen] = useState(false);
  const [cannedModal, setCannedModal] = useState(false);
  const [cannedForm, setCannedForm] = useState<CannedResponseForm>(emptyCannedForm);
  const [editingCannedId, setEditingCannedId] = useState<string | null>(null);
  const [cannedSaving, setCannedSaving] = useState(false);
  const cannedDropdownRef = useRef<HTMLDivElement>(null);

  const PAGE_SIZE = 20;

  const fetchUsers = useCallback(async () => {
    try {
      const { data } = await api.get('/users', { params: { limit: 100 } });
      setUsers(Array.isArray(data) ? data : data.data ?? []);
    } catch { /* silent */ }
  }, []);

  const getUserName = useCallback((id?: string) => {
    if (!id) return null;
    const u = users.find((x) => x.id === id);
    if (!u) return id;
    return [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email;
  }, [users]);

  const fetchCannedResponses = useCallback(async () => {
    try {
      const { data } = await api.get('/tickets/canned-responses');
      setCannedResponses(Array.isArray(data) ? data : data.data ?? []);
    } catch { /* silent */ }
  }, []);

  // Close canned dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (cannedDropdownRef.current && !cannedDropdownRef.current.contains(e.target as Node)) {
        setCannedDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/tickets', {
        params: { page, limit: PAGE_SIZE, search: search || undefined, status: statusFilter || undefined, priority: priorityFilter || undefined },
      });
      const list = Array.isArray(data) ? data : data.data ?? [];
      setTickets(list);
      setTotal(data.total ?? list.length);
    } catch {
      setError('Impossibile caricare i ticket.');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, priorityFilter]);

  useEffect(() => { fetchTickets(); fetchUsers(); fetchCannedResponses(); }, [fetchTickets, fetchUsers, fetchCannedResponses]);
  useEffect(() => { setPage(1); }, [search, statusFilter, priorityFilter]);

  const fetchMessages = useCallback(async (ticketId: string) => {
    try {
      const { data } = await api.get(`/tickets/${ticketId}/messages`);
      setMessages(Array.isArray(data) ? data : data.data ?? []);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    if (selectedTicket) fetchMessages(selectedTicket.id);
  }, [selectedTicket, fetchMessages]);

  const handleReply = async () => {
    if (!selectedTicket || !replyContent.trim()) return;
    setReplying(true);
    try {
      await api.post(`/tickets/${selectedTicket.id}/reply`, { content: replyContent, isInternal });
      setReplyContent('');
      fetchMessages(selectedTicket.id);
    } catch {
      setError('Errore durante l\'invio della risposta.');
    } finally {
      setReplying(false);
    }
  };

  const handleStatusChange = async (ticketId: string, newStatus: TicketStatus) => {
    try {
      await api.put(`/tickets/${ticketId}/status`, { status: newStatus });
      setTickets((prev) => prev.map((t) => t.id === ticketId ? { ...t, status: newStatus } : t));
      setSelectedTicket((prev) => prev ? { ...prev, status: newStatus } : null);
    } catch {
      setError('Errore durante l\'aggiornamento dello stato.');
    }
  };

  const handleSave = async () => {
    if (!form.subject.trim()) { setFormError('Il soggetto è obbligatorio.'); return; }
    setSaving(true); setFormError('');
    try {
      await api.post('/tickets', form);
      setNewModal(false);
      setForm(emptyForm);
      fetchTickets();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setFormError(msg ?? 'Errore durante la creazione del ticket.');
    } finally {
      setSaving(false);
    }
  };

  const handleSelectCanned = (cr: CannedResponseItem) => {
    setReplyContent((prev) => prev ? prev + '\n' + cr.content : cr.content);
    setCannedDropdownOpen(false);
  };

  const handleSaveCanned = async () => {
    if (!cannedForm.title.trim() || !cannedForm.content.trim()) return;
    setCannedSaving(true);
    try {
      if (editingCannedId) {
        await api.put(`/tickets/canned-responses/${editingCannedId}`, cannedForm);
      } else {
        await api.post('/tickets/canned-responses', cannedForm);
      }
      setCannedForm(emptyCannedForm);
      setEditingCannedId(null);
      fetchCannedResponses();
    } catch { setError('Errore durante il salvataggio della risposta predefinita.'); }
    finally { setCannedSaving(false); }
  };

  const handleDeleteCanned = async (id: string) => {
    try {
      await api.delete(`/tickets/canned-responses/${id}`);
      fetchCannedResponses();
    } catch { setError('Errore durante l\'eliminazione della risposta predefinita.'); }
  };

  const handleEditCanned = (cr: CannedResponseItem) => {
    setCannedForm({ title: cr.title, content: cr.content, category: cr.category ?? '', sortOrder: cr.sortOrder });
    setEditingCannedId(cr.id);
  };

  const priorityColor: Record<TicketPriority, string> = {
    low: 'bg-gray-100 text-gray-600',
    medium: 'bg-blue-100 text-blue-700',
    high: 'bg-orange-100 text-orange-700',
    urgent: 'bg-red-100 text-red-700',
  };

  const isSlaBreached = (ticket: TicketItem) => {
    if (!ticket.slaDeadline || ticket.status === 'closed') return false;
    return new Date(ticket.slaDeadline) < new Date();
  };

  const columns: Column<TicketItem>[] = [
    {
      key: 'ticketNumber', label: '#', sortable: true,
      render: (v) => <span className="font-mono text-xs text-gray-500">{String(v)}</span>,
    },
    {
      key: 'subject', label: 'Soggetto',
      render: (v, row) => (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-gray-900">{String(v)}</span>
          {/* FIX 5: portal badge */}
          {row.channel === 'portal' && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">
              Portale
            </span>
          )}
          {isSlaBreached(row) && <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">SLA scaduto</span>}
        </div>
      ),
    },
    { key: 'status', label: 'Stato', render: (v) => <StatusBadge status={String(v)} /> },
    {
      key: 'priority', label: 'Priorità',
      render: (v) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${priorityColor[v as TicketPriority]}`}>
          {v as string}
        </span>
      ),
    },
    { key: 'assignedTeam', label: 'Team', render: (v) => <span className="text-gray-600">{String(v ?? '—')}</span> },
    {
      key: 'assignedTo', label: 'Assegnato a',
      render: (v) => {
        const name = getUserName(v as string | undefined);
        return <span className="text-gray-600">{name ?? '—'}</span>;
      },
    },
    {
      key: 'slaDeadline', label: 'Scadenza SLA',
      render: (v, row) => v ? (
        <span className={isSlaBreached(row) ? 'text-red-600 font-medium' : 'text-gray-600'}>
          {format(new Date(String(v)), 'dd/MM HH:mm', { locale: it })}
        </span>
      ) : <span className="text-gray-400">—</span>,
    },
    {
      key: 'createdAt', label: 'Creato',
      render: (v) => <span className="text-gray-500 text-xs">{format(new Date(String(v)), 'dd/MM/yyyy', { locale: it })}</span>,
    },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Ticket className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600 flex-shrink-0" />
            Ticket
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">{total} ticket nel sistema</p>
        </div>
        <button
          onClick={() => { setForm(emptyForm); setFormError(''); setNewModal(true); }}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-xl text-sm font-medium hover:bg-orange-700 w-full sm:w-auto"
        >
          <Plus className="w-4 h-4" />
          Nuovo Ticket
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-3">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500">
          <option value="">Tutti gli stati</option>
          <option value="open">Aperti</option>
          <option value="in_progress">In lavorazione</option>
          <option value="waiting">In attesa</option>
          <option value="closed">Chiusi</option>
        </select>
        <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500">
          <option value="">Tutte le priorità</option>
          <option value="urgent">Urgente</option>
          <option value="high">Alta</option>
          <option value="medium">Media</option>
          <option value="low">Bassa</option>
        </select>
      </div>

      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>}

      <DataTable
        columns={columns}
        data={tickets}
        loading={loading}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        onSearch={setSearch}
        searchValue={search}
        onRowClick={(t) => setSelectedTicket(t)}
      />

      {/* Ticket Detail Sidebar */}
      {selectedTicket && (
        <div className="fixed inset-0 sm:inset-y-0 sm:right-0 sm:left-auto sm:w-[480px] bg-white shadow-2xl sm:border-l border-gray-200 z-40 flex flex-col">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div>
              <p className="text-xs text-gray-400 font-mono">{selectedTicket.ticketNumber}</p>
              <h3 className="font-semibold text-gray-900 leading-tight">{selectedTicket.subject}</h3>
            </div>
            <button onClick={() => setSelectedTicket(null)} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-3 px-6 py-3 border-b border-gray-100 bg-gray-50 flex-wrap">
            <StatusBadge status={selectedTicket.status} />
            <StatusBadge status={selectedTicket.priority} />
            {selectedTicket.assignedTeam && (
              <span className="text-xs text-gray-500">Team: {selectedTicket.assignedTeam}</span>
            )}
            {selectedTicket.assignedTo && (
              <span className="text-xs text-gray-500">
                Assegnato a: {getUserName(selectedTicket.assignedTo) ?? '—'}
              </span>
            )}
            {selectedTicket.slaDeadline && (
              <div className={`flex items-center gap-1 text-xs ${isSlaBreached(selectedTicket) ? 'text-red-600' : 'text-gray-500'}`}>
                <Clock className="w-3.5 h-3.5" />
                SLA: {format(new Date(selectedTicket.slaDeadline), 'dd/MM HH:mm')}
              </div>
            )}
          </div>

          {/* Status change */}
          <div className="px-6 py-3 border-b border-gray-100">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-gray-500">Cambia stato:</span>
              {(['open', 'in_progress', 'waiting', 'closed'] as TicketStatus[]).map((s) => (
                <button
                  key={s}
                  onClick={() => handleStatusChange(selectedTicket.id, s)}
                  disabled={selectedTicket.status === s}
                  className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${
                    selectedTicket.status === s ? 'bg-gray-200 text-gray-500' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {s.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {selectedTicket.description && (
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <p className="text-xs text-gray-400 mb-1">Descrizione originale</p>
                <p className="text-sm text-gray-700 whitespace-pre-line">{selectedTicket.description}</p>
              </div>
            )}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`rounded-xl p-4 ${msg.isInternal ? 'bg-amber-50 border border-amber-200' : msg.authorType === 'customer' || msg.authorType === 'client' ? 'bg-blue-50 border border-blue-200' : 'bg-white border border-gray-200'}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                      msg.authorType === 'customer' || msg.authorType === 'client'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {msg.authorType === 'customer' || msg.authorType === 'client' ? 'Cliente' : 'Agente'}
                    </span>
                    <span className="text-xs font-medium text-gray-700">
                      {msg.authorName ?? getUserName(msg.authorId) ?? 'Sconosciuto'}
                    </span>
                    {msg.isInternal && <span className="text-xs text-amber-600 font-medium">(nota interna)</span>}
                  </div>
                  <span className="text-xs text-gray-400">
                    {format(new Date(msg.createdAt), 'dd/MM HH:mm', { locale: it })}
                  </span>
                </div>
                <p className="text-sm text-gray-800 whitespace-pre-line">{msg.content}</p>
              </div>
            ))}
          </div>

          {/* Reply */}
          <div className="border-t border-gray-100 p-4 space-y-3">
            {/* Canned responses dropdown */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative" ref={cannedDropdownRef}>
                <button
                  onClick={() => setCannedDropdownOpen(!cannedDropdownOpen)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  Risposte predefinite
                  <ChevronDown className="w-3 h-3" />
                </button>
                {cannedDropdownOpen && (
                  <div className="absolute bottom-full left-0 mb-1 w-72 bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-60 overflow-y-auto">
                    {cannedResponses.length === 0 ? (
                      <div className="p-3 text-xs text-gray-400 text-center">Nessuna risposta predefinita</div>
                    ) : (
                      cannedResponses.map((cr) => (
                        <button
                          key={cr.id}
                          onClick={() => handleSelectCanned(cr)}
                          className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                        >
                          <p className="text-sm font-medium text-gray-800">{cr.title}</p>
                          {cr.category && <span className="text-xs text-gray-400">{cr.category}</span>}
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{cr.content}</p>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
              <button
                onClick={() => { setCannedModal(true); setCannedForm(emptyCannedForm); setEditingCannedId(null); }}
                className="flex items-center gap-1 text-xs text-orange-600 hover:text-orange-700 font-medium"
              >
                <Settings className="w-3 h-3" />
                Gestisci risposte
              </button>
            </div>

            <textarea
              rows={3}
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Scrivi una risposta..."
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
            />
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={isInternal}
                  onChange={(e) => setIsInternal(e.target.checked)}
                  className="rounded"
                />
                Nota interna
              </label>
              <button
                onClick={handleReply}
                disabled={replying || !replyContent.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-xl text-sm font-medium hover:bg-orange-700 disabled:bg-orange-300 transition-colors"
              >
                <Send className="w-4 h-4" />
                {replying ? 'Invio...' : 'Invia'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Ticket Modal */}
      <Modal
        open={newModal}
        onClose={() => setNewModal(false)}
        title="Nuovo Ticket"
        size="lg"
        actions={
          <>
            <button onClick={() => setNewModal(false)} className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50">Annulla</button>
            <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm bg-orange-600 text-white rounded-xl font-medium hover:bg-orange-700 disabled:bg-orange-400">
              {saving ? 'Salvataggio...' : 'Crea Ticket'}
            </button>
          </>
        }
      >
        {formError && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{formError}</div>}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Soggetto *</label>
            <input type="text" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descrizione</label>
            <textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priorità</label>
              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as TicketPriority })}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white">
                <option value="low">Bassa</option>
                <option value="medium">Media</option>
                <option value="high">Alta</option>
                <option value="urgent">Urgente</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Classe SLA</label>
              <select value={form.slaClass} onChange={(e) => setForm({ ...form, slaClass: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white">
                <option value="presales">Pre-vendita</option>
                <option value="delivery">Delivery</option>
                <option value="support">Supporto</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
              <input type="text" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                placeholder="Bug, Feature, Domanda..."
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Team Assegnato</label>
              <input type="text" value={form.assignedTeam} onChange={(e) => setForm({ ...form, assignedTeam: e.target.value })}
                placeholder="Dev, Support, Admin..."
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
            </div>
          </div>
        </div>
      </Modal>

      {/* Canned Responses Management Modal */}
      <Modal
        open={cannedModal}
        onClose={() => { setCannedModal(false); setCannedForm(emptyCannedForm); setEditingCannedId(null); }}
        title="Gestisci Risposte Predefinite"
        size="lg"
        actions={
          <button onClick={() => { setCannedModal(false); setCannedForm(emptyCannedForm); setEditingCannedId(null); }}
            className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50">
            Chiudi
          </button>
        }
      >
        <div className="space-y-4">
          {/* Form to add/edit */}
          <div className="p-4 bg-gray-50 rounded-xl space-y-3">
            <p className="text-sm font-medium text-gray-700">
              {editingCannedId ? 'Modifica risposta' : 'Nuova risposta predefinita'}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Titolo *</label>
                <input type="text" value={cannedForm.title} onChange={(e) => setCannedForm({ ...cannedForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Categoria</label>
                <input type="text" value={cannedForm.category} onChange={(e) => setCannedForm({ ...cannedForm, category: e.target.value })}
                  placeholder="es. Saluti, Tecnico..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Contenuto *</label>
              <textarea rows={3} value={cannedForm.content} onChange={(e) => setCannedForm({ ...cannedForm, content: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none" />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={handleSaveCanned} disabled={cannedSaving || !cannedForm.title.trim() || !cannedForm.content.trim()}
                className="px-4 py-2 text-sm bg-orange-600 text-white rounded-xl font-medium hover:bg-orange-700 disabled:bg-orange-400">
                {cannedSaving ? 'Salvataggio...' : editingCannedId ? 'Aggiorna' : 'Aggiungi'}
              </button>
              {editingCannedId && (
                <button onClick={() => { setCannedForm(emptyCannedForm); setEditingCannedId(null); }}
                  className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50">
                  Annulla modifica
                </button>
              )}
            </div>
          </div>

          {/* List of existing canned responses */}
          <div className="space-y-2">
            {cannedResponses.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Nessuna risposta predefinita creata</p>
            ) : (
              cannedResponses.map((cr) => (
                <div key={cr.id} className="flex items-start justify-between p-3 bg-white border border-gray-200 rounded-xl">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-gray-800">{cr.title}</p>
                      {cr.category && (
                        <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{cr.category}</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{cr.content}</p>
                  </div>
                  <div className="flex items-center gap-1 ml-2 shrink-0">
                    <button onClick={() => handleEditCanned(cr)}
                      className="p-1.5 text-gray-400 hover:text-orange-600 rounded-lg hover:bg-gray-50">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDeleteCanned(cr.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-gray-50">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
