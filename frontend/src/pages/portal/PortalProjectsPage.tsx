import { useState, useEffect, useMemo } from 'react';
import { FolderOpen, ArrowLeft, CheckCircle, AlertCircle, Clock, Star, Calendar, Flag, ChevronLeft, ChevronRight, ThumbsUp } from 'lucide-react';
import StatusBadge from '../../components/StatusBadge';
import api from '../../services/api';

interface PortalProject {
  id: string;
  name: string;
  projectNumber?: string;
  status: string;
  progress: number;
  progressPercent?: number;
  description?: string;
  estimatedStart?: string;
  startDate?: string;
  estimatedEnd?: string;
  endDate?: string;
  pm?: { firstName: string; lastName: string };
}

interface GanttTask {
  id: string;
  name: string;
  assignedTeam?: string;
  startDatePlanned?: string;
  endDatePlanned?: string;
  progressPct?: number;
  isMilestone?: boolean;
  status: string;
}

function ProgressBar({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(0, value ?? 0));
  const color = pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-blue-500' : 'bg-orange-400';
  return (
    <div className="w-full bg-gray-100 rounded-full h-2">
      <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function taskStatusIcon(status: string) {
  if (status === 'done') return <CheckCircle className="w-4 h-4 text-emerald-500" />;
  if (status === 'delayed') return <AlertCircle className="w-4 h-4 text-red-500" />;
  if (status === 'in_progress') return <Clock className="w-4 h-4 text-blue-500" />;
  return <Clock className="w-4 h-4 text-gray-400" />;
}

function milestoneStatusColor(status: string) {
  if (status === 'done') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (status === 'in_progress') return 'bg-blue-100 text-blue-700 border-blue-200';
  if (status === 'delayed') return 'bg-red-100 text-red-700 border-red-200';
  return 'bg-gray-100 text-gray-600 border-gray-200';
}

function milestoneTimelineDot(status: string) {
  if (status === 'done') return 'bg-emerald-500';
  if (status === 'in_progress') return 'bg-blue-500';
  if (status === 'delayed') return 'bg-red-500';
  return 'bg-gray-300';
}

function fmt(d?: string) {
  if (!d) return '\u2014';
  try { return new Date(d).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return d; }
}

function fmtShort(d?: string) {
  if (!d) return '\u2014';
  try { return new Date(d).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' }); }
  catch { return d; }
}

// ─── Simple Calendar Component ──────────────────────────────────────────────

function SimpleCalendar({ tasks }: { tasks: GanttTask[] }) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDayOfWeek = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1; // Monday start
  const daysInMonth = lastDay.getDate();

  const monthName = currentDate.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });

  // Build a map of day -> tasks due that day
  const dayTaskMap = useMemo(() => {
    const map: Record<number, { milestones: GanttTask[]; tasks: GanttTask[] }> = {};
    tasks.forEach((t) => {
      const endDate = t.endDatePlanned ? new Date(t.endDatePlanned) : null;
      if (!endDate) return;
      if (endDate.getFullYear() === year && endDate.getMonth() === month) {
        const day = endDate.getDate();
        if (!map[day]) map[day] = { milestones: [], tasks: [] };
        if (t.isMilestone) map[day].milestones.push(t);
        else map[day].tasks.push(t);
      }
    });
    return map;
  }, [tasks, year, month]);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const dayNames = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
  const today = new Date();
  const isToday = (day: number) => today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;

  const cells: (number | null)[] = [];
  for (let i = 0; i < startDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
          <ChevronLeft className="w-4 h-4 text-gray-600" />
        </button>
        <h4 className="text-sm font-semibold text-gray-700 capitalize">{monthName}</h4>
        <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
          <ChevronRight className="w-4 h-4 text-gray-600" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden">
        {dayNames.map((d) => (
          <div key={d} className="bg-gray-50 text-center text-xs font-medium text-gray-500 py-2">{d}</div>
        ))}
        {cells.map((day, i) => {
          const entry = day ? dayTaskMap[day] : null;
          const hasMilestone = (entry?.milestones.length ?? 0) > 0;
          const hasTask = (entry?.tasks.length ?? 0) > 0;
          return (
            <div
              key={i}
              className={`bg-white min-h-[48px] p-1 relative ${day ? '' : 'bg-gray-50'}`}
              title={entry ? [...(entry.milestones.map(m => `[M] ${m.name}`)), ...(entry.tasks.map(t => t.name))].join('\n') : ''}
            >
              {day && (
                <>
                  <span className={`text-xs ${isToday(day) ? 'bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center' : 'text-gray-700'}`}>
                    {day}
                  </span>
                  <div className="flex gap-0.5 mt-0.5 flex-wrap">
                    {hasMilestone && <div className="w-2 h-2 rounded-full bg-amber-500" title="Milestone" />}
                    {hasTask && <div className="w-2 h-2 rounded-full bg-blue-400" title="Task" />}
                    {(entry?.milestones.length ?? 0) > 1 && <span className="text-[9px] text-amber-600 font-bold">{entry!.milestones.length}</span>}
                    {(entry?.tasks.length ?? 0) > 1 && <span className="text-[9px] text-blue-500 font-bold">{entry!.tasks.length}</span>}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-amber-500" /> Milestone</div>
        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-400" /> Scadenza attivita</div>
      </div>
    </div>
  );
}

// ─── Milestones Timeline ────────────────────────────────────────────────────

function MilestonesTimeline({ tasks, projectId, onTaskApproved }: { tasks: GanttTask[]; projectId: string; onTaskApproved: () => void }) {
  const milestones = tasks.filter((t) => t.isMilestone);
  const [approving, setApproving] = useState<string | null>(null);
  const [approveError, setApproveError] = useState('');

  const handleApprove = async (taskId: string) => {
    setApproving(taskId);
    setApproveError('');
    try {
      await api.post(`/portal/projects/${projectId}/approve-step`, { taskId, approved: true });
      onTaskApproved();
    } catch {
      setApproveError('Errore durante l\'approvazione.');
    } finally {
      setApproving(null);
    }
  };

  if (milestones.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-6">Nessuna milestone definita per questo progetto.</p>;
  }

  return (
    <div className="space-y-1">
      {approveError && <div className="p-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 mb-3">{approveError}</div>}
      {milestones.map((m, i) => (
        <div key={m.id} className="flex gap-3">
          {/* Timeline line & dot */}
          <div className="flex flex-col items-center">
            <div className={`w-3 h-3 rounded-full flex-shrink-0 mt-1.5 ${milestoneTimelineDot(m.status)}`} />
            {i < milestones.length - 1 && <div className="w-0.5 flex-1 bg-gray-200 my-1" />}
          </div>
          {/* Content */}
          <div className="flex-1 pb-4">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Star className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                  <span className="font-medium text-gray-900 text-sm">{m.name}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span>Scadenza: {fmt(m.endDatePlanned)}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${milestoneStatusColor(m.status)}`}>
                    {m.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                  <div className="w-20"><ProgressBar value={m.progressPct ?? 0} /></div>
                  <span className="text-xs text-gray-500">{m.progressPct ?? 0}%</span>
                </div>
              </div>
              {/* Approve button for non-done milestones */}
              {(m.status === 'in_progress' || m.status === 'not_started') && (
                <button
                  onClick={() => handleApprove(m.id)}
                  disabled={approving === m.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors disabled:opacity-50 flex-shrink-0"
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                  {approving === m.id ? 'Invio...' : 'Approva'}
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Project Detail ─────────────────────────────────────────────────────────

type DetailTab = 'tasks' | 'milestones' | 'calendar';

function ProjectDetail({ project, onBack }: { project: PortalProject; onBack: () => void }) {
  const [tasks, setTasks] = useState<GanttTask[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<DetailTab>('tasks');

  const loadTasks = () => {
    setTasksLoading(true);
    api.get(`/portal/projects/${project.id}/tasks`)
      .then(({ data }) => {
        setTasks(Array.isArray(data) ? data : data.data ?? []);
      })
      .catch(() => setTasks([]))
      .finally(() => setTasksLoading(false));
  };

  useEffect(() => {
    loadTasks();
  }, [project.id]);

  const progress = project.progressPercent ?? project.progress ?? 0;

  const tabs: { key: DetailTab; label: string; icon: React.ReactNode }[] = [
    { key: 'tasks', label: 'Attivita', icon: <Clock className="w-4 h-4" /> },
    { key: 'milestones', label: 'Milestone', icon: <Flag className="w-4 h-4" /> },
    { key: 'calendar', label: 'Calendario', icon: <Calendar className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
      >
        <ArrowLeft className="w-4 h-4" />
        Torna ai progetti
      </button>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <FolderOpen className="w-6 h-6 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
              <h2 className="text-xl font-bold text-gray-900">{project.name}</h2>
              <StatusBadge status={project.status} />
            </div>
            {project.projectNumber && (
              <p className="text-sm text-gray-400 font-mono">{project.projectNumber}</p>
            )}
          </div>
        </div>

        {project.description && (
          <p className="text-sm text-gray-600 mb-4">{project.description}</p>
        )}

        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600">Avanzamento complessivo</span>
          <span className="text-sm font-bold text-blue-700">{progress}%</span>
        </div>
        <ProgressBar value={progress} />

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-100">
          {(project.startDate ?? project.estimatedStart) && (
            <div>
              <p className="text-xs text-gray-400">Inizio</p>
              <p className="text-sm text-gray-700">{fmt(project.startDate ?? project.estimatedStart)}</p>
            </div>
          )}
          {(project.endDate ?? project.estimatedEnd) && (
            <div>
              <p className="text-xs text-gray-400">Fine prevista</p>
              <p className="text-sm text-gray-700">{fmt(project.endDate ?? project.estimatedEnd)}</p>
            </div>
          )}
          {project.pm && (
            <div>
              <p className="text-xs text-gray-400">Project Manager</p>
              <p className="text-sm text-gray-700">{project.pm.firstName} {project.pm.lastName}</p>
            </div>
          )}
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all flex-1 justify-center ${
              activeTab === tab.key
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        {activeTab === 'tasks' && (
          <>
            <h3 className="text-base font-semibold text-gray-900 mb-4">Attivita del Progetto</h3>
            {tasksLoading ? (
              <div className="text-center py-8 text-gray-400 animate-pulse">Caricamento attivita...</div>
            ) : tasks.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Nessuna attivita pianificata.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left text-xs font-medium text-gray-500 pb-2 pr-4">Attivita</th>
                      <th className="text-left text-xs font-medium text-gray-500 pb-2 pr-4">Team</th>
                      <th className="text-left text-xs font-medium text-gray-500 pb-2 pr-4">Inizio</th>
                      <th className="text-left text-xs font-medium text-gray-500 pb-2 pr-4">Fine</th>
                      <th className="text-left text-xs font-medium text-gray-500 pb-2 pr-4">Progresso</th>
                      <th className="text-left text-xs font-medium text-gray-500 pb-2">Stato</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {tasks.map((task) => (
                      <tr key={task.id} className="hover:bg-gray-50">
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            {task.isMilestone && <Star className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />}
                            <span className={`font-medium text-gray-900 ${task.isMilestone ? 'text-amber-700' : ''}`}>
                              {task.name}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-gray-500">{task.assignedTeam ?? '\u2014'}</td>
                        <td className="py-3 pr-4 text-gray-600">{fmtShort(task.startDatePlanned)}</td>
                        <td className="py-3 pr-4 text-gray-600">{fmtShort(task.endDatePlanned)}</td>
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2 min-w-[80px]">
                            <div className="flex-1">
                              <ProgressBar value={task.progressPct ?? 0} />
                            </div>
                            <span className="text-xs text-gray-500 w-8 text-right">{task.progressPct ?? 0}%</span>
                          </div>
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-1.5">
                            {taskStatusIcon(task.status)}
                            <span className="text-xs text-gray-500">{task.status.replace('_', ' ')}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {activeTab === 'milestones' && (
          <>
            <h3 className="text-base font-semibold text-gray-900 mb-4">Milestone del Progetto</h3>
            {tasksLoading ? (
              <div className="text-center py-8 text-gray-400 animate-pulse">Caricamento milestone...</div>
            ) : (
              <MilestonesTimeline tasks={tasks} projectId={project.id} onTaskApproved={loadTasks} />
            )}
          </>
        )}

        {activeTab === 'calendar' && (
          <>
            <h3 className="text-base font-semibold text-gray-900 mb-4">Calendario Scadenze</h3>
            {tasksLoading ? (
              <div className="text-center py-8 text-gray-400 animate-pulse">Caricamento...</div>
            ) : (
              <SimpleCalendar tasks={tasks} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function PortalProjectsPage() {
  const [projects, setProjects] = useState<PortalProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedProject, setSelectedProject] = useState<PortalProject | null>(null);

  useEffect(() => {
    api.get('/portal/projects')
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : (data.data ?? []);
        setProjects(list);
      })
      .catch(() => setError('Impossibile caricare i progetti.'))
      .finally(() => setLoading(false));
  }, []);

  if (selectedProject) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <ProjectDetail project={selectedProject} onBack={() => setSelectedProject(null)} />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">I miei Progetti</h1>
        <p className="text-sm text-gray-500 mt-1">Stato e avanzamento dei tuoi progetti</p>
      </div>

      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="text-center py-20 text-gray-400 animate-pulse">Caricamento...</div>
      ) : projects.length === 0 ? (
        <div className="text-center py-20 text-gray-400">Nessun progetto disponibile.</div>
      ) : (
        <div className="grid gap-4">
          {projects.map((project) => {
            const progress = project.progressPercent ?? project.progress ?? 0;
            return (
              <div
                key={project.id}
                onClick={() => setSelectedProject(project)}
                className="bg-white rounded-xl border border-gray-200 p-6 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FolderOpen className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                      <h3 className="text-base font-semibold text-gray-900">{project.name}</h3>
                      <StatusBadge status={project.status} />
                    </div>
                    {project.description && (
                      <p className="text-sm text-gray-500 mb-3">{project.description}</p>
                    )}
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Avanzamento</span>
                      <span className="text-sm font-semibold text-blue-700">{progress}%</span>
                    </div>
                    <ProgressBar value={progress} />
                    <div className="flex items-center gap-6 mt-3 text-xs text-gray-400">
                      {(project.startDate ?? project.estimatedStart) && (
                        <span>Inizio: {fmt(project.startDate ?? project.estimatedStart)}</span>
                      )}
                      {(project.endDate ?? project.estimatedEnd) && (
                        <span>Fine prevista: {fmt(project.endDate ?? project.estimatedEnd)}</span>
                      )}
                      {project.pm && <span>PM: {project.pm.firstName} {project.pm.lastName}</span>}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
