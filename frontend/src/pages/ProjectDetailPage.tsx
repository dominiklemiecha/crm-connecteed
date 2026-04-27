import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, RefreshCw, Plus, Flag, FileText,
  Calendar, User, Building2, Target, ShieldAlert, ShieldOff, AlertTriangle,
  Pencil, Trash2, Clock, CalendarCheck, RotateCw
} from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import api from '@/services/api';
import StatusBadge from '@/components/StatusBadge';
import Modal from '@/components/Modal';
import GanttChart, { GanttTask as GanttChartTask } from '@/components/GanttChart';

// ---- Types ----------------------------------------------------------------

interface Project {
  id: string;
  projectNumber: string;
  name: string;
  status: string;
  progressPercent: number;
  startDate?: string;
  endDate?: string;
  createdAt: string;
  company?: { id: string; name: string };
  companyId?: string;
  pmId?: string;
  pmUser?: { id: string; firstName: string; lastName: string };
  description?: string;
  blockedAt?: string;
  blockedBy?: string;
  blockedReason?: string;
}

interface GanttTask {
  id: string;
  name: string;
  assignedTo?: string;
  assignedTeam?: string;
  startDatePlanned?: string;
  endDatePlanned?: string;
  startDateActual?: string;
  endDateActual?: string;
  progressPct: number;
  isMilestone: boolean;
  status?: string;
  dependencyTaskId?: string;
}

interface DelayedTask {
  task: GanttTask;
  delayDays: number;
}

interface RescheduleAffectedTask {
  taskId: string;
  taskName: string;
  oldStart: string | null;
  oldEnd: string | null;
  newStart: string | null;
  newEnd: string | null;
}

interface RescheduleProposal {
  sourceTaskId: string;
  shiftDays: number;
  affectedTasks: RescheduleAffectedTask[];
}

interface ProjectFile {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  status: string;
  createdAt: string;
  uploadedBy?: { firstName: string; lastName: string };
}

interface UserOption { id: string; firstName: string; lastName: string; role: string; }
interface DeptOption { id: string; name: string; }

// ---- Helpers ---------------------------------------------------------------

function fmtDate(d?: string) {
  if (!d) return '—';
  try { return format(new Date(d), 'dd/MM/yyyy', { locale: it }); } catch { return '—'; }
}

function fmtBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function toInputDate(d?: string) {
  if (!d) return '';
  try { return new Date(d).toISOString().split('T')[0]; } catch { return ''; }
}

const inputClass = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
const selectClass = `${inputClass} bg-white`;

// ---- Shared hooks ----------------------------------------------------------

function useUsersAndDepts(shouldLoad: boolean) {
  const [users, setUsers] = useState<UserOption[]>([]);
  const [departments, setDepartments] = useState<DeptOption[]>([]);
  useEffect(() => {
    if (!shouldLoad) return;
    api.get('/users', { params: { limit: 100 } }).then(({ data }) => {
      setUsers(Array.isArray(data) ? data : (data.data ?? []));
    }).catch(() => {});
    api.get('/departments', { params: { limit: 100 } }).then(({ data }) => {
      setDepartments(Array.isArray(data) ? data : (data.data ?? []));
    }).catch(() => {});
  }, [shouldLoad]);
  return { users, departments };
}

// ---- Edit Project Modal ----------------------------------------------------

