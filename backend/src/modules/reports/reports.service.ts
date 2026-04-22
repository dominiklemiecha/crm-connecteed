import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as ExcelJS from 'exceljs';

export interface ReportFilter {
  tenantId: string;
  from?: string;
  to?: string;
}

@Injectable()
export class ReportsService {
  constructor(private readonly dataSource: DataSource) {}

  private dateRange(filter: ReportFilter): { from: Date; to: Date } {
    const to = filter.to ? new Date(filter.to) : new Date();
    const from = filter.from
      ? new Date(filter.from)
      : new Date(to.getFullYear(), to.getMonth() - 11, 1);
    return { from, to };
  }

  // ─── Sales Report ──────────────────────────────────────────────────────────

  async getSalesReport(filter: ReportFilter) {
    const { from, to } = this.dateRange(filter);
    const { tenantId } = filter;

    const [wonRows, lostRows, valueByProduct, lostReasons, closeTimes] = await Promise.all([
      // Won opportunities per period
      this.dataSource.query(
        `SELECT COUNT(*) AS won_count, COALESCE(SUM(estimated_value_cents),0) AS won_value_cents
         FROM opportunities
         WHERE tenant_id = $1 AND status = 'won' AND updated_at BETWEEN $2 AND $3`,
        [tenantId, from, to],
      ),
      // Lost opportunities
      this.dataSource.query(
        `SELECT COUNT(*) AS lost_count, COALESCE(SUM(estimated_value_cents),0) AS lost_value_cents
         FROM opportunities
         WHERE tenant_id = $1 AND status = 'lost' AND updated_at BETWEEN $2 AND $3`,
        [tenantId, from, to],
      ),
      // Value by product
      this.dataSource.query(
        `SELECT p.name AS product_name,
                COUNT(o.id) AS count,
                COALESCE(SUM(o.estimated_value_cents),0) AS total_value_cents
         FROM opportunities o
         LEFT JOIN products p ON p.id = o.product_id AND p.tenant_id = $1
         WHERE o.tenant_id = $1 AND o.status = 'won' AND o.updated_at BETWEEN $2 AND $3
         GROUP BY p.name ORDER BY total_value_cents DESC`,
        [tenantId, from, to],
      ),
      // Lost reasons breakdown
      this.dataSource.query(
        `SELECT lost_reason, COUNT(*) AS count
         FROM opportunities
         WHERE tenant_id = $1 AND status = 'lost' AND updated_at BETWEEN $2 AND $3
           AND lost_reason IS NOT NULL
         GROUP BY lost_reason ORDER BY count DESC`,
        [tenantId, from, to],
      ),
      // Avg time to close (days)
      this.dataSource.query(
        `SELECT ROUND(AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/86400)::numeric, 1) AS avg_days_to_close
         FROM opportunities
         WHERE tenant_id = $1 AND status = 'won' AND updated_at BETWEEN $2 AND $3`,
        [tenantId, from, to],
      ),
    ]);

    const wonCount = parseInt(wonRows[0]?.won_count ?? '0', 10);
    const lostCount = parseInt(lostRows[0]?.lost_count ?? '0', 10);
    const total = wonCount + lostCount;
    const conversionRate = total > 0 ? Math.round((wonCount / total) * 10000) / 100 : 0;

    return {
      period: { from, to },
      summary: {
        wonCount,
        lostCount,
        conversionRate,
        wonValueCents: parseInt(wonRows[0]?.won_value_cents ?? '0', 10),
        lostValueCents: parseInt(lostRows[0]?.lost_value_cents ?? '0', 10),
        avgDaysToClose: parseFloat(closeTimes[0]?.avg_days_to_close ?? '0'),
      },
      valueByProduct,
      lostReasonsBreakdown: lostReasons,
    };
  }

  // ─── Pipeline Report ───────────────────────────────────────────────────────

