import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocumentTemplate, DocumentTemplateType } from './document-template.entity';

export const QUOTE_VARIABLES: { name: string; description: string }[] = [
  { name: 'company_name', description: 'Nome azienda cliente' },
  { name: 'company_vat', description: 'P.IVA azienda cliente' },
  { name: 'company_address', description: 'Indirizzo azienda cliente' },
  { name: 'company_email', description: 'Email azienda cliente' },
  { name: 'company_phone', description: 'Telefono azienda cliente' },
  { name: 'contact_name', description: 'Nome contatto referente' },
  { name: 'contact_email', description: 'Email contatto referente' },
  { name: 'contact_phone', description: 'Telefono contatto referente' },
  { name: 'contact_role', description: 'Ruolo contatto referente' },
  { name: 'quote_number', description: 'Numero preventivo' },
  { name: 'quote_date', description: 'Data preventivo' },
  { name: 'quote_valid_until', description: 'Validità preventivo' },
  { name: 'items_table', description: 'Tabella voci del preventivo (HTML auto-generato)' },
  { name: 'total_amount', description: 'Importo totale (IVA inclusa)' },
  { name: 'subtotal', description: 'Imponibile' },
  { name: 'tax_amount', description: 'Importo IVA' },
  { name: 'notes', description: 'Note del preventivo' },
  { name: 'terms', description: 'Termini e condizioni' },
  { name: 'sender_company', description: 'Nome azienda mittente (Connecteed)' },
];

export const CONTRACT_VARIABLES: { name: string; description: string }[] = [
  { name: 'company_name', description: 'Nome azienda cliente' },
  { name: 'company_vat', description: 'P.IVA azienda cliente' },
  { name: 'company_address', description: 'Indirizzo azienda cliente' },
  { name: 'company_email', description: 'Email azienda cliente' },
  { name: 'company_phone', description: 'Telefono azienda cliente' },
  { name: 'contact_name', description: 'Nome contatto referente' },
  { name: 'contact_email', description: 'Email contatto referente' },
  { name: 'contact_phone', description: 'Telefono contatto referente' },
  { name: 'contact_role', description: 'Ruolo contatto referente' },
  { name: 'contract_number', description: 'Numero contratto' },
  { name: 'contract_date', description: 'Data contratto' },
  { name: 'scope_of_work', description: 'Descrizione delle prestazioni (da preventivo)' },
  { name: 'total_value', description: 'Valore totale contratto' },
  { name: 'signature_client', description: 'Linea firma cliente' },
  { name: 'signature_provider', description: 'Linea firma fornitore' },
  { name: 'sender_company', description: 'Nome azienda fornitore (Connecteed)' },
  { name: 'notes', description: 'Note contrattuali' },
  { name: 'terms', description: 'Termini e condizioni' },
];

const DEFAULT_QUOTE_HTML = `<div style="font-family: Arial, sans-serif; max-width: 800px; margin: auto; padding: 40px; color: #1f2937;">
  <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; padding-bottom: 24px; border-bottom: 2px solid #e5e7eb;">
    <div>
      <p style="color: #6b7280; font-size: 0.875rem; margin: 0;">Emesso da</p>
      <p style="font-size: 1.1rem; font-weight: 700; margin: 4px 0 0;">{{sender_company}}</p>
    </div>
    <div style="text-align: right;">
      <h1 style="color: #1e40af; margin: 0; font-size: 2rem; letter-spacing: 2px;">PREVENTIVO</h1>
      <p style="color: #6b7280; margin: 4px 0 0; font-size: 0.9rem;">N. <strong>{{quote_number}}</strong></p>
      <p style="color: #6b7280; margin: 2px 0 0; font-size: 0.9rem;">Data: {{quote_date}}</p>
    </div>
  </div>

  <div style="display: flex; justify-content: space-between; margin-bottom: 40px; gap: 40px;">
    <div style="flex: 1;">
      <h3 style="color: #6b7280; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 12px;">Destinatario</h3>
      <p style="font-weight: 700; font-size: 1.1rem; margin: 0 0 4px;">{{company_name}}</p>
      <p style="color: #4b5563; margin: 2px 0; font-size: 0.9rem;">{{company_address}}</p>
      <p style="color: #4b5563; margin: 2px 0; font-size: 0.9rem;">P.IVA: {{company_vat}}</p>
      <p style="color: #4b5563; margin: 8px 0 2px; font-size: 0.9rem;"><strong>Att.ne:</strong> {{contact_name}}</p>
      <p style="color: #4b5563; margin: 2px 0; font-size: 0.9rem;">{{contact_role}}</p>
      <p style="color: #4b5563; margin: 2px 0; font-size: 0.9rem;">{{contact_email}}</p>
    </div>
  </div>

  {{items_table}}

  <div style="display: flex; justify-content: flex-end; margin-top: 24px;">
    <div style="background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; min-width: 280px;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 0.9rem; color: #6b7280;">
        <span>Imponibile</span><span><strong>{{subtotal}}</strong></span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 16px; font-size: 0.9rem; color: #6b7280;">
        <span>IVA</span><span><strong>{{tax_amount}}</strong></span>
      </div>
      <div style="display: flex; justify-content: space-between; padding-top: 16px; border-top: 2px solid #e5e7eb;">
        <span style="font-weight: 700; font-size: 1rem;">Totale</span>
        <span style="font-weight: 700; font-size: 1.2rem; color: #1e40af;">{{total_amount}}</span>
      </div>
    </div>
  </div>

  <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
    <div style="margin-bottom: 20px;">
      <h3 style="color: #374151; font-size: 0.95rem; margin: 0 0 8px;">Note</h3>
      <p style="color: #6b7280; font-size: 0.875rem; line-height: 1.6; margin: 0;">{{notes}}</p>
    </div>
    <div style="margin-bottom: 20px;">
      <h3 style="color: #374151; font-size: 0.95rem; margin: 0 0 8px;">Termini e Condizioni</h3>
      <p style="color: #6b7280; font-size: 0.875rem; line-height: 1.6; margin: 0;">{{terms}}</p>
    </div>
    <p style="color: #9ca3af; font-size: 0.8rem; margin: 0;">Valido fino al: <strong>{{quote_valid_until}}</strong></p>
  </div>
</div>`;

