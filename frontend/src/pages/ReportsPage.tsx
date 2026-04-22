import { useState, useEffect, useCallback } from 'react';
import { Download, TrendingUp, Users, Package, AlertCircle, DollarSign } from 'lucide-react';
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import api from '../services/api';

type TabId = 'vendite' | 'pipeline' | 'delivery' | 'supporto' | 'finanziario';

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'vendite', label: 'Vendite', icon: <TrendingUp className="w-4 h-4" /> },
  { id: 'pipeline', label: 'Pipeline', icon: <Package className="w-4 h-4" /> },
  { id: 'delivery', label: 'Delivery', icon: <Users className="w-4 h-4" /> },
  { id: 'supporto', label: 'Supporto', icon: <AlertCircle className="w-4 h-4" /> },
  { id: 'finanziario', label: 'Finanziario', icon: <DollarSign className="w-4 h-4" /> },
];

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316'];

function KPICard({ label, value, sub, color = 'blue' }: { label: string; value: string; sub?: string; color?: string }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    orange: 'bg-orange-50 text-orange-700 border-orange-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
  };
  return (
    <div className={`rounded-xl border p-5 ${colors[color] ?? colors.blue}`}>
      <p className="text-sm font-medium opacity-80">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      {sub && <p className="text-xs mt-1 opacity-60">{sub}</p>}
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">{title}</h3>
      {children}
    </div>
  );
}

const fmtEur = (v: number) => `€ ${(v / 100).toLocaleString('it-IT', { maximumFractionDigits: 0 })}`;
const fmtPct = (v: number) => `${v.toFixed(1)}%`;

// ---- VENDITE TAB ----
function SalesTab({ dateFrom, dateTo }: { dateFrom: string; dateTo: string }) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get('/reports/sales', { params: { from: dateFrom, to: dateTo } })
      .then(({ data: d }) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [dateFrom, dateTo]);

  if (loading) return <div className="text-center py-20 text-gray-400 animate-pulse">Caricamento...</div>;
  if (!data) return <div className="text-center py-20 text-red-400">Errore caricamento dati vendite</div>;

  const wonLost = [
    { name: 'Vinte', value: (data.wonCount as number) ?? 0 },
    { name: 'Perse', value: (data.lostCount as number) ?? 0 },
  ];
  const byStatus = (data.byStatus as { status: string; count: number; valueCents: number }[]) ?? [];
  const lostReasons = (data.lostReasons as { reason: string; count: number }[]) ?? [];
  const byProduct = (data.byProduct as { name: string; count: number; valueCents: number }[]) ?? [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Opportunita Vinte" value={String((data.wonCount as number) ?? 0)} color="green" />
        <KPICard label="Opportunita Perse" value={String((data.lostCount as number) ?? 0)} color="red" />
        <KPICard label="Valore Chiuso" value={fmtEur((data.wonValueCents as number) ?? 0)} color="green" />
        <KPICard label="Tempo Medio Chiusura" value={`${(data.avgClosingDays as number) ?? 0} gg`} color="blue" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Vinte vs Perse">
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={wonLost} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, value }) => `${name}: ${value}`}>
                {wonLost.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Valore Pipeline per Status">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={byStatus} margin={{ top: 5, right: 10, bottom: 30, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="status" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" />
              <YAxis tickFormatter={(v) => `€${Math.round(v / 100)}k`} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => fmtEur(v)} />
              <Bar dataKey="valueCents" name="Valore" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Motivi Persi">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={lostReasons} dataKey="count" nameKey="reason" cx="50%" cy="50%" outerRadius={80}>
                {lostReasons.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Performance per Prodotto">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={byProduct} margin={{ top: 5, right: 10, bottom: 30, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" name="Numero" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}

// ---- PIPELINE TAB ----
function PipelineTab({ dateFrom, dateTo }: { dateFrom: string; dateTo: string }) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get('/reports/pipeline', { params: { from: dateFrom, to: dateTo } })
      .then(({ data: d }) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [dateFrom, dateTo]);

  if (loading) return <div className="text-center py-20 text-gray-400 animate-pulse">Caricamento...</div>;
  if (!data) return <div className="text-center py-20 text-red-400">Errore caricamento dati pipeline</div>;

  const byStatus = (data.byStatus as { status: string; count: number; valueCents: number }[]) ?? [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <KPICard label="Opportunita Totali" value={String((data.totalCount as number) ?? 0)} color="blue" />
        <KPICard label="Valore Totale" value={fmtEur((data.totalValueCents as number) ?? 0)} color="green" />
        <KPICard label="Forecast" value={fmtEur((data.forecastCents as number) ?? 0)} color="purple" />
      </div>
      <ChartCard title="Opportunita per Status">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={byStatus} margin={{ top: 5, right: 10, bottom: 40, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="status" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" />
            <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `€${Math.round(v / 100)}`} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v: number, name: string) => name === 'Valore' ? fmtEur(v) : v} />
            <Legend />
            <Bar yAxisId="left" dataKey="count" name="Numero" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            <Bar yAxisId="right" dataKey="valueCents" name="Valore" fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}