  async getPipelineReport(filter: ReportFilter) {
    const { tenantId } = filter;

    const [byStatus, forecast] = await Promise.all([
      this.dataSource.query(
        `SELECT status,
                COUNT(*) AS count,
                COALESCE(SUM(estimated_value_cents),0) AS total_value_cents
         FROM opportunities
         WHERE tenant_id = $1
         GROUP BY status ORDER BY count DESC`,
        [tenantId],
      ),
      this.dataSource.query(
        `SELECT status, probability,
                COUNT(*) AS count,
                COALESCE(SUM(estimated_value_cents),0) AS total_value_cents,
                COALESCE(SUM(estimated_value_cents * probability / 100),0) AS weighted_value_cents
         FROM opportunities
         WHERE tenant_id = $1
           AND status NOT IN ('won','lost')
           AND probability IS NOT NULL
         GROUP BY status, probability ORDER BY weighted_value_cents DESC`,
        [tenantId],
      ),
    ]);

    const totalForecast = forecast.reduce(
      (sum: number, row: any) => sum + parseInt(row.weighted_value_cents, 10),
      0,
    );

    return {
      byStatus,
      forecast: {
        rows: forecast,
        totalWeightedValueCents: totalForecast,
      },
    };
  }

  // ─── Delivery Report ───────────────────────────────────────────────────────

  async getDeliveryReport(filter: ReportFilter) {
    const { from, to } = this.dateRange(filter);
    const { tenantId } = filter;

    const fromStr = from.toISOString();
    const toStr = to.toISOString();

    const [byStatus, avgCompletion, delayStats] = await Promise.all([
      this.dataSource.query(
        `SELECT status, COUNT(*) AS count
         FROM projects WHERE tenant_id = $1
         GROUP BY status`,
        [tenantId],
      ),
      this.dataSource.query(
        `SELECT COALESCE(ROUND(AVG(end_date - start_date)::numeric, 1), 0) AS avg_days
         FROM projects
         WHERE tenant_id = $1 AND status = 'closed'
           AND end_date IS NOT NULL AND start_date IS NOT NULL
           AND end_date BETWEEN $2::date AND $3::date`,
        [tenantId, fromStr, toStr],
      ),
      this.dataSource.query(
        `SELECT
           COUNT(*) FILTER (WHERE end_date IS NOT NULL AND end_date < NOW() AND status NOT IN ('delivered','closed')) AS delayed_count,
           COUNT(*) FILTER (WHERE status IN ('delivered','closed')) AS completed_count,
           COUNT(*) FILTER (WHERE status IN ('delivered','closed') AND (end_date IS NULL OR end_date >= NOW())) AS on_time_count
         FROM projects
         WHERE tenant_id = $1`,
        [tenantId],
      ),
    ]);

    const completed = parseInt(delayStats[0]?.completed_count ?? '0', 10);
    const onTime = parseInt(delayStats[0]?.on_time_count ?? '0', 10);
    const onTimeRate = completed > 0 ? Math.round((onTime / completed) * 10000) / 100 : 0;

    return {
      period: { from, to },
      byStatus,
      avgCompletionDays: parseFloat(avgCompletion[0]?.avg_days ?? '0'),
      delayedCount: parseInt(delayStats[0]?.delayed_count ?? '0', 10),
      completedCount: completed,
      onTimeCount: onTime,
      onTimeRate,
    };
  }

  // ─── Support Report ────────────────────────────────────────────────────────