const DEFAULT_CONTRACT_HTML = `<div style="font-family: Arial, sans-serif; max-width: 800px; margin: auto; padding: 40px; color: #1f2937;">
  <div style="text-align: center; margin-bottom: 40px; padding-bottom: 24px; border-bottom: 2px solid #e5e7eb;">
    <h1 style="color: #065f46; margin: 0; font-size: 2rem; letter-spacing: 3px;">CONTRATTO DI SERVIZI</h1>
    <p style="color: #6b7280; margin: 8px 0 0; font-size: 0.9rem;">N. <strong>{{contract_number}}</strong> &mdash; Data: {{contract_date}}</p>
  </div>

  <div style="margin-bottom: 32px; padding: 20px; background: #f0fdf4; border-radius: 12px; border: 1px solid #bbf7d0;">
    <h2 style="color: #065f46; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 16px;">Parti Contraenti</h2>
    <div style="display: flex; gap: 40px;">
      <div style="flex: 1;">
        <p style="font-size: 0.75rem; color: #6b7280; text-transform: uppercase; margin: 0 0 6px;">Fornitore</p>
        <p style="font-weight: 700; margin: 0 0 4px;">{{sender_company}}</p>
      </div>
      <div style="flex: 1;">
        <p style="font-size: 0.75rem; color: #6b7280; text-transform: uppercase; margin: 0 0 6px;">Cliente</p>
        <p style="font-weight: 700; margin: 0 0 4px;">{{company_name}}</p>
        <p style="color: #4b5563; margin: 2px 0; font-size: 0.875rem;">P.IVA: {{company_vat}}</p>
        <p style="color: #4b5563; margin: 2px 0; font-size: 0.875rem;">{{company_address}}</p>
        <p style="color: #4b5563; margin: 2px 0; font-size: 0.875rem;">Referente: {{contact_name}} ({{contact_role}})</p>
      </div>
    </div>
  </div>

  <div style="margin-bottom: 32px;">
    <h2 style="color: #374151; font-size: 1rem; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; margin: 0 0 16px;">Oggetto del Contratto</h2>
    <div style="background: #f9fafb; border-radius: 8px; padding: 16px; font-size: 0.9rem; color: #4b5563; line-height: 1.7;">
      {{scope_of_work}}
    </div>
  </div>

  <div style="margin-bottom: 32px;">
    <h2 style="color: #374151; font-size: 1rem; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; margin: 0 0 16px;">Valore Contrattuale</h2>
    <div style="background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; display: inline-block; min-width: 240px;">
      <p style="font-size: 1.3rem; font-weight: 700; color: #065f46; margin: 0;">{{total_value}}</p>
      <p style="font-size: 0.8rem; color: #9ca3af; margin: 4px 0 0;">Valore totale IVA inclusa</p>
    </div>
  </div>

  <div style="margin-bottom: 32px;">
    <h2 style="color: #374151; font-size: 1rem; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; margin: 0 0 16px;">Note e Condizioni</h2>
    <p style="color: #6b7280; font-size: 0.875rem; line-height: 1.6; margin: 0 0 16px;">{{notes}}</p>
    <p style="color: #6b7280; font-size: 0.875rem; line-height: 1.6; margin: 0;">{{terms}}</p>
  </div>

  <div style="margin-top: 60px; padding-top: 24px; border-top: 2px solid #e5e7eb;">
    <h2 style="color: #374151; font-size: 1rem; margin: 0 0 40px;">Firme</h2>
    <div style="display: flex; justify-content: space-between; gap: 40px;">
      <div style="flex: 1;">
        <p style="font-size: 0.875rem; color: #6b7280; margin: 0 0 8px;">Per il Fornitore:</p>
        <div style="border-bottom: 1px solid #374151; height: 40px; margin-bottom: 8px;"></div>
        {{signature_provider}}
        <p style="font-size: 0.75rem; color: #9ca3af; margin: 4px 0 0;">Data e Firma</p>
      </div>
      <div style="flex: 1;">
        <p style="font-size: 0.875rem; color: #6b7280; margin: 0 0 8px;">Per il Cliente:</p>
        <div style="border-bottom: 1px solid #374151; height: 40px; margin-bottom: 8px;"></div>
        {{signature_client}}
        <p style="font-size: 0.75rem; color: #9ca3af; margin: 4px 0 0;">Data e Firma</p>
      </div>
    </div>
  </div>
</div>`;

