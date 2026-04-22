import { useState, useEffect, useCallback } from 'react';
import { Plus, Clock, Pencil, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import Modal from '../components/Modal';
import DataTable, { Column } from '../components/DataTable';
import api from '../services/api';

type TabId = 'mieore' | 'perprogetto' | 'riepilogo';

interface Project {
  id: string;
  name: string;
}

interface Task {
  id: string;
  title: string;
}

interface TimeEntry {
  id: string;
  date: string;
  projectId: string;
  project?: { id: string; name: string };
  taskId?: string;
  task?: { id: string; title: string };
  hours: number;
  description?: string;
  billable: boolean;
  userId: string;
  user?: { id: string; firstName: string; lastName: string };
}

interface TimeEntryForm {
  projectId: string;
  taskId: string;
  date: string;
  hours: string;
  description: string;
  billable: boolean;
}

interface ProjectSummary {
  totalHours: number;
  estimatedHours: number;
  variance: number;
  entries: TimeEntry[];
}

interface UserSummary {
  id?: string;
  userId: string;
  firstName: string;
  lastName: string;
  totalHours: number;
}

const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
const today = new Date().toISOString().split('T')[0];
const monthStart = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`;

const emptyForm: TimeEntryForm = {
  projectId: '',
  taskId: '',
  date: today,
  hours: '',
  description: '',
  billable: true,
};

export default function TimeTrackingPage() {
  const [activeTab, setActiveTab] = useState<TabId>('mieore');
  const [dateFrom, setDateFrom] = useState(monthStart);
  const [dateTo, setDateTo] = useState(today);

  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  // Le mie ore
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [entriesTotal, setEntriesTotal] = useState(0);
  const [entriesPage, setEntriesPage] = useState(1);

  // Modale aggiungi/modifica
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<TimeEntryForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Per progetto
  const [selectedProject, setSelectedProject] = useState('');
  const [projectSummary, setProjectSummary] = useState<ProjectSummary | null>(null);
  const [projectSummaryLoading, setProjectSummaryLoading] = useState(false);

  // Riepilogo
  const [userSummaries, setUserSummaries] = useState<UserSummary[]>([]);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const PAGE_SIZE = 20;

  // Load projects
  useEffect(() => {
    api.get('/projects', { params: { limit: 200 } }).then(({ data }) => {
      const list = Array.isArray(data) ? data : (data.data ?? []);
      setProjects(list);
    }).catch(() => {});
  }, []);

  // Load tasks when project changes in form
  useEffect(() => {
    if (!form.projectId) { setTasks([]); return; }
    api.get(`/projects/${form.projectId}/tasks`, { params: { limit: 200 } })
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : (data.data ?? []);
        setTasks(list);
      })
      .catch(() => setTasks([]));
  }, [form.projectId]);

  // Fetch my entries
  const fetchEntries = useCallback(async () => {
    setEntriesLoading(true);
    try {
      const { data } = await api.get('/time-entries', {
        params: { page: entriesPage, limit: PAGE_SIZE, from: dateFrom, to: dateTo },
      });
      const list = Array.isArray(data) ? data : (data.data ?? []);
      setEntries(list);
      setEntriesTotal(data.total ?? list.length);
    } catch {
      setEntries([]);
    } finally {
      setEntriesLoading(false);
    }
  }, [entriesPage, dateFrom, dateTo]);

  useEffect(() => {
    if (activeTab === 'mieore') fetchEntries();
  }, [activeTab, fetchEntries]);

  // Fetch project summary
  useEffect(() => {
    if (activeTab !== 'perprogetto' || !selectedProject) return;
    setProjectSummaryLoading(true);
    api.get(`/time-entries/project/${selectedProject}/summary`, { params: { from: dateFrom, to: dateTo } })
      .then(({ data }) => setProjectSummary(data))
      .catch(() => setProjectSummary(null))
      .finally(() => setProjectSummaryLoading(false));
  }, [activeTab, selectedProject, dateFrom, dateTo]);

  // Fetch user summaries
  useEffect(() => {
    if (activeTab !== 'riepilogo') return;
    setSummaryLoading(true);
    api.get('/time-entries', { params: { from: dateFrom, to: dateTo, limit: 1000 } })
      .then(({ data }) => {
        const list: TimeEntry[] = Array.isArray(data) ? data : (data.data ?? []);
        const map: Record<string, UserSummary> = {};
        list.forEach((e) => {
          const uid = e.userId;
          if (!map[uid]) {
            map[uid] = {
              id: uid,
              userId: uid,
              firstName: e.user?.firstName ?? '',
              lastName: e.user?.lastName ?? '',
              totalHours: 0,
            };
          }
          map[uid].totalHours += e.hours;
        });
        setUserSummaries(Object.values(map));
      })
      .catch(() => setUserSummaries([]))
      .finally(() => setSummaryLoading(false));
  }, [activeTab, dateFrom, dateTo]);

  const openNew = () => {
    setEditId(null);
    setForm(emptyForm);
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (e: TimeEntry, ev: React.MouseEvent) => {
    ev.stopPropagation();
    setEditId(e.id);
    setForm({
      projectId: e.project?.id ?? e.projectId ?? '',
      taskId: e.task?.id ?? e.taskId ?? '',
      date: e.date?.split('T')[0] ?? today,
      hours: String(e.hours),
      description: e.description ?? '',
      billable: e.billable,
    });
    setFormError('');
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.projectId || !form.date || !form.hours) {
      setFormError('Progetto, data e ore sono obbligatori.');
      return;
    }
    const h = parseFloat(form.hours);
    if (isNaN(h) || h <= 0 || h > 24) {
      setFormError('Le ore devono essere un numero tra 0.1 e 24.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const payload = {
        projectId: form.projectId,
        taskId: form.taskId || undefined,
        date: form.date,
        hours: h,
        description: form.description || undefined,
        billable: form.billable,
      };
      if (editId) {
        await api.put(`/time-entries/${editId}`, payload);
      } else {
        await api.post('/time-entries', payload);
      }
      setModalOpen(false);
      fetchEntries();
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
      await api.delete(`/time-entries/${deleteId}`);
      setDeleteId(null);
      fetchEntries();
    } catch {
      // ignore
    } finally {
      setDeleting(false);
    }
  };

  const columns: Column<TimeEntry>[] = [
    {
      key: 'date', label: 'Data', sortable: true,
      render: (v) => {
        try { return format(new Date(String(v)), 'dd MMM yyyy', { locale: it }); } catch { return String(v ?? ''); }
      },
    },
    {
      key: 'project', label: 'Progetto',
      render: (v, row) => <span className="font-medium text-gray-800">{(v as Project)?.name ?? (row.projectId ? '...' : '—')}</span>,
    },
    {
      key: 'task', label: 'Task',
      render: (v) => <span className="text-gray-600">{(v as Task)?.title ?? '—'}</span>,
    },
    {
      key: 'hours', label: 'Ore', sortable: true,
      render: (v) => (
        <span className="flex items-center gap-1 font-semibold text-blue-700">
          <Clock className="w-3.5 h-3.5" />{String(v ?? 0)}h
        </span>
      ),
    },
    { key: 'description', label: 'Descrizione', render: (v) => <span className="text-gray-500 text-sm">{String(v ?? '—')}</span> },
    {
      key: 'billable', label: 'Fatturabile',
      render: (v) => (
        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${v ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
          {v ? 'Si' : 'No'}
        </span>
      ),
    },
    {
      key: 'actions', label: '',
      render: (_, row) => (
        <div className="flex items-center gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
          <button onClick={(e) => openEdit(row, e)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
            <Pencil className="w-4 h-4" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); setDeleteId(row.id); }} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  const summaryColumns: Column<UserSummary>[] = [
    {
      key: 'firstName', label: 'Utente', sortable: true,
      render: (_, row) => <span className="font-medium text-gray-900">{row.firstName} {row.lastName}</span>,
    },
    {
      key: 'totalHours', label: 'Ore Totali', sortable: true,
      render: (v) => (
        <span className="flex items-center gap-1 font-semibold text-blue-700">
          <Clock className="w-3.5 h-3.5" />{String(v ?? 0)}h
        </span>
      ),
    },
  ];

  const TABS: { id: TabId; label: string }[] = [
    { id: 'mieore', label: 'Le mie ore' },
    { id: 'perprogetto', label: 'Per progetto' },
    { id: 'riepilogo', label: 'Riepilogo' },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ore Lavorate</h1>
          <p className="text-sm text-gray-500 mt-1">Tracciamento del tempo per progetto</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Dal</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Al</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Le mie ore */}
      {activeTab === 'mieore' && (
        <DataTable
          columns={columns}
          data={entries}
          loading={entriesLoading}
          total={entriesTotal}
          page={entriesPage}
          pageSize={PAGE_SIZE}
          onPageChange={setEntriesPage}
          emptyText="Nessuna registrazione ore trovata"
          actions={
            <button
              onClick={openNew}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Aggiungi Ore
            </button>
          }
        />
      )}

      {/* Per progetto */}
      {activeTab === 'perprogetto' && (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">Seleziona Progetto:</label>
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[250px]"
            >
              <option value="">— Seleziona un progetto —</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          {selectedProject && projectSummaryLoading && (
            <div className="text-center py-16 text-gray-400 animate-pulse">Caricamento...</div>
          )}

          {selectedProject && !projectSummaryLoading && projectSummary && (
            <>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
                  <p className="text-sm font-medium text-blue-700 opacity-80">Ore Registrate</p>
                  <p className="text-3xl font-bold text-blue-700 mt-1">{projectSummary.totalHours}h</p>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5">
                  <p className="text-sm font-medium text-emerald-700 opacity-80">Ore Stimate</p>
                  <p className="text-3xl font-bold text-emerald-700 mt-1">{projectSummary.estimatedHours}h</p>
                </div>
                <div className={`border rounded-xl p-5 ${projectSummary.variance >= 0 ? 'bg-orange-50 border-orange-200' : 'bg-green-50 border-green-200'}`}>
                  <p className={`text-sm font-medium opacity-80 ${projectSummary.variance >= 0 ? 'text-orange-700' : 'text-green-700'}`}>Varianza</p>
                  <p className={`text-3xl font-bold mt-1 ${projectSummary.variance >= 0 ? 'text-orange-700' : 'text-green-700'}`}>
                    {projectSummary.variance >= 0 ? '+' : ''}{projectSummary.variance}h
                  </p>
                </div>
              </div>

              <DataTable
                columns={columns.filter((c) => c.key !== 'actions')}
                data={projectSummary.entries ?? []}
                emptyText="Nessuna ora registrata per questo progetto"
              />
            </>
          )}

          {selectedProject && !projectSummaryLoading && !projectSummary && (
            <div className="text-center py-16 text-gray-400">Nessun dato disponibile per questo progetto.</div>
          )}

          {!selectedProject && (
            <div className="text-center py-16 text-gray-400">Seleziona un progetto per vedere il riepilogo.</div>
          )}
        </div>
      )}

      {/* Riepilogo */}
      {activeTab === 'riepilogo' && (
        <DataTable
          columns={summaryColumns}
          data={userSummaries}
          loading={summaryLoading}
          total={userSummaries.length}
          emptyText="Nessuna ora registrata nel periodo"
        />
      )}

      {/* Add/Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editId ? 'Modifica Ore' : 'Aggiungi Ore'}
        size="md"
        actions={
          <>
            <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">Annulla</button>
            <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-blue-400 font-medium">
              {saving ? 'Salvataggio...' : editId ? 'Aggiorna' : 'Salva Ore'}
            </button>
          </>
        }
      >
        {formError && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{formError}</div>}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Progetto *</label>
            <select value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value, taskId: '' })} className={inputCls}>
              <option value="">— Seleziona progetto —</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Task</label>
            <select value={form.taskId} onChange={(e) => setForm({ ...form, taskId: e.target.value })} className={inputCls} disabled={!form.projectId}>
              <option value="">— Nessuna task —</option>
              {tasks.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data *</label>
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ore *</label>
              <input
                type="number"
                min="0.1"
                max="24"
                step="0.25"
                value={form.hours}
                onChange={(e) => setForm({ ...form, hours: e.target.value })}
                placeholder="es. 2.5"
                className={inputCls}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descrizione</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Cosa hai fatto?"
              className={`${inputCls} resize-none`}
            />
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.billable}
              onChange={(e) => setForm({ ...form, billable: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <span className="text-sm text-gray-700">Ore fatturabili</span>
          </label>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <Modal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Elimina Registrazione"
        size="sm"
        actions={
          <>
            <button onClick={() => setDeleteId(null)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">Annulla</button>
            <button onClick={handleDelete} disabled={deleting} className="px-4 py-2 text-sm bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:bg-red-400 font-medium">
              {deleting ? 'Eliminazione...' : 'Elimina'}
            </button>
          </>
        }
      >
        <p className="text-gray-600 text-sm">Sei sicuro di voler eliminare questa registrazione ore?</p>
      </Modal>
    </div>
  );
}
