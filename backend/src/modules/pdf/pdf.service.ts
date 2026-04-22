import { Injectable, Logger, Optional } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';
import { TemplatesService } from '../templates/templates.service';
import { DocumentTemplateType } from '../templates/document-template.entity';

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);

  constructor(
    @Optional() private readonly templatesService?: TemplatesService,
  ) {}

  // ─── HTML Document Rendering ─────────────────────────────────────────────

  async renderQuoteHtml(quote: any, items: any[], company: any): Promise<string> {
    const fmt = (cents: number) =>
      new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(cents / 100);

    let subtotalCents = 0;
    const itemRows = items
      .map((item) => {
        const qty = Number(item.quantity ?? 1);
        const unitCents = Number(item.unitPriceCents ?? 0);
        const discount = Number(item.discountPercent ?? 0);
        const totalCents = Number(item.totalCents ?? Math.round(qty * unitCents * (1 - discount / 100)));
        subtotalCents += totalCents;
        return `<tr>
          <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;font-size:0.875rem;">${item.description || item.name || '—'}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;text-align:right;font-size:0.875rem;">${qty}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;text-align:right;font-size:0.875rem;">${fmt(unitCents)}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;text-align:right;font-size:0.875rem;">${discount > 0 ? discount + '%' : '—'}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;text-align:right;font-size:0.875rem;font-weight:600;">${fmt(totalCents)}</td>
        </tr>`;
      })
      .join('');

    const itemsTable = `<table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
      <thead>
        <tr style="background:#f8fafc;">
          <th style="padding:10px 12px;text-align:left;font-size:0.8rem;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Descrizione</th>
          <th style="padding:10px 12px;text-align:right;font-size:0.8rem;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Qtà</th>
          <th style="padding:10px 12px;text-align:right;font-size:0.8rem;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Prezzo Unit.</th>
          <th style="padding:10px 12px;text-align:right;font-size:0.8rem;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Sconto</th>
          <th style="padding:10px 12px;text-align:right;font-size:0.8rem;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Totale</th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
    </table>`;

    const taxRate = quote.taxRate ?? 22;
    const taxCents = Math.round(subtotalCents * taxRate / 100);
    const grandTotalCents = subtotalCents + taxCents;

    const quoteDate = quote.createdAt
      ? new Date(quote.createdAt).toLocaleDateString('it-IT')
      : new Date().toLocaleDateString('it-IT');
    const validUntil = quote.validUntil
      ? new Date(quote.validUntil).toLocaleDateString('it-IT')
      : '—';

    const data: Record<string, string> = {
      sender_company: 'Connecteed',
      quote_number: quote.quoteNumber ?? '—',
      quote_date: quoteDate,
      quote_valid_until: validUntil,
      company_name: company?.name ?? '—',
      company_vat: company?.vatNumber ?? '—',
      company_address: [company?.address, company?.city].filter(Boolean).join(', ') || '—',
      company_email: company?.email ?? '—',
      company_phone: company?.phone ?? '—',
      contact_name: company?.contactName ?? '—',
      contact_email: company?.contactEmail ?? '—',
      contact_phone: company?.contactPhone ?? '—',
      contact_role: company?.contactRole ?? '—',
      items_table: itemsTable,
      subtotal: fmt(subtotalCents),
      tax_amount: `${fmt(taxCents)} (${taxRate}%)`,
      total_amount: fmt(grandTotalCents),
      notes: quote.notes ?? '',
      terms: quote.terms ?? 'Il presente preventivo è valido per 30 giorni dalla data di emissione.',
    };

    let html: string;
    if (this.templatesService) {
      try {
        await this.templatesService.ensureDefaults(quote.tenantId);
        const template = await this.templatesService.findDefault(quote.tenantId, DocumentTemplateType.QUOTE);
        if (template) {
          html = this.templatesService.renderTemplate(template.htmlContent, data);
        } else {
          html = this.buildFallbackQuoteHtml(data);
        }
      } catch {
        html = this.buildFallbackQuoteHtml(data);
      }
    } else {
      html = this.buildFallbackQuoteHtml(data);
    }

    return this.wrapInPrintPage(html, `Preventivo ${quote.quoteNumber ?? ''}`);
  }

  async renderContractHtml(contract: any, quote: any, company: any): Promise<string> {
    const fmt = (cents: number) =>
      new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(cents / 100);

    const contractDate = contract.createdAt
      ? new Date(contract.createdAt).toLocaleDateString('it-IT')
      : new Date().toLocaleDateString('it-IT');

    const quoteItems = quote?.items ?? [];
    const scopeLines = quoteItems
      .map((item: any) => `<li style="margin-bottom:4px;">${item.description || item.name || '—'}</li>`)
      .join('');
    const scopeOfWork = quoteItems.length > 0
      ? `<ul style="margin:0;padding-left:20px;">${scopeLines}</ul>`
      : (contract.description || quote?.description || '—');

    const totalCents = contract.totalCents ?? quote?.totalCents ?? 0;
    const taxRate = quote?.taxRate ?? 22;
    const taxCents = Math.round(totalCents * taxRate / 100);
    const grandTotal = totalCents + taxCents;

    const data: Record<string, string> = {
      sender_company: 'Connecteed',
      contract_number: contract.contractNumber ?? '—',
      contract_date: contractDate,
      company_name: company?.name ?? contract.companyName ?? '—',
      company_vat: company?.vatNumber ?? contract.clientVat ?? '—',
      company_address: [company?.address, company?.city].filter(Boolean).join(', ') || '—',
      company_email: company?.email ?? '—',
      company_phone: company?.phone ?? '—',
      contact_name: company?.contactName ?? '—',
      contact_email: company?.contactEmail ?? '—',
      contact_phone: company?.contactPhone ?? '—',
      contact_role: company?.contactRole ?? '—',
      scope_of_work: scopeOfWork,
      total_value: fmt(grandTotal),
      signature_client: '',
      signature_provider: '',
      notes: contract.notes ?? '',
      terms: contract.terms ?? '',
    };

    let html: string;
    if (this.templatesService) {
      try {
        await this.templatesService.ensureDefaults(contract.tenantId);
        const template = await this.templatesService.findDefault(contract.tenantId, DocumentTemplateType.CONTRACT);
        if (template) {
          html = this.templatesService.renderTemplate(template.htmlContent, data);
        } else {
          html = this.buildFallbackContractHtml(data);
        }
      } catch {
        html = this.buildFallbackContractHtml(data);
      }
    } else {
      html = this.buildFallbackContractHtml(data);
    }

    return this.wrapInPrintPage(html, `Contratto ${contract.contractNumber ?? ''}`);
  }

  private buildFallbackQuoteHtml(data: Record<string, string>): string {
    return `<div style="font-family:Arial,sans-serif;max-width:800px;margin:auto;padding:40px;">
      <h1 style="color:#1e40af;">PREVENTIVO N. ${data.quote_number}</h1>
      <p>Data: ${data.quote_date}</p>
      <p><strong>Cliente:</strong> ${data.company_name}</p>
      ${data.items_table}
      <div style="text-align:right;margin-top:20px;">
        <p>Imponibile: ${data.subtotal}</p>
        <p>IVA: ${data.tax_amount}</p>
        <p><strong>Totale: ${data.total_amount}</strong></p>
      </div>
      <p>Valido fino al: ${data.quote_valid_until}</p>
    </div>`;
  }

  private buildFallbackContractHtml(data: Record<string, string>): string {
    return `<div style="font-family:Arial,sans-serif;max-width:800px;margin:auto;padding:40px;">
      <h1 style="color:#065f46;">CONTRATTO N. ${data.contract_number}</h1>
      <p>Data: ${data.contract_date}</p>
      <p><strong>Cliente:</strong> ${data.company_name}</p>
      <h3>Oggetto</h3>${data.scope_of_work}
      <p><strong>Valore: ${data.total_value}</strong></p>
    </div>`;
  }

  private wrapInPrintPage(bodyHtml: string, title: string): string {
    return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 0; background: #f3f4f6; font-family: Arial, sans-serif; }
    .print-bar {
      position: fixed; top: 0; left: 0; right: 0; z-index: 100;
      background: #1e40af; color: white; padding: 10px 20px;
      display: flex; align-items: center; justify-content: space-between;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    }
    .print-bar h2 { margin: 0; font-size: 1rem; }
    .print-bar button {
      background: white; color: #1e40af; border: none; padding: 8px 20px;
      border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 0.875rem;
    }
    .print-bar button:hover { background: #eff6ff; }
    .page-wrapper { padding-top: 60px; padding-bottom: 40px; }
    .document-card {
      background: white; max-width: 860px; margin: 20px auto;
      box-shadow: 0 4px 24px rgba(0,0,0,0.10); border-radius: 8px; overflow: hidden;
    }
    @media print {
      .print-bar { display: none !important; }
      body { background: white; }
      .page-wrapper { padding-top: 0; }
      .document-card { box-shadow: none; margin: 0; border-radius: 0; }
    }
  </style>
</head>
<body>
  <div class="print-bar">
    <h2>${title}</h2>
    <button onclick="window.print()">Stampa / Salva PDF</button>
  </div>
  <div class="page-wrapper">
    <div class="document-card">
      ${bodyHtml}
    </div>
  </div>
</body>
</html>`;
  }

  async generateQuotePdf(quote: any, items: any[], company: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const buffers: Buffer[] = [];

        doc.on('data', (chunk: Buffer) => buffers.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);

        const pageWidth = doc.page.width - 100;

        // ─── Header ──────────────────────────────────────────────────────────
        doc.fontSize(24).font('Helvetica-Bold').fillColor('#1e40af').text('PREVENTIVO', 50, 50);
        doc.fontSize(12).font('Helvetica').fillColor('#374151');
        doc.text(`N. ${quote.quoteNumber || '—'}`, { align: 'right' });
        const quoteDate = quote.createdAt ? new Date(quote.createdAt).toLocaleDateString('it-IT') : new Date().toLocaleDateString('it-IT');
        doc.text(`Data: ${quoteDate}`, { align: 'right' });
        if (quote.validUntil) {
          doc.text(`Valido fino al: ${new Date(quote.validUntil).toLocaleDateString('it-IT')}`, { align: 'right' });
        }

        doc.moveTo(50, 120).lineTo(545, 120).strokeColor('#e5e7eb').stroke();

        // ─── Company Info ─────────────────────────────────────────────────────
        doc.fontSize(11).font('Helvetica-Bold').fillColor('#111827').text('Emittente', 50, 135);
        doc.fontSize(10).font('Helvetica').fillColor('#374151');
        if (company?.name) doc.text(company.name, 50, 150);
        if (company?.vatNumber) doc.text(`P.IVA: ${company.vatNumber}`);
        if (company?.address) doc.text(company.address);
        if (company?.city) doc.text(`${company.city}${company.country ? ', ' + company.country : ''}`);
        if (company?.email) doc.text(`Email: ${company.email}`);
        if (company?.phone) doc.text(`Tel: ${company.phone}`);

        // ─── Quote Subject ────────────────────────────────────────────────────
        const afterCompany = doc.y + 20;
        doc.moveTo(50, afterCompany).lineTo(545, afterCompany).strokeColor('#e5e7eb').stroke();

        if (quote.title) {
          doc.fontSize(13).font('Helvetica-Bold').fillColor('#111827').text(`Oggetto: ${quote.title}`, 50, afterCompany + 10);
        }
        if (quote.description) {
          doc.fontSize(10).font('Helvetica').fillColor('#6b7280').text(quote.description, 50, doc.y + 5, { width: pageWidth });
        }

        // ─── Items Table ──────────────────────────────────────────────────────
        const tableTop = doc.y + 20;
        doc.moveTo(50, tableTop).lineTo(545, tableTop).strokeColor('#e5e7eb').stroke();

        doc.fontSize(10).font('Helvetica-Bold').fillColor('#374151');
        doc.text('Descrizione', 50, tableTop + 8, { width: 250 });
        doc.text('Qtà', 310, tableTop + 8, { width: 50, align: 'right' });
        doc.text('Prezzo Unit.', 370, tableTop + 8, { width: 80, align: 'right' });
        doc.text('Sconto', 455, tableTop + 8, { width: 40, align: 'right' });
        doc.text('Totale', 500, tableTop + 8, { width: 45, align: 'right' });

        doc.moveTo(50, tableTop + 25).lineTo(545, tableTop + 25).strokeColor('#d1d5db').stroke();

        let rowY = tableTop + 32;
        let subtotalCents = 0;

        for (const item of items) {
          if (rowY > 680) {
            doc.addPage();
            rowY = 50;
          }

          const qty = Number(item.quantity ?? 1);
          const unitCents = Number(item.unitPriceCents ?? 0);
          const discount = Number(item.discountPercent ?? 0);
          const totalCents = Number(item.totalCents ?? Math.round(qty * unitCents * (1 - discount / 100)));
          subtotalCents += totalCents;

          const unitPrice = (unitCents / 100).toFixed(2);
          const total = (totalCents / 100).toFixed(2);

          doc.fontSize(9).font('Helvetica').fillColor('#111827');
          doc.text(item.description || item.name || '—', 50, rowY, { width: 255 });
          const textHeight = doc.heightOfString(item.description || item.name || '—', { width: 255 });
          doc.text(String(qty), 310, rowY, { width: 50, align: 'right' });
          doc.text(`€ ${unitPrice}`, 370, rowY, { width: 80, align: 'right' });
          doc.text(discount > 0 ? `${discount}%` : '—', 455, rowY, { width: 40, align: 'right' });
          doc.text(`€ ${total}`, 500, rowY, { width: 45, align: 'right' });

          rowY += Math.max(textHeight, 15) + 8;
          doc.moveTo(50, rowY - 4).lineTo(545, rowY - 4).strokeColor('#f3f4f6').stroke();
        }

        // ─── Totals ───────────────────────────────────────────────────────────
        const taxRate = quote.taxRate ?? 22;
        const taxCents = Math.round(subtotalCents * taxRate / 100);
        const grandTotalCents = subtotalCents + taxCents;

        doc.moveTo(350, rowY + 4).lineTo(545, rowY + 4).strokeColor('#d1d5db').stroke();

        doc.fontSize(10).font('Helvetica').fillColor('#374151');
        doc.text('Imponibile:', 350, rowY + 12, { width: 145, align: 'right' });
        doc.text(`€ ${(subtotalCents / 100).toFixed(2)}`, 350, rowY + 12, { width: 145, align: 'right' });

        doc.text(`IVA ${taxRate}%:`, 350, rowY + 28, { width: 145, align: 'right' });
        doc.text(`€ ${(taxCents / 100).toFixed(2)}`, 350, rowY + 28, { width: 145, align: 'right' });

        doc.moveTo(350, rowY + 44).lineTo(545, rowY + 44).strokeColor('#374151').stroke();
        doc.fontSize(12).font('Helvetica-Bold').fillColor('#111827');
        doc.text('TOTALE:', 350, rowY + 50, { width: 145, align: 'right' });
        doc.text(`€ ${(grandTotalCents / 100).toFixed(2)}`, 350, rowY + 50, { width: 145, align: 'right' });

        // ─── Footer / Terms ───────────────────────────────────────────────────
        const footerY = Math.max(rowY + 110, 700);
        doc.moveTo(50, footerY).lineTo(545, footerY).strokeColor('#e5e7eb').stroke();
        doc.fontSize(9).font('Helvetica').fillColor('#9ca3af');
        doc.text('Termini e condizioni: Il presente preventivo è valido per 30 giorni dalla data di emissione.', 50, footerY + 10, { width: pageWidth });
        doc.text('Il pagamento dovrà essere effettuato secondo le modalità concordate al momento dell\'accettazione.', 50, doc.y + 3, { width: pageWidth });

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  async renderInvoiceHtml(invoice: any, items: any[], company: any, schedules?: any[]): Promise<string> {
    const fmt = (cents: number) =>
      new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(cents / 100);

    let subtotalCents = 0;
    const itemRows = items
      .map((item: any) => {
        const qty = Number(item.quantity ?? 1);
        const unitCents = Number(item.unitPriceCents ?? 0);
        const taxRate = Number(item.taxRate ?? 22);
        const totalCents = Number(item.totalCents ?? Math.round(qty * unitCents * (1 + taxRate / 100)));
        subtotalCents += Math.round(qty * unitCents);
        return `<tr>
          <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;font-size:0.875rem;">${item.description || '—'}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;text-align:right;font-size:0.875rem;">${qty}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;text-align:right;font-size:0.875rem;">${fmt(unitCents)}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;text-align:right;font-size:0.875rem;">${taxRate}%</td>
          <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;text-align:right;font-size:0.875rem;font-weight:600;">${fmt(totalCents)}</td>
        </tr>`;
      })
      .join('');

    const taxCents = Number(invoice.taxCents ?? Math.round(subtotalCents * 0.22));
    const grandTotalCents = Number(invoice.totalCents ?? subtotalCents + taxCents);

    const invoiceDate = invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString('it-IT') : new Date().toLocaleDateString('it-IT');
    const dueDate = invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('it-IT') : '—';

    let scheduleHtml = '';
    if (schedules && schedules.length > 0) {
      const scheduleRows = schedules.map((s: any) => `<tr>
        <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;font-size:0.875rem;">Rata ${s.installmentNumber}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;text-align:right;font-size:0.875rem;">${new Date(s.dueDate).toLocaleDateString('it-IT')}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;text-align:right;font-size:0.875rem;">${fmt(Number(s.amountCents))}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;text-align:center;font-size:0.875rem;">${s.status === 'paid' ? 'Pagata' : s.status === 'overdue' ? 'Scaduta' : 'In attesa'}</td>
      </tr>`).join('');

      scheduleHtml = `<h3 style="margin-top:30px;color:#374151;">Piano di Pagamento</h3>
      <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
        <thead><tr style="background:#f8fafc;">
          <th style="padding:8px 12px;text-align:left;font-size:0.8rem;color:#6b7280;">Rata</th>
          <th style="padding:8px 12px;text-align:right;font-size:0.8rem;color:#6b7280;">Scadenza</th>
          <th style="padding:8px 12px;text-align:right;font-size:0.8rem;color:#6b7280;">Importo</th>
          <th style="padding:8px 12px;text-align:center;font-size:0.8rem;color:#6b7280;">Stato</th>
        </tr></thead>
        <tbody>${scheduleRows}</tbody>
      </table>`;
    }

    const html = `<div style="font-family:Arial,sans-serif;max-width:800px;margin:auto;padding:40px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;">
        <div>
          <h1 style="color:#1e40af;margin:0;">FATTURA</h1>
          <p style="font-size:1.2rem;color:#374151;margin:4px 0;">N. ${invoice.invoiceNumber ?? '—'}</p>
          <p style="font-size:0.875rem;color:#6b7280;">Tipo: ${invoice.type === 'proforma' ? 'Proforma' : invoice.type === 'credit_note' ? 'Nota di credito' : 'Fattura'}</p>
        </div>
        <div style="text-align:right;">
          <p style="font-size:0.875rem;color:#6b7280;">Data: ${invoiceDate}</p>
          <p style="font-size:0.875rem;color:#6b7280;">Scadenza: ${dueDate}</p>
          <p style="font-size:0.875rem;padding:4px 12px;border-radius:12px;display:inline-block;${invoice.status === 'paid' ? 'background:#dcfce7;color:#166534;' : invoice.status === 'overdue' ? 'background:#fee2e2;color:#991b1b;' : 'background:#dbeafe;color:#1e40af;'}">${invoice.status?.toUpperCase() ?? 'DRAFT'}</p>
        </div>
      </div>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;">
      <div style="display:flex;gap:40px;">
        <div>
          <p style="font-size:0.75rem;color:#9ca3af;text-transform:uppercase;">Emittente</p>
          <p style="font-weight:600;">Connecteed</p>
        </div>
        <div>
          <p style="font-size:0.75rem;color:#9ca3af;text-transform:uppercase;">Cliente</p>
          <p style="font-weight:600;">${company?.name ?? '—'}</p>
          ${company?.vatNumber ? `<p style="font-size:0.875rem;color:#6b7280;">P.IVA: ${company.vatNumber}</p>` : ''}
          ${company?.address ? `<p style="font-size:0.875rem;color:#6b7280;">${company.address}${company.city ? ', ' + company.city : ''}</p>` : ''}
        </div>
      </div>
      <h3 style="margin-top:30px;color:#374151;">Dettaglio</h3>
      <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
        <thead><tr style="background:#f8fafc;">
          <th style="padding:10px 12px;text-align:left;font-size:0.8rem;color:#6b7280;font-weight:600;">Descrizione</th>
          <th style="padding:10px 12px;text-align:right;font-size:0.8rem;color:#6b7280;font-weight:600;">Qtà</th>
          <th style="padding:10px 12px;text-align:right;font-size:0.8rem;color:#6b7280;font-weight:600;">Prezzo Unit.</th>
          <th style="padding:10px 12px;text-align:right;font-size:0.8rem;color:#6b7280;font-weight:600;">IVA</th>
          <th style="padding:10px 12px;text-align:right;font-size:0.8rem;color:#6b7280;font-weight:600;">Totale</th>
        </tr></thead>
        <tbody>${itemRows}</tbody>
      </table>
      <div style="text-align:right;margin-top:20px;">
        <p>Imponibile: ${fmt(subtotalCents)}</p>
        <p>IVA: ${fmt(taxCents)}</p>
        <p style="font-size:1.2rem;font-weight:700;">Totale: ${fmt(grandTotalCents)}</p>
      </div>
      ${scheduleHtml}
      ${invoice.notes ? `<div style="margin-top:20px;padding:12px;background:#f9fafb;border-radius:8px;"><p style="font-size:0.75rem;color:#9ca3af;">Note</p><p style="font-size:0.875rem;">${invoice.notes}</p></div>` : ''}
    </div>`;

    return this.wrapInPrintPage(html, `Fattura ${invoice.invoiceNumber ?? ''}`);
  }

  async generateInvoicePdf(invoice: any, items: any[], company: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const buffers: Buffer[] = [];

        doc.on('data', (chunk: Buffer) => buffers.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);

        // Header
        doc.fontSize(24).font('Helvetica-Bold').fillColor('#1e40af').text('FATTURA', 50, 50);
        doc.fontSize(12).font('Helvetica').fillColor('#374151');
        doc.text(`N. ${invoice.invoiceNumber || '—'}`, { align: 'right' });
        const invoiceDate = invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString('it-IT') : new Date().toLocaleDateString('it-IT');
        doc.text(`Data: ${invoiceDate}`, { align: 'right' });
        if (invoice.dueDate) {
          doc.text(`Scadenza: ${new Date(invoice.dueDate).toLocaleDateString('it-IT')}`, { align: 'right' });
        }
        doc.text(`Tipo: ${invoice.type === 'proforma' ? 'Proforma' : 'Fattura'}`, { align: 'right' });

        doc.moveTo(50, 130).lineTo(545, 130).strokeColor('#e5e7eb').stroke();

        // Company info
        doc.fontSize(11).font('Helvetica-Bold').fillColor('#111827').text('Cliente', 50, 145);
        doc.fontSize(10).font('Helvetica').fillColor('#374151');
        if (company?.name) doc.text(company.name);
        if (company?.vatNumber) doc.text(`P.IVA: ${company.vatNumber}`);
        if (company?.address) doc.text(company.address);

        // Items
        const tableTop = doc.y + 20;
        doc.moveTo(50, tableTop).lineTo(545, tableTop).strokeColor('#e5e7eb').stroke();
        doc.fontSize(10).font('Helvetica-Bold').fillColor('#374151');
        doc.text('Descrizione', 50, tableTop + 8, { width: 250 });
        doc.text('Qtà', 310, tableTop + 8, { width: 50, align: 'right' });
        doc.text('Prezzo', 370, tableTop + 8, { width: 80, align: 'right' });
        doc.text('IVA', 455, tableTop + 8, { width: 40, align: 'right' });
        doc.text('Totale', 500, tableTop + 8, { width: 45, align: 'right' });
        doc.moveTo(50, tableTop + 25).lineTo(545, tableTop + 25).strokeColor('#d1d5db').stroke();

        let rowY = tableTop + 32;
        let subtotalCents = 0;

        for (const item of items) {
          if (rowY > 680) { doc.addPage(); rowY = 50; }
          const qty = Number(item.quantity ?? 1);
          const unitCents = Number(item.unitPriceCents ?? 0);
          const taxRate = Number(item.taxRate ?? 22);
          const lineTotalCents = Math.round(qty * unitCents * (1 + taxRate / 100));
          subtotalCents += Math.round(qty * unitCents);

          doc.fontSize(9).font('Helvetica').fillColor('#111827');
          doc.text(item.description || '—', 50, rowY, { width: 255 });
          doc.text(String(qty), 310, rowY, { width: 50, align: 'right' });
          doc.text(`€ ${(unitCents / 100).toFixed(2)}`, 370, rowY, { width: 80, align: 'right' });
          doc.text(`${taxRate}%`, 455, rowY, { width: 40, align: 'right' });
          doc.text(`€ ${(lineTotalCents / 100).toFixed(2)}`, 500, rowY, { width: 45, align: 'right' });
          rowY += 20;
        }

        // Totals
        const taxCents = Number(invoice.taxCents ?? Math.round(subtotalCents * 0.22));
        const grandTotalCents = Number(invoice.totalCents ?? subtotalCents + taxCents);

        doc.moveTo(350, rowY + 4).lineTo(545, rowY + 4).strokeColor('#d1d5db').stroke();
        doc.fontSize(10).font('Helvetica').fillColor('#374151');
        doc.text(`Imponibile: € ${(subtotalCents / 100).toFixed(2)}`, 350, rowY + 12, { width: 195, align: 'right' });
        doc.text(`IVA: € ${(taxCents / 100).toFixed(2)}`, 350, rowY + 28, { width: 195, align: 'right' });
        doc.moveTo(350, rowY + 44).lineTo(545, rowY + 44).strokeColor('#374151').stroke();
        doc.fontSize(12).font('Helvetica-Bold').fillColor('#111827');
        doc.text(`TOTALE: € ${(grandTotalCents / 100).toFixed(2)}`, 350, rowY + 50, { width: 195, align: 'right' });

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  async generateContractPdf(contract: any, quote: any, company: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const buffers: Buffer[] = [];

        doc.on('data', (chunk: Buffer) => buffers.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);

        const pageWidth = doc.page.width - 100;

        // ─── Header ──────────────────────────────────────────────────────────
        doc.fontSize(24).font('Helvetica-Bold').fillColor('#065f46').text('CONTRATTO', 50, 50);
        doc.fontSize(12).font('Helvetica').fillColor('#374151');
        doc.text(`N. ${contract.contractNumber || '—'}`, { align: 'right' });
        const contractDate = contract.createdAt ? new Date(contract.createdAt).toLocaleDateString('it-IT') : new Date().toLocaleDateString('it-IT');
        doc.text(`Data: ${contractDate}`, { align: 'right' });

        doc.moveTo(50, 115).lineTo(545, 115).strokeColor('#e5e7eb').stroke();

        // ─── Parties ─────────────────────────────────────────────────────────
        doc.fontSize(13).font('Helvetica-Bold').fillColor('#111827').text('PARTI CONTRAENTI', 50, 130);
        doc.moveTo(50, 148).lineTo(545, 148).strokeColor('#d1d5db').stroke();

        doc.fontSize(11).font('Helvetica-Bold').fillColor('#065f46').text('Fornitore (Venditore)', 50, 158);
        doc.fontSize(10).font('Helvetica').fillColor('#374151');
        if (company?.name) doc.text(company.name, 50, 173);
        if (company?.vatNumber) doc.text(`P.IVA: ${company.vatNumber}`);
        if (company?.address) doc.text(company.address);
        if (company?.city) doc.text(company.city);

        const buyerY = 158;
        doc.fontSize(11).font('Helvetica-Bold').fillColor('#1e40af').text('Cliente (Acquirente)', 300, buyerY);
        doc.fontSize(10).font('Helvetica').fillColor('#374151');
        if (contract.companyName || contract.clientName) {
          doc.text(contract.companyName || contract.clientName, 300, buyerY + 15);
        }
        if (contract.clientVat) doc.text(`P.IVA: ${contract.clientVat}`, 300, doc.y);

        // ─── Scope of Work ────────────────────────────────────────────────────
        const scopeY = doc.y + 25;
        doc.moveTo(50, scopeY).lineTo(545, scopeY).strokeColor('#e5e7eb').stroke();
        doc.fontSize(13).font('Helvetica-Bold').fillColor('#111827').text('OGGETTO DEL CONTRATTO', 50, scopeY + 10);
        doc.moveTo(50, scopeY + 28).lineTo(545, scopeY + 28).strokeColor('#d1d5db').stroke();

        if (contract.title || quote?.title) {
          doc.fontSize(11).font('Helvetica-Bold').fillColor('#374151').text(contract.title || quote.title, 50, scopeY + 38);
        }
        if (contract.description || quote?.description) {
          doc.fontSize(10).font('Helvetica').fillColor('#6b7280')
            .text(contract.description || quote.description, 50, doc.y + 5, { width: pageWidth });
        }

        // Quote items as scope
        const quoteItems = quote?.items ?? [];
        if (quoteItems.length > 0) {
          doc.fontSize(11).font('Helvetica-Bold').fillColor('#374151').text('Prestazioni incluse:', 50, doc.y + 15);
          doc.fontSize(10).font('Helvetica').fillColor('#374151');
          for (const item of quoteItems) {
            doc.text(`• ${item.description || item.name || '—'}`, 60, doc.y + 5, { width: pageWidth - 10 });
          }
        }

        // ─── Value ────────────────────────────────────────────────────────────
        const valueY = doc.y + 20;
        doc.moveTo(50, valueY).lineTo(545, valueY).strokeColor('#e5e7eb').stroke();
        doc.fontSize(13).font('Helvetica-Bold').fillColor('#111827').text('VALORE CONTRATTUALE', 50, valueY + 10);

        const totalCents = contract.totalCents ?? quote?.totalCents ?? 0;
        const taxRate = quote?.taxRate ?? 22;
        const taxCents = Math.round(totalCents * taxRate / 100);
        const grandTotal = totalCents + taxCents;

        doc.fontSize(10).font('Helvetica').fillColor('#374151');
        doc.text(`Imponibile: € ${(totalCents / 100).toFixed(2)}`, 50, valueY + 30);
        doc.text(`IVA ${taxRate}%: € ${(taxCents / 100).toFixed(2)}`);
        doc.fontSize(12).font('Helvetica-Bold').fillColor('#065f46');
        doc.text(`Valore totale contratto: € ${(grandTotal / 100).toFixed(2)}`, 50, doc.y + 5);

        // Payment terms
        if (contract.paymentTerms) {
          doc.fontSize(10).font('Helvetica').fillColor('#374151').text(`Modalità di pagamento: ${contract.paymentTerms}`, 50, doc.y + 8);
        }

        // ─── Signature Lines ──────────────────────────────────────────────────
        const sigY = Math.max(doc.y + 50, 680);
        doc.moveTo(50, sigY).lineTo(545, sigY).strokeColor('#e5e7eb').stroke();
        doc.fontSize(11).font('Helvetica-Bold').fillColor('#374151').text('FIRME', 50, sigY + 10);

        doc.fontSize(10).font('Helvetica').fillColor('#374151');
        // Seller signature
        doc.text('Per il Fornitore:', 50, sigY + 30);
        doc.moveTo(50, sigY + 70).lineTo(220, sigY + 70).strokeColor('#374151').stroke();
        doc.fontSize(8).fillColor('#9ca3af').text('Data e Firma', 50, sigY + 73);

        // Buyer signature
        doc.fontSize(10).font('Helvetica').fillColor('#374151').text('Per il Cliente:', 300, sigY + 30);
        doc.moveTo(300, sigY + 70).lineTo(545, sigY + 70).strokeColor('#374151').stroke();
        doc.fontSize(8).fillColor('#9ca3af').text('Data e Firma', 300, sigY + 73);

        // ─── Footer ───────────────────────────────────────────────────────────
        doc.fontSize(8).fillColor('#9ca3af').text(
          `Contratto generato il ${new Date().toLocaleDateString('it-IT')} — ${company?.name ?? ''}`,
          50, 790, { width: pageWidth, align: 'center' }
        );

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}