// ---- DELIVERY TAB ----
function DeliveryTab({ dateFrom, dateTo }: { dateFrom: string; dateTo: string }) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get('/reports/delivery', { params: { from: dateFrom, to: dateTo } })
      .then(({ data: d }) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [dateFrom, dateTo]);

  if (loading) return <div className="text-center py-20 text-gray-400 animate-pulse">Caricamento...</div>;
  if (!data) return <div className="text-center py-20 text-red-400">Errore caricamento dati delivery</div>;

  const byStatus = (data.byStatus as { status: string; count: number }[]) ?? [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <KPICard label="Progetti Totali" value={String((data.totalProjects as number) ?? 0)} color="blue" />
        <KPICard label="Consegnati in Tempo" value={fmtPct((data.onTimeRate as number) ?? 0)} color="green" />
        <KPICard label="Progetti in Ritardo" value={String((data.delayed as number) ?? 0)} color="orange" />
      </div>
      <ChartCard title="Progetti per Status">
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie data={byStatus} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={100} label={({ status, count }) => `${status}: ${count}`}>
              {byStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}

// ---- SUPPORT TAB ----
function SupportTab({ dateFrom, dateTo }: { dateFrom: string; dateTo: string }) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get('/reports/support', { params: { from: dateFrom, to: dateTo } })
      .then(({ data: d }) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [dateFrom, dateTo]);

  if (loading) return <div className="text-center py-20 text-gray-400 animate-pulse">Caricamento...</div>;
  if (!data) return <div className="text-center py-20 text-red-400">Errore caricamento dati supporto</div>;

  const byStatus = (data.byStatus as { status: string; count: number }[]) ?? [];
  const byPriority = (data.byPriority as { priority: string; count: number }[]) ?? [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Ticket Totali" value={String((data.totalTickets as number) ?? 0)} color="blue" />
        <KPICard label="Tempo Medio Risoluzione" value={`${(data.avgResolutionHours as number) ?? 0}h`} color="green" />
        <KPICard label="SLA Breach Rate" value={fmtPct((data.slaBreachRate as number) ?? 0)} color="red" />
        <KPICard label="Ticket Aperti" value={String((data.openTickets as number) ?? 0)} color="orange" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Ticket per Status">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={byStatus} margin={{ top: 5, right: 10, bottom: 10, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="status" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" name="Ticket" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                {byStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Ticket per Priorita">
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={byPriority} dataKey="count" nameKey="priority" cx="50%" cy="50%" outerRadius={90}>
                {byPriority.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}

// ---- FINANCIAL TAB ----
function FinancialTab({ dateFrom, dateTo }: { dateFrom: string; dateTo: string }) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get('/reports/financial', { params: { from: dateFrom, to: dateTo } })
      .then(({ data: d }) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [dateFrom, dateTo]);

  if (loading) return <div className="text-center py-20 text-gray-400 animate-pulse">Caricamento...</div>;
  if (!data) return <div className="text-center py-20 text-red-400">Errore caricamento dati finanziari</div>;

  const revenueTrend = (data.revenueTrend as { month: string; amountCents: number }[]) ?? [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <KPICard label="Fatturato Periodo" value={fmtEur((data.totalRevenueCents as number) ?? 0)} color="green" />
        <KPICard label="Scaduto Non Pagato" value={fmtEur((data.overdueAmountCents as number) ?? 0)} color="red" />
        <KPICard label="Tasso Incasso" value={fmtPct((data.collectionRate as number) ?? 0)} color="blue" />
      </div>
      <ChartCard title="Trend Fatturato Mensile">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={revenueTrend} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={(v) => `€${Math.round(v / 100)}`} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v: number) => fmtEur(v)} />
            <Legend />
            <Line type="monotone" dataKey="amountCents" name="Fatturato" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('vendite');
  const today = new Date();
  const firstOfYear = `${today.getFullYear()}-01-01`;
  const todayStr = today.toISOString().split('T')[0];
  const [dateFrom, setDateFrom] = useState(firstOfYear);
  const [dateTo, setDateTo] = useState(todayStr);
  const [exporting, setExporting] = useState(false);

  const handleExport = useCallback(async (fmt: 'csv' | 'xlsx' = 'csv') => {
    setExporting(true);
    try {
      const response = await api.get('/reports/export', {
        params: { type: activeTab, format: fmt, from: dateFrom, to: dateTo },
        responseType: 'blob',
      });
      const ext = fmt === 'xlsx' ? 'xlsx' : 'csv';
      const mimeType = fmt === 'xlsx'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'text/csv';
      const url = window.URL.createObjectURL(new Blob([response.data], { type: mimeType }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `report_${activeTab}_${dateFrom}_${dateTo}.${ext}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Errore durante l\'esportazione.');
    } finally {
      setExporting(false);
    }
  }, [activeTab, dateFrom, dateTo]);

  const tabProps = { dateFrom, dateTo };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Report</h1>
          <p className="text-sm text-gray-500 mt-1">Analisi e KPI operativi</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Dal</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Al</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={() => handleExport('csv')}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 disabled:bg-emerald-400 transition-colors"
          >
            <Download className="w-4 h-4" />
            {exporting ? 'Esportazione...' : 'CSV'}
          </button>
          <button
            onClick={() => handleExport('xlsx')}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
          >
            <Download className="w-4 h-4" />
            {exporting ? 'Esportazione...' : 'Excel'}
          </button>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'vendite' && <SalesTab {...tabProps} />}
        {activeTab === 'pipeline' && <PipelineTab {...tabProps} />}
        {activeTab === 'delivery' && <DeliveryTab {...tabProps} />}
        {activeTab === 'supporto' && <SupportTab {...tabProps} />}
        {activeTab === 'finanziario' && <FinancialTab {...tabProps} />}
      </div>
    </div>
  );
}