  async getSupportReport(filter: ReportFilter) {
    const { from, to } = this.dateRange(filter);
    const { tenantId } = filter;

    const [byStatus, byPriority, resolutionTime, slaBreach] = await Promise.all([
      this.dataSource.query(
        `SELECT status, COUNT(*) AS count
         FROM tickets WHERE tenant_id = $1
           AND created_at BETWEEN $2 AND $3
         GROUP BY status`,
        [tenantId, from, to],
      ),
      this.dataSource.query(
        `SELECT priority, COUNT(*) AS count
         FROM tickets WHERE tenant_id = $1
           AND created_at BETWEEN $2 AND $3
         GROUP BY priority`,
        [tenantId, from, to],
      ),
      this.dataSource.query(
        `SELECT ROUND(AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/3600)::numeric, 2) AS avg_hours
         FROM tickets
         WHERE tenant_id = $1 AND resolved_at IS NOT NULL
           AND created_at BETWEEN $2 AND $3`,
        [tenantId, from, to],
      ),
      this.dataSource.query(
        `SELECT
           COUNT(*) FILTER (WHERE sla_deadline IS NOT NULL AND sla_deadline < NOW() AND status NOT IN ('closed')) AS breached_count,
           COUNT(*) FILTER (WHERE sla_deadline IS NOT NULL) AS total_sla_count
         FROM tickets
         WHERE tenant_id = $1 AND created_at BETWEEN $2 AND $3`,
        [tenantId, from, to],
      ),
    ]);

    const totalSla = parseInt(slaBreach[0]?.total_sla_count ?? '0', 10);
    const breached = parseInt(slaBreach[0]?.breached_count ?? '0', 10);
    const slaBreachRate = totalSla > 0 ? Math.round((breached / totalSla) * 10000) / 100 : 0;

    const [byTeam] = await Promise.all([
      this.dataSource.query(
        `SELECT assigned_team, COUNT(*) AS count
         FROM tickets WHERE tenant_id = $1
           AND created_at BETWEEN $2 AND $3
           AND assigned_team IS NOT NULL
         GROUP BY assigned_team ORDER BY count DESC`,
        [tenantId, from, to],
      ),
    ]);

    return {
      period: { from, to },
      byStatus,
      byPriority,
      byTeam,
      avgResolutionHours: parseFloat(resolutionTime[0]?.avg_hours ?? '0'),
      slaBreachCount: breached,
      slaTotalCount: totalSla,
      slaBreachRate,
    };
  }

  // ─── Financial Report ──────────────────────────────────────────────────────

  async getFinancialReport(filter: ReportFilter) {
    const { from, to } = this.dateRange(filter);
    const { tenantId } = filter;

    const [byStatus, revenue, overdue, collections] = await Promise.all([
      this.dataSource.query(
        `SELECT status, COUNT(*) AS count, COALESCE(SUM(total_cents),0) AS total_cents
         FROM invoices WHERE tenant_id = $1 AND created_at BETWEEN $2 AND $3
         GROUP BY status`,
        [tenantId, from, to],
      ),
      this.dataSource.query(
        `SELECT COALESCE(SUM(total_cents),0) AS total_revenue_cents
         FROM invoices
         WHERE tenant_id = $1 AND status = 'paid' AND paid_at BETWEEN $2 AND $3`,
        [tenantId, from, to],
      ),
      this.dataSource.query(
        `SELECT COALESCE(SUM(total_cents),0) AS overdue_cents
         FROM invoices
         WHERE tenant_id = $1 AND status = 'overdue'`,
        [tenantId],
      ),
      this.dataSource.query(
        `SELECT
           COALESCE(SUM(total_cents),0) AS issued_cents,
           COALESCE(SUM(CASE WHEN status = 'paid' THEN total_cents ELSE 0 END),0) AS collected_cents
         FROM invoices
         WHERE tenant_id = $1 AND created_at BETWEEN $2 AND $3`,
        [tenantId, from, to],
      ),
    ]);

    const issued = parseInt(collections[0]?.issued_cents ?? '0', 10);
    const collected = parseInt(collections[0]?.collected_cents ?? '0', 10);
    const collectionRate = issued > 0 ? Math.round((collected / issued) * 10000) / 100 : 0;

    return {
      period: { from, to },
      byStatus,
      totalRevenueCents: parseInt(revenue[0]?.total_revenue_cents ?? '0', 10),
      overdueAmountCents: parseInt(overdue[0]?.overdue_cents ?? '0', 10),
      issuedCents: issued,
      collectedCents: collected,
      collectionRate,
    };
  }

  // ─── Export CSV ────────────────────────────────────────────────────────────

  async exportCsv(
    type: 'sales' | 'pipeline' | 'delivery' | 'support' | 'financial',
    filter: ReportFilter,
  ): Promise<string> {
    let data: any;
    switch (type) {
      case 'sales':
        data = await this.getSalesReport(filter);
        break;
      case 'pipeline':
        data = await this.getPipelineReport(filter);
        break;
      case 'delivery':
        data = await this.getDeliveryReport(filter);
        break;
      case 'support':
        data = await this.getSupportReport(filter);
        break;
      case 'financial':
        data = await this.getFinancialReport(filter);
        break;
    }

    return this.flattenToCsv(data);
  }

