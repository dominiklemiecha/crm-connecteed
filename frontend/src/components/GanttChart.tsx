import { useMemo } from 'react';
import { Flag } from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface GanttTask {
  id: string;
  name: string;
  startDate?: string;
  endDate?: string;
  startDatePlanned?: string;
  endDatePlanned?: string;
  progressPct: number;
  isMilestone: boolean;
  assignedTeam?: string;
  status?: string;
}

interface Props {
  tasks: GanttTask[];
  projectStart: string;
  projectEnd: string;
  showBaseline?: boolean;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function getMonthsBetween(start: Date, end: Date): { label: string; year: number; month: number }[] {
  const months: { label: string; year: number; month: number }[] = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const finish = new Date(end.getFullYear(), end.getMonth(), 1);
  while (cursor <= finish) {
    months.push({
      label: cursor.toLocaleDateString('it-IT', { month: 'short', year: '2-digit' }),
      year: cursor.getFullYear(),
      month: cursor.getMonth(),
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return months;
}

function clampDate(date: Date, min: Date, max: Date): Date {
  if (date < min) return min;
  if (date > max) return max;
  return date;
}

function positionPercent(date: Date, start: Date, totalMs: number): number {
  return ((date.getTime() - start.getTime()) / totalMs) * 100;
}

function widthPercent(taskStart: Date, taskEnd: Date, projStart: Date, totalMs: number): number {
  const s = clampDate(taskStart, projStart, new Date(projStart.getTime() + totalMs));
  const e = clampDate(taskEnd, projStart, new Date(projStart.getTime() + totalMs));
  return ((e.getTime() - s.getTime()) / totalMs) * 100;
}

function statusColor(status?: string, progressPct?: number): { bar: string; progress: string } {
  if (status === 'done' || progressPct === 100) return { bar: 'bg-emerald-200', progress: 'bg-emerald-500' };
  if (status === 'in_progress' || (progressPct !== undefined && progressPct > 0)) return { bar: 'bg-blue-200', progress: 'bg-blue-500' };
  return { bar: 'bg-gray-200', progress: 'bg-gray-400' };
}

// ─── Milestone Diamond ──────────────────────────────────────────────────────

function MilestoneDiamond({ color }: { color: string }) {
  return (
    <div
      className={`w-4 h-4 rotate-45 flex-shrink-0 ${color} border-2 border-amber-500`}
      title="Milestone"
    />
  );
}

// ─── Main Component ────────────────────────────────────────────────────────

export default function GanttChart({ tasks, projectStart, projectEnd, showBaseline = false }: Props) {
  const projStart = useMemo(() => {
    const d = new Date(projectStart);
    return isNaN(d.getTime()) ? new Date() : new Date(d.getFullYear(), d.getMonth(), 1);
  }, [projectStart]);

  const projEnd = useMemo(() => {
    const d = new Date(projectEnd);
    if (isNaN(d.getTime())) {
      const fallback = new Date(projStart);
      fallback.setMonth(fallback.getMonth() + 3);
      return fallback;
    }
    return new Date(d.getFullYear(), d.getMonth() + 1, 0); // last day of month
  }, [projectEnd, projStart]);

  const totalMs = projEnd.getTime() - projStart.getTime();
  const months = useMemo(() => getMonthsBetween(projStart, projEnd), [projStart, projEnd]);

  const today = new Date();
  const todayPct = totalMs > 0 ? positionPercent(today, projStart, totalMs) : -1;

  if (tasks.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4 text-center text-gray-400 text-sm">
        Nessun task con date pianificate da visualizzare nel Gantt.
      </div>
    );
  }

  // Filter tasks that have at least a start date
  const ganttTasks = tasks.filter((t) => t.startDate || t.endDate);
  if (ganttTasks.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4 text-center text-gray-400 text-sm">
        Assegna date di inizio/fine ai task per visualizzare il Gantt.
      </div>
    );
  }

  const ROW_HEIGHT = 40;

  return (
    <div className="bg-white rounded-xl border border-gray-200 mb-6 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
        <span className="font-semibold text-gray-800 text-sm">Gantt Chart</span>
        <span className="text-xs text-gray-400 ml-1">— timeline progetto</span>
        <div className="ml-auto flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm bg-emerald-500" /> Completato</span>
          <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm bg-blue-500" /> In corso</span>
          <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm bg-gray-400" /> Pianificato</span>
          <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rotate-45 bg-amber-400" /> Milestone</span>
          {showBaseline && (
            <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm bg-gray-300 opacity-50" /> Baseline</span>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <div style={{ minWidth: Math.max(700, months.length * 80 + 200) }}>
          {/* Header row */}
          <div className="flex border-b border-gray-200">
            {/* Task name col */}
            <div className="w-48 flex-shrink-0 bg-gray-50 border-r border-gray-200 px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Task
            </div>
            {/* Timeline header */}
            <div className="flex-1 relative bg-gray-50">
              <div className="flex h-full">
                {months.map((m, i) => (
                  <div
                    key={`${m.year}-${m.month}`}
                    className={`flex-1 text-center text-xs font-medium text-gray-500 py-2 ${i < months.length - 1 ? 'border-r border-gray-200' : ''}`}
                    style={{ minWidth: 60 }}
                  >
                    {m.label}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Task rows */}
          {ganttTasks.map((task) => {
            const taskStart = task.startDate ? new Date(task.startDate) : projStart;
            const taskEnd = task.endDate
              ? new Date(task.endDate)
              : task.startDate
              ? new Date(taskStart.getTime() + 86400000) // +1 day for milestone
              : new Date(projEnd);

            const clampedStart = clampDate(taskStart, projStart, projEnd);
            const clampedEnd = clampDate(taskEnd, projStart, projEnd);

            const leftPct = totalMs > 0 ? positionPercent(clampedStart, projStart, totalMs) : 0;
            const wPct = totalMs > 0 ? widthPercent(clampedStart, clampedEnd, projStart, totalMs) : 5;

            const colors = statusColor(task.status, task.progressPct);

            return (
              <div key={task.id} className="flex border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors" style={{ height: ROW_HEIGHT }}>
                {/* Task name */}
                <div className="w-48 flex-shrink-0 border-r border-gray-200 px-3 flex items-center gap-1.5">
                  {task.isMilestone && <Flag className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />}
                  <span className="text-xs text-gray-700 font-medium truncate" title={task.name}>
                    {task.name}
                  </span>
                </div>

                {/* Bar area */}
                <div className="flex-1 relative flex items-center">
                  {/* Month grid lines */}
                  {months.map((m, i) => (
                    i < months.length - 1 && (
                      <div
                        key={`${m.year}-${m.month}-grid`}
                        className="absolute top-0 bottom-0 w-px bg-gray-100"
                        style={{ left: `${((i + 1) / months.length) * 100}%` }}
                      />
                    )
                  ))}

                  {/* Today line */}
                  {todayPct >= 0 && todayPct <= 100 && (
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-red-400 z-10 opacity-70"
                      style={{ left: `${todayPct}%` }}
                      title="Oggi"
                    />
                  )}

                  {/* Baseline bar (planned dates - gray, semi-transparent) */}
                  {showBaseline && !task.isMilestone && task.startDatePlanned && task.endDatePlanned && (
                    (() => {
                      const baseStart = clampDate(new Date(task.startDatePlanned!), projStart, projEnd);
                      const baseEnd = clampDate(new Date(task.endDatePlanned!), projStart, projEnd);
                      const baseLeftPct = totalMs > 0 ? positionPercent(baseStart, projStart, totalMs) : 0;
                      const baseWPct = totalMs > 0 ? widthPercent(baseStart, baseEnd, projStart, totalMs) : 5;
                      return (
                        <div
                          className="absolute rounded-sm bg-gray-300 opacity-40"
                          style={{
                            left: `${baseLeftPct}%`,
                            width: `${Math.max(baseWPct, 0.5)}%`,
                            height: 8,
                            top: '25%',
                            transform: 'translateY(-50%)',
                          }}
                          title={`Baseline: ${task.startDatePlanned} → ${task.endDatePlanned}`}
                        />
                      );
                    })()
                  )}

                  {/* Task bar or milestone diamond */}
                  {task.isMilestone ? (
                    <div
                      className="absolute flex items-center justify-center"
                      style={{ left: `calc(${leftPct}% - 8px)`, top: '50%', transform: 'translateY(-50%)' }}
                    >
                      <MilestoneDiamond color="bg-amber-300" />
                    </div>
                  ) : (
                    <div
                      className={`absolute rounded-sm ${colors.bar} overflow-hidden`}
                      style={{
                        left: `${leftPct}%`,
                        width: `${Math.max(wPct, 0.5)}%`,
                        height: showBaseline ? 14 : 20,
                        top: showBaseline ? '60%' : '50%',
                        transform: 'translateY(-50%)',
                      }}
                      title={`${task.name}: ${task.progressPct}%`}
                    >
                      {/* Progress inner bar */}
                      <div
                        className={`h-full ${colors.progress} transition-all`}
                        style={{ width: `${task.progressPct}%` }}
                      />
                      {/* Progress label inside bar */}
                      {wPct > 8 && (
                        <span className="absolute inset-0 flex items-center justify-center text-white text-[10px] font-semibold mix-blend-overlay pointer-events-none">
                          {task.progressPct > 0 ? `${task.progressPct}%` : ''}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