@Injectable()
export class TemplatesService {
  constructor(
    @InjectRepository(DocumentTemplate)
    private readonly repo: Repository<DocumentTemplate>,
  ) {}

  async findAll(tenantId: string, type?: DocumentTemplateType): Promise<DocumentTemplate[]> {
    const where: Record<string, unknown> = { tenantId };
    if (type) where.type = type;
    return this.repo.find({ where, order: { createdAt: 'DESC' } });
  }

  async findById(tenantId: string, id: string): Promise<DocumentTemplate> {
    const t = await this.repo.findOne({ where: { tenantId, id } });
    if (!t) throw new NotFoundException('Template non trovato');
    return t;
  }

  async findDefault(tenantId: string, type: DocumentTemplateType): Promise<DocumentTemplate | null> {
    return this.repo.findOne({ where: { tenantId, type, isDefault: true } });
  }

  async create(tenantId: string, dto: Partial<DocumentTemplate>): Promise<DocumentTemplate> {
    const template = this.repo.create({ ...dto, tenantId });
    return this.repo.save(template);
  }

  async update(tenantId: string, id: string, dto: Partial<DocumentTemplate>): Promise<DocumentTemplate> {
    const t = await this.findById(tenantId, id);
    Object.assign(t, dto);
    return this.repo.save(t);
  }

  async remove(tenantId: string, id: string): Promise<void> {
    const t = await this.findById(tenantId, id);
    await this.repo.remove(t);
  }

  async setAsDefault(tenantId: string, id: string): Promise<DocumentTemplate> {
    const t = await this.findById(tenantId, id);
    // Unset all other defaults of this type
    await this.repo.update(
      { tenantId, type: t.type, isDefault: true },
      { isDefault: false },
    );
    t.isDefault = true;
    return this.repo.save(t);
  }

  renderTemplate(html: string, data: Record<string, string>): string {
    let rendered = html;
    for (const [key, value] of Object.entries(data)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      rendered = rendered.replace(regex, value ?? '');
    }
    // Replace any leftover unreplaced variables with empty string
    rendered = rendered.replace(/\{\{[a-z_]+\}\}/g, '');
    return rendered;
  }

  async renderTemplateForTenant(
    tenantId: string,
    type: DocumentTemplateType,
    data: Record<string, string>,
  ): Promise<string> {
    const template = await this.findDefault(tenantId, type);
    if (!template) {
      return '<p>Nessun template predefinito configurato.</p>';
    }
    return this.renderTemplate(template.htmlContent, data);
  }

  getAvailableVariables(type: DocumentTemplateType): { name: string; description: string }[] {
    if (type === DocumentTemplateType.QUOTE) return QUOTE_VARIABLES;
    if (type === DocumentTemplateType.CONTRACT) return CONTRACT_VARIABLES;
    return [];
  }

  async previewTemplate(
    tenantId: string,
    templateId: string,
    sampleData?: Record<string, string>,
  ): Promise<string> {
    const template = await this.findById(tenantId, templateId);
    const vars = this.getAvailableVariables(template.type);

    // Build default sample data
    const defaults: Record<string, string> = {};
    for (const v of vars) {
      defaults[v.name] = `[${v.name}]`;
    }

    // Override with provided sample data
    const mergedData = { ...defaults, ...(sampleData ?? {}) };
    return this.renderTemplate(template.htmlContent, mergedData);
  }

  // Ensure default templates exist for a tenant (call on first use)
  async ensureDefaults(tenantId: string): Promise<void> {
    const quoteDefault = await this.findDefault(tenantId, DocumentTemplateType.QUOTE);
    if (!quoteDefault) {
      await this.repo.save(
        this.repo.create({
          tenantId,
          type: DocumentTemplateType.QUOTE,
          name: 'Preventivo Standard',
          htmlContent: DEFAULT_QUOTE_HTML,
          isDefault: true,
          variables: QUOTE_VARIABLES,
        }),
      );
    }

    const contractDefault = await this.findDefault(tenantId, DocumentTemplateType.CONTRACT);
    if (!contractDefault) {
      await this.repo.save(
        this.repo.create({
          tenantId,
          type: DocumentTemplateType.CONTRACT,
          name: 'Contratto Servizi Standard',
          htmlContent: DEFAULT_CONTRACT_HTML,
          isDefault: true,
          variables: CONTRACT_VARIABLES,
        }),
      );
    }
  }
}