  private flattenToCsv(obj: any, prefix = ''): string {
    const rows: string[] = ['key,value'];
    const flatten = (o: any, p: string) => {
      if (Array.isArray(o)) {
        o.forEach((item, i) => flatten(item, `${p}[${i}]`));
      } else if (o !== null && typeof o === 'object') {
        Object.keys(o).forEach((k) => flatten(o[k], p ? `${p}.${k}` : k));
      } else {
        rows.push(`${p},"${String(o ?? '').replace(/"/g, '""')}"`);
      }
    };
    flatten(obj, prefix);
    return rows.join('\n');
  }

  // ─── Export Excel (.xlsx) ──────────────────────────────────────────────────

  async exportExcel(
    type: 'sales' | 'pipeline' | 'delivery' | 'support' | 'financial',
    filter: ReportFilter,
  ): Promise<Buffer> {
    let data: any;
    switch (type) {
      case 'sales': data = await this.getSalesReport(filter); break;
      case 'pipeline': data = await this.getPipelineReport(filter); break;
      case 'delivery': data = await this.getDeliveryReport(filter); break;
      case 'support': data = await this.getSupportReport(filter); break;
      case 'financial': data = await this.getFinancialReport(filter); break;
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Connecteed CRM';
    workbook.created = new Date();

    const typeLabels: Record<string, string> = {
      sales: 'Vendite', pipeline: 'Pipeline', delivery: 'Delivery',
      support: 'Supporto', financial: 'Finanziario',
    };

    // Summary sheet
    const summarySheet = workbook.addWorksheet('Riepilogo');
    summarySheet.columns = [
      { header: 'Indicatore', key: 'key', width: 35 },
      { header: 'Valore', key: 'value', width: 25 },
    ];
    summarySheet.getRow(1).font = { bold: true };
    summarySheet.addRow({ key: 'Report', value: typeLabels[type] ?? type });
    summarySheet.addRow({ key: 'Generato il', value: new Date().toLocaleDateString('it-IT') });

    const addSummaryRows = (obj: Record<string, any>, prefix = '') => {
      for (const [key, val] of Object.entries(obj)) {
        if (val === null || val === undefined) continue;
        if (typeof val === 'object' && !Array.isArray(val)) {
          addSummaryRows(val, prefix ? `${prefix}.${key}` : key);
        } else if (!Array.isArray(val)) {
          const label = (prefix ? `${prefix}.` : '') + key;
          const displayVal = typeof val === 'number' && label.includes('Cents')
            ? `€ ${(val / 100).toFixed(2)}`
            : val;
          summarySheet.addRow({ key: label, value: String(displayVal) });
        }
      }
    };

    if (data.summary) {
      summarySheet.addRow({});
      addSummaryRows(data.summary);
    } else {
      addSummaryRows(data);
    }

    // Detail sheets for arrays
    const addArraySheet = (name: string, arr: any[]) => {
      if (!arr || arr.length === 0) return;
      const sheet = workbook.addWorksheet(name);
      const keys = Object.keys(arr[0]);
      sheet.columns = keys.map((k) => ({ header: k, key: k, width: 20 }));
      sheet.getRow(1).font = { bold: true };
      for (const row of arr) {
        const mapped: Record<string, any> = {};
        for (const k of keys) {
          const v = row[k];
          mapped[k] = typeof v === 'number' && k.includes('cents')
            ? `€ ${(v / 100).toFixed(2)}`
            : v;
        }
        sheet.addRow(mapped);
      }
    };

    // Add array data as separate sheets
    if (data.valueByProduct) addArraySheet('Per Prodotto', data.valueByProduct);
    if (data.lostReasonsBreakdown) addArraySheet('Motivi Persi', data.lostReasonsBreakdown);
    if (data.byStatus) addArraySheet('Per Stato', data.byStatus);
    if (data.byPriority) addArraySheet('Per Priorità', data.byPriority);
    if (data.byTeam) addArraySheet('Per Team', data.byTeam);
    if (data.forecast?.rows) addArraySheet('Forecast', data.forecast.rows);

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