function EditProjectModal({
  open, onClose, onSaved, project, users,
}: {
  open: boolean; onClose: () => void; onSaved: () => void;
  project: Project; users: UserOption[];
}) {
  const [form, setForm] = useState({
    name: '', description: '', pmId: '', status: '', startDate: '', endDate: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open && project) {
      setForm({
        name: project.name || '',
        description: project.description || '',
        pmId: project.pmId || '',
        status: project.status || '',
        startDate: toInputDate(project.startDate),
        endDate: toInputDate(project.endDate),
      });
      setError('');
    }
  }, [open, project]);

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError('Il nome è obbligatorio.'); return; }
    setSaving(true); setError('');
    try {
      await api.put(`/projects/${project.id}`, {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        pmId: form.pmId || null,
        status: form.status,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
      });
      onSaved();
      onClose();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(typeof msg === 'string' ? msg : 'Errore durante il salvataggio.');
    }
    setSaving(false);
  };

  const statuses = [
    { value: 'pending_payment', label: 'In attesa pagamento' },
    { value: 'ready', label: 'Pronto' },
    { value: 'in_progress', label: 'In lavorazione' },
    { value: 'delivered', label: 'Consegnato' },
    { value: 'closed', label: 'Chiuso' },
  ];

  return (
    <Modal open={open} onClose={onClose} title="Modifica Progetto" actions={
      <>
        <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Annulla</button>
        <button onClick={handleSubmit} disabled={saving}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
          {saving ? 'Salvataggio...' : 'Salva'}
        </button>
      </>
    }>
      <div className="space-y-4">
        {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nome progetto *</label>
          <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Descrizione</label>
          <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            rows={3} className={inputClass} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Project Manager</label>
            <select value={form.pmId} onChange={(e) => setForm((f) => ({ ...f, pmId: e.target.value }))} className={selectClass}>
              <option value="">— Nessuno —</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Stato</label>
            <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} className={selectClass}>
              {statuses.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data inizio</label>
            <input type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
              className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data fine</label>
            <input type="date" value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
              className={inputClass} />
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ---- Task Modal (New + Edit) -----------------------------------------------

function TaskModal({
  open, onClose, onSaved, projectId, task, users, departments,
}: {
  open: boolean; onClose: () => void; onSaved: () => void;
  projectId: string; task: GanttTask | null;
  users: UserOption[]; departments: DeptOption[];
}) {
  const isEdit = !!task;
  const [form, setForm] = useState({
    name: '', assignedTo: '', assignedTeam: '', startDatePlanned: '', endDatePlanned: '', isMilestone: false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      if (task) {
        setForm({
          name: task.name || '',
          assignedTo: task.assignedTo || '',
          assignedTeam: task.assignedTeam || '',
          startDatePlanned: toInputDate(task.startDatePlanned),
          endDatePlanned: toInputDate(task.endDatePlanned),
          isMilestone: task.isMilestone,
        });
      } else {
        setForm({ name: '', assignedTo: '', assignedTeam: '', startDatePlanned: '', endDatePlanned: '', isMilestone: false });
      }
      setError('');
    }
  }, [open, task]);

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError('Il nome del task è obbligatorio.'); return; }
    setSaving(true); setError('');
    const payload = {
      name: form.name.trim(),
      assignedTo: form.assignedTo || null,
      assignedTeam: form.assignedTeam || null,
      startDatePlanned: form.startDatePlanned || null,
      endDatePlanned: form.endDatePlanned || null,
      isMilestone: form.isMilestone,
    };
    try {
      if (isEdit) {
        await api.put(`/projects/gantt/${task.id}`, payload);
      } else {
        await api.post(`/projects/${projectId}/gantt`, payload);
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
    <Modal open={open} onClose={onClose} title={isEdit ? 'Modifica Task' : 'Nuovo Task'} actions={
      <>
        <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Annulla</button>
        <button onClick={handleSubmit} disabled={saving}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
          {saving ? 'Salvataggio...' : isEdit ? 'Salva Modifiche' : 'Crea Task'}
        </button>
      </>
    }>
      <div className="space-y-4">
        {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
          <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Nome del task..." className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Assegnato a</label>
          <select value={form.assignedTo} onChange={(e) => setForm((f) => ({ ...f, assignedTo: e.target.value }))} className={selectClass}>
            <option value="">— Nessuno —</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.firstName} {u.lastName} ({u.role})</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Reparto</label>
          <select value={form.assignedTeam} onChange={(e) => setForm((f) => ({ ...f, assignedTeam: e.target.value }))} className={selectClass}>
            <option value="">— Nessun reparto —</option>
            {departments.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data inizio</label>
            <input type="date" value={form.startDatePlanned} onChange={(e) => setForm((f) => ({ ...f, startDatePlanned: e.target.value }))}
              className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data fine</label>
            <input type="date" value={form.endDatePlanned} onChange={(e) => setForm((f) => ({ ...f, endDatePlanned: e.target.value }))}
              className={inputClass} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input type="checkbox" id="taskMilestone" checked={form.isMilestone}
            onChange={(e) => setForm((f) => ({ ...f, isMilestone: e.target.checked }))}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
          <label htmlFor="taskMilestone" className="text-sm text-gray-700 flex items-center gap-1">
            <Flag className="w-4 h-4 text-amber-500" /> Milestone
          </label>
        </div>
      </div>
    </Modal>
  );
}

// ---- Task Row --------------------------------------------------------------

function TaskRow({
  task, onProgressChange, onEdit, onDelete, users,
}: {
  task: GanttTask;
  onProgressChange: (taskId: string, pct: number) => void;
  onEdit: (task: GanttTask) => void;
  onDelete: (taskId: string) => void;
  users: UserOption[];
}) {
  const [localPct, setLocalPct] = useState(task.progressPct);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setLocalPct(task.progressPct); }, [task.progressPct]);

  const handleBlur = async () => {
    if (localPct === task.progressPct) return;
    setSaving(true);
    try {
      await api.put(`/projects/gantt/${task.id}/progress`, { progressPct: localPct });
      onProgressChange(task.id, localPct);
    } catch { setLocalPct(task.progressPct); }
    setSaving(false);
  };

  const assignedUser = task.assignedTo ? users.find((u) => u.id === task.assignedTo) : null;

  return (
    <tr className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
      <td className="px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          {task.isMilestone && <span title="Milestone"><Flag className="w-4 h-4 text-amber-500 flex-shrink-0" /></span>}
          <span className="font-medium text-gray-800">{task.name}</span>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-gray-500">
        {assignedUser ? `${assignedUser.firstName} ${assignedUser.lastName}` : '—'}
      </td>
      <td className="px-4 py-3 text-sm text-gray-500">{task.assignedTeam || '—'}</td>
      <td className="px-4 py-3 text-sm text-gray-500">{fmtDate(task.startDatePlanned)}</td>
      <td className="px-4 py-3 text-sm text-gray-500">{fmtDate(task.endDatePlanned)}</td>
      <td className="px-4 py-3 w-44">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="range" min={0} max={100} value={localPct}
            onChange={(e) => setLocalPct(Number(e.target.value))}
            onMouseUp={handleBlur}
            onTouchEnd={handleBlur}
            className="flex-1 h-2 accent-blue-600"
            disabled={saving}
          />
          <input
            type="number" min={0} max={100} value={localPct}
            onChange={(e) => setLocalPct(Math.min(100, Math.max(0, Number(e.target.value))))}
            onBlur={handleBlur}
            className="w-14 border border-gray-200 rounded px-2 py-1 text-sm text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
            disabled={saving}
          />
          <span className="text-xs text-gray-400">%</span>
        </div>
      </td>
      <td className="px-4 py-3">
        {task.status ? <StatusBadge status={task.status} /> : <span className="text-gray-400 text-xs">—</span>}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          <button onClick={() => onEdit(task)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg" title="Modifica">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onDelete(task.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Elimina">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ---- Tabs -----------------------------------------------------------------

type Tab = 'overview' | 'tasks' | 'documents';

// ---- Main Page -------------------------------------------------------------

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<GanttTask[]>([]);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [loadingProject, setLoadingProject] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  // Delays & Reschedule
  const [delays, setDelays] = useState<DelayedTask[]>([]);
  const [loadingDelays, setLoadingDelays] = useState(false);
  const [rescheduleProposal, setRescheduleProposal] = useState<RescheduleProposal | null>(null);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [applyingReschedule, setApplyingReschedule] = useState(false);
  const [settingBaseline, setSettingBaseline] = useState(false);
  const [showBaseline, setShowBaseline] = useState(false);

  // Modals
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<GanttTask | null>(null);
  const [showEditProject, setShowEditProject] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const [blocking, setBlocking] = useState(false);

  // Current user role
  const currentUser = (() => {
    try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; }
  })();
  const canBlock = ['ceo', 'commerciale', 'admin'].includes(currentUser.role);

  // Shared data for modals
  const { users, departments } = useUsersAndDepts(showTaskModal || showEditProject);

  const fetchProject = useCallback(async () => {
    if (!id) return;
    setLoadingProject(true);
    try {
      const { data } = await api.get(`/projects/${id}`);
      setProject(data);
    } catch { setProject(null); }
    setLoadingProject(false);
  }, [id]);

  const fetchTasks = useCallback(async () => {
    if (!id) return;
    setLoadingTasks(true);
    try {
      const { data } = await api.get(`/projects/${id}/gantt`);
      setTasks(data.data ?? data);
    } catch { setTasks([]); }
    setLoadingTasks(false);
  }, [id]);

  const fetchFiles = useCallback(async () => {
    if (!id) return;
    setLoadingFiles(true);
    try {
      const { data } = await api.get('/files/by-entity', { params: { entityType: 'project', entityId: id } });
      setFiles(data.data ?? data);
    } catch { setFiles([]); }
    setLoadingFiles(false);
  }, [id]);

  const fetchDelays = useCallback(async () => {
    if (!id) return;
    setLoadingDelays(true);
    try {
      const { data } = await api.get(`/projects/${id}/delays`);
      setDelays(Array.isArray(data) ? data : (data.data ?? []));
    } catch { setDelays([]); }
    setLoadingDelays(false);
  }, [id]);

  const handleProposeReschedule = async (taskId: string) => {
    try {
      const { data } = await api.post(`/projects/${id}/gantt/propose-reschedule/${taskId}`);
      setRescheduleProposal(data);
      setShowRescheduleModal(true);
    } catch { /* ignore */ }
  };

  const handleApplyReschedule = async () => {
    if (!rescheduleProposal) return;
    setApplyingReschedule(true);
    try {
      await api.post(`/projects/${id}/gantt/apply-reschedule`, rescheduleProposal);
      setShowRescheduleModal(false);
      setRescheduleProposal(null);
      fetchTasks();
      fetchDelays();
    } catch { /* ignore */ }
    setApplyingReschedule(false);
  };

  const handleSetBaseline = async () => {
    setSettingBaseline(true);
    try {
      await api.post(`/projects/${id}/gantt/set-baseline`);
      fetchTasks();
    } catch { /* ignore */ }
    setSettingBaseline(false);
  };

  // Also load users for task table display
  const [allUsers, setAllUsers] = useState<UserOption[]>([]);
  useEffect(() => {
    api.get('/users', { params: { limit: 100 } }).then(({ data }) => {
      setAllUsers(Array.isArray(data) ? data : (data.data ?? []));
    }).catch(() => {});
  }, []);

  useEffect(() => { fetchProject(); }, [fetchProject]);

  useEffect(() => {
    if (activeTab === 'tasks') { fetchTasks(); fetchDelays(); }
    if (activeTab === 'documents') fetchFiles();
  }, [activeTab]);

  const handleProgressChange = (taskId: string, pct: number) => {
    setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, progressPct: pct } : t));
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await api.delete(`/projects/gantt/${taskId}`);
      fetchTasks();
    } catch { /* ignore */ }
  };

  const handleBlock = async () => {
    if (!blockReason.trim()) return;
    setBlocking(true);
    try {
      await api.put(`/projects/${id}/block`, { reason: blockReason.trim() });
      setShowBlockModal(false);
      setBlockReason('');
      fetchProject();
    } catch { /* ignore */ }
    setBlocking(false);
  };

  const handleUnblock = async () => {
    setBlocking(true);
    try {
      await api.put(`/projects/${id}/unblock`);
      fetchProject();
    } catch { /* ignore */ }
    setBlocking(false);
  };

  if (loadingProject) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="h-4 bg-gray-200 rounded w-32" />
          <div className="h-64 bg-gray-200 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto text-center py-20">
        <p className="text-gray-500">Progetto non trovato.</p>
        <button onClick={() => navigate('/projects')} className="mt-4 text-blue-600 hover:underline text-sm">
          ← Torna ai progetti
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Back + Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/projects')}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-4 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          Tutti i progetti
        </button>

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-gray-400 font-mono">{project.projectNumber}</p>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mt-1 break-words">{project.name}</h1>
            {project.company && (
              <p className="text-sm text-gray-500 mt-1 flex items-center gap-1 truncate">
                <Building2 className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{project.company.name}</span>
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={project.status} />
            <button
              onClick={() => setShowEditProject(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
            >
              <Pencil className="w-3.5 h-3.5" /> Modifica
            </button>
            {canBlock && project.status !== 'blocked' && project.status !== 'closed' && (
              <button
                onClick={() => setShowBlockModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
                disabled={blocking}
              >
                <ShieldAlert className="w-4 h-4" /> Blocca
              </button>
            )}
            {canBlock && project.status === 'blocked' && (
              <button
                onClick={handleUnblock}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                disabled={blocking}
              >
                <ShieldOff className="w-4 h-4" /> Sblocca
              </button>
            )}
            <button
              onClick={() => { fetchProject(); if (activeTab === 'tasks') fetchTasks(); if (activeTab === 'documents') fetchFiles(); }}
              className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
              title="Aggiorna"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4 max-w-sm">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Avanzamento globale</span>
            <span className="font-medium">{project.progressPercent || 0}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2.5">
            <div
              className="bg-blue-500 h-2.5 rounded-full transition-all"
              style={{ width: `${project.progressPercent || 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* Block Alert Banner */}
      {project.status === 'blocked' && (
        <div className="mb-6 bg-red-50 border-2 border-red-300 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-red-800 text-base">PROGETTO BLOCCATO — Fermare tutte le attività</h3>
            {project.blockedReason && (
              <p className="text-sm text-red-700 mt-1"><strong>Motivo:</strong> {project.blockedReason}</p>
            )}
            {project.blockedAt && (
              <p className="text-xs text-red-500 mt-1">Bloccato il {fmtDate(project.blockedAt)}</p>
            )}
          </div>
        </div>
      )}

      {/* Block Reason Modal */}
      <Modal
        open={showBlockModal}
        onClose={() => { setShowBlockModal(false); setBlockReason(''); }}
        title="Blocca Progetto"
        actions={
          <>
            <button onClick={() => { setShowBlockModal(false); setBlockReason(''); }} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Annulla</button>
            <button onClick={handleBlock} disabled={blocking || !blockReason.trim()}
              className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium">
              {blocking ? 'Blocco in corso...' : 'Conferma Blocco'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">
              Tutti i membri del team assegnati a questo progetto riceveranno una notifica di <strong>fermare immediatamente le attività</strong>.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Motivo del blocco *</label>
            <textarea
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
              placeholder="Inserisci il motivo del blocco..."
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
        </div>
      </Modal>

      {/* Edit Project Modal */}
      {project && (
        <EditProjectModal
          open={showEditProject}
          onClose={() => setShowEditProject(false)}
          onSaved={fetchProject}
          project={project}
          users={users}
        />
      )}

      {/* Task Modal (New + Edit) */}
      <TaskModal
        open={showTaskModal}
        onClose={() => { setShowTaskModal(false); setEditingTask(null); }}
        onSaved={() => { fetchTasks(); fetchProject(); }}
        projectId={id!}
        task={editingTask}
        users={users}
        departments={departments}
      />

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-4 sm:mb-6 -mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto scrollbar-hide">
        <nav className="flex gap-1 min-w-max">
          {(['overview', 'tasks', 'documents'] as Tab[]).map((tab) => {
            const labels: Record<Tab, string> = { overview: 'Overview', tasks: 'Task / Gantt', documents: 'Documenti' };
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  activeTab === tab
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                {labels[tab]}
              </button>
            );
          })}
        </nav>
      </div>

      {/* ---- OVERVIEW TAB ---- */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Informazioni Progetto</h2>
            <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
              <div>
                <p className="text-xs text-gray-400 flex items-center gap-1"><Target className="w-3.5 h-3.5" /> Stato</p>
                <div className="mt-0.5"><StatusBadge status={project.status} /></div>
              </div>
              {project.pmUser && (
                <div>
                  <p className="text-xs text-gray-400 flex items-center gap-1"><User className="w-3.5 h-3.5" /> Project Manager</p>
                  <p className="text-gray-700 mt-0.5">{project.pmUser.firstName} {project.pmUser.lastName}</p>
                </div>
              )}
              {project.startDate && (
                <div>
                  <p className="text-xs text-gray-400 flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Data inizio</p>
                  <p className="text-gray-700 mt-0.5">{fmtDate(project.startDate)}</p>
                </div>
              )}
              {project.endDate && (
                <div>
                  <p className="text-xs text-gray-400 flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Data fine</p>
                  <p className="text-gray-700 mt-0.5">{fmtDate(project.endDate)}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-400">Creato il</p>
                <p className="text-gray-700 mt-0.5">{fmtDate(project.createdAt)}</p>
              </div>
            </div>
            {project.description && (
              <div className="pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-400 mb-1">Descrizione</p>
                <p className="text-sm text-gray-700 leading-relaxed">{project.description}</p>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Avanzamento</h2>
            <div className="flex items-center justify-center h-32">
              <div className="text-center">
                <p className="text-5xl font-bold text-blue-600">{project.progressPercent || 0}%</p>
                <p className="text-sm text-gray-500 mt-2">completato</p>
              </div>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3 mt-4">
              <div
                className="bg-blue-500 h-3 rounded-full transition-all"
                style={{ width: `${project.progressPercent || 0}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ---- Reschedule Proposal Modal ---- */}
      <Modal
        open={showRescheduleModal}
        onClose={() => { setShowRescheduleModal(false); setRescheduleProposal(null); }}
        title="Proposta di Ripianificazione"
        actions={
          <>
            <button onClick={() => { setShowRescheduleModal(false); setRescheduleProposal(null); }} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Annulla</button>
            <button onClick={handleApplyReschedule} disabled={applyingReschedule}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium">
              {applyingReschedule ? 'Applicazione...' : 'Applica Ripianificazione'}
            </button>
          </>
        }
      >
        {rescheduleProposal && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                <strong>Spostamento:</strong> {rescheduleProposal.shiftDays} giorni in avanti per {rescheduleProposal.affectedTasks.length} task dipendenti.
              </p>
            </div>
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">Task</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">Inizio attuale</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">Nuovo inizio</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">Fine attuale</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">Nuova fine</th>
                  </tr>
                </thead>
                <tbody>
                  {rescheduleProposal.affectedTasks.map((at) => (
                    <tr key={at.taskId} className="border-t border-gray-100">
                      <td className="px-3 py-2 font-medium text-gray-800">{at.taskName}</td>
                      <td className="px-3 py-2 text-gray-500">{at.oldStart ? fmtDate(at.oldStart) : '—'}</td>
                      <td className="px-3 py-2 text-blue-600 font-medium">{at.newStart ? fmtDate(at.newStart) : '—'}</td>
                      <td className="px-3 py-2 text-gray-500">{at.oldEnd ? fmtDate(at.oldEnd) : '—'}</td>
                      <td className="px-3 py-2 text-blue-600 font-medium">{at.newEnd ? fmtDate(at.newEnd) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>

      {/* ---- TASKS TAB ---- */}
      {activeTab === 'tasks' && (
        <div>
          {/* Delay Alerts */}
          {!loadingDelays && delays.length > 0 && (
            <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-5 h-5 text-amber-600" />
                <h3 className="font-semibold text-amber-800 text-sm">Task in ritardo ({delays.length})</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {delays.map((d) => (
                  <div key={d.task.id} className="flex items-center gap-2 bg-white border border-amber-200 rounded-lg px-3 py-2">
                    <span className="text-sm text-gray-800 font-medium">{d.task.name}</span>
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">
                      {d.delayDays}g in ritardo
                    </span>
                    <button
                      onClick={() => handleProposeReschedule(d.task.id)}
                      className="text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-0.5 rounded font-medium flex items-center gap-1"
                      title="Proponi ripianificazione"
                    >
                      <RotateCw className="w-3 h-3" /> Ripianifica
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Task e Gantt</h2>
            <div className="flex flex-wrap items-center gap-2">
              {tasks.length > 0 && (
                <>
                  <button
                    onClick={() => setShowBaseline((v) => !v)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded-lg font-medium transition-colors ${
                      showBaseline
                        ? 'border-blue-300 bg-blue-50 text-blue-700'
                        : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <CalendarCheck className="w-3.5 h-3.5" /> Baseline
                  </button>
                  <button
                    onClick={handleSetBaseline}
                    disabled={settingBaseline}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 font-medium disabled:opacity-50"
                    title="Salva le date attuali come baseline"
                  >
                    <CalendarCheck className="w-3.5 h-3.5" /> {settingBaseline ? 'Salvataggio...' : 'Imposta Baseline'}
                  </button>
                </>
              )}
              <button
                onClick={() => { setEditingTask(null); setShowTaskModal(true); }}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                <Plus className="w-4 h-4" /> Nuovo Task
              </button>
            </div>
          </div>

          {!loadingTasks && tasks.length > 0 && (
            <GanttChart
              tasks={tasks.map((t): GanttChartTask => ({
                id: t.id,
                name: t.name,
                startDate: t.startDateActual || t.startDatePlanned,
                endDate: t.endDateActual || t.endDatePlanned,
                startDatePlanned: t.startDatePlanned,
                endDatePlanned: t.endDatePlanned,
                progressPct: t.progressPct,
                isMilestone: t.isMilestone,
                assignedTeam: t.assignedTeam,
                status: t.status,
              }))}
              projectStart={project?.startDate ?? new Date().toISOString()}
              projectEnd={project?.endDate ?? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()}
              showBaseline={showBaseline}
            />
          )}

          {loadingTasks ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
              Caricamento task...
            </div>
          ) : tasks.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <Target className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Nessun task creato.</p>
              <p className="text-xs text-gray-400 mt-1">Clicca "Nuovo Task" per aggiungere il primo task.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Nome</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Assegnato a</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Team</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Inizio</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Fine</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Progresso</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Stato</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600 w-20">Azioni</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.map((task) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        onProgressChange={handleProgressChange}
                        onEdit={(t) => { setEditingTask(t); setShowTaskModal(true); }}
                        onDelete={handleDeleteTask}
                        users={allUsers}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ---- DOCUMENTS TAB ---- */}
      {activeTab === 'documents' && (
        <div>
          <h2 className="font-semibold text-gray-900 mb-4">Documenti progetto</h2>

          {loadingFiles ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
              Caricamento documenti...
            </div>
          ) : files.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Nessun documento caricato per questo progetto.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Nome file</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Tipo</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Dimensione</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Stato</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Caricato da</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {files.map((f) => (
                    <tr key={f.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        {f.originalName ?? f.filename}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{f.mimeType}</td>
                      <td className="px-4 py-3 text-gray-500">{fmtBytes(f.sizeBytes)}</td>
                      <td className="px-4 py-3"><StatusBadge status={f.status} /></td>
                      <td className="px-4 py-3 text-gray-500">
                        {f.uploadedBy ? `${f.uploadedBy.firstName} ${f.uploadedBy.lastName}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{fmtDate(f.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
