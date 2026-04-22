import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

const TEMPLATES: Record<string, { subject: string; html: string }> = {
  quote_sent: {
    subject: 'Nuovo preventivo disponibile',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1e40af;">Nuovo preventivo disponibile</h2>
        <p>Gentile {{recipientName}},</p>
        <p>Un nuovo preventivo è stato predisposto per voi: <strong>{{quoteNumber}}</strong>.</p>
        <p>Per visualizzarlo, visitate il vostro portale clienti oppure contattate il vostro referente.</p>
        {{#if quoteLink}}<p><a href="{{quoteLink}}" style="color: #1e40af;">Visualizza il preventivo</a></p>{{/if}}
        <p>Cordiali saluti,<br/>{{senderName}}</p>
      </div>
    `,
  },
  quote_approved: {
    subject: 'Preventivo approvato',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #065f46;">Preventivo approvato</h2>
        <p>Il preventivo <strong>{{quoteNumber}}</strong> è stato approvato.</p>
        <p>{{notes}}</p>
        <p>Cordiali saluti,<br/>{{senderName}}</p>
      </div>
    `,
  },
  quote_rejected: {
    subject: 'Preventivo rifiutato',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #991b1b;">Preventivo rifiutato</h2>
        <p>Il preventivo <strong>{{quoteNumber}}</strong> non è stato approvato.</p>
        <p>Motivo: {{notes}}</p>
        <p>Si prega di apportare le modifiche necessarie e di sottoporlo nuovamente per approvazione.</p>
        <p>Cordiali saluti,<br/>{{senderName}}</p>
      </div>
    `,
  },
  contract_ready: {
    subject: 'Contratto pronto per la firma',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #065f46;">Contratto pronto per la firma</h2>
        <p>Gentile {{recipientName}},</p>
        <p>Il contratto <strong>{{contractNumber}}</strong> è pronto per la firma.</p>
        <p>Si prega di procedere alla firma al più presto possibile.</p>
        <p>Cordiali saluti,<br/>{{senderName}}</p>
      </div>
    `,
  },
  invoice_created: {
    subject: 'Nuova fattura',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1e40af;">Nuova fattura emessa</h2>
        <p>Gentile {{recipientName}},</p>
        <p>È stata emessa una nuova fattura: <strong>{{invoiceNumber}}</strong>.</p>
        <p>Importo: <strong>{{amount}}</strong></p>
        <p>Scadenza: {{dueDate}}</p>
        <p>Cordiali saluti,<br/>{{senderName}}</p>
      </div>
    `,
  },
  ticket_update: {
    subject: 'Aggiornamento ticket',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1e40af;">Aggiornamento ticket #{{ticketNumber}}</h2>
        <p>Gentile {{recipientName}},</p>
        <p>Il tuo ticket <strong>#{{ticketNumber}}</strong> è stato aggiornato.</p>
        <p>Stato attuale: <strong>{{status}}</strong></p>
        <p>{{message}}</p>
        <p>Cordiali saluti,<br/>{{senderName}}</p>
      </div>
    `,
  },
  portal_ticket_update: {
    subject: 'Aggiornamento sul tuo ticket',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1e40af;">Aggiornamento sul tuo ticket</h2>
        <p>Gentile {{recipientName}},</p>
        <p>Il tuo ticket <strong>#{{ticketNumber}}</strong> ha ricevuto un aggiornamento.</p>
        <p><strong>Oggetto:</strong> {{subject}}</p>
        <p>{{message}}</p>
        <p><a href="{{portalLink}}" style="display: inline-block; padding: 10px 20px; background-color: #1e40af; color: #fff; text-decoration: none; border-radius: 6px;">Vai al Portale</a></p>
        <p>Cordiali saluti,<br/>{{senderName}}</p>
      </div>
    `,
  },
  portal_milestone_ready: {
    subject: 'Milestone pronta per approvazione',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #065f46;">Milestone pronta per approvazione</h2>
        <p>Gentile {{recipientName}},</p>
        <p>La milestone <strong>{{milestoneName}}</strong> del progetto <strong>{{projectName}}</strong> è pronta per la tua approvazione.</p>
        <p>Accedi al portale per visualizzare i dettagli e procedere con l'approvazione.</p>
        <p><a href="{{portalLink}}" style="display: inline-block; padding: 10px 20px; background-color: #065f46; color: #fff; text-decoration: none; border-radius: 6px;">Approva nel Portale</a></p>
        <p>Cordiali saluti,<br/>{{senderName}}</p>
      </div>
    `,
  },
  portal_document_request: {
    subject: 'Documento richiesto',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #b45309;">Documento richiesto</h2>
        <p>Gentile {{recipientName}},</p>
        <p>Ti chiediamo di caricare il seguente documento: <strong>{{documentName}}</strong></p>
        <p>{{description}}</p>
        <p>Accedi al portale per caricare il documento richiesto.</p>
        <p><a href="{{portalLink}}" style="display: inline-block; padding: 10px 20px; background-color: #b45309; color: #fff; text-decoration: none; border-radius: 6px;">Carica Documento</a></p>
        <p>Cordiali saluti,<br/>{{senderName}}</p>
      </div>
    `,
  },
};

@Injectable()
export class EmailSenderService {
  private readonly logger = new Logger(EmailSenderService.name);
  private transporter: Transporter | null = null;
  private readonly devMode: boolean;
  private readonly from: string;

  constructor(private readonly config: ConfigService) {
    const smtpHost = this.config.get<string>('SMTP_HOST', '');
    this.devMode = !smtpHost;
    this.from = this.config.get<string>('SMTP_FROM', 'no-reply@connecteed.it');

    if (!this.devMode) {
      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: this.config.get<number>('SMTP_PORT', 587),
        secure: this.config.get<number>('SMTP_PORT', 587) === 465,
        auth: {
          user: this.config.get<string>('SMTP_USER', ''),
          pass: this.config.get<string>('SMTP_PASS', ''),
        },
      });
      this.logger.log(`SMTP transporter configured: ${smtpHost}`);
    } else {
      this.logger.warn('SMTP_HOST not set — email sender running in DEV mode (console only)');
    }
  }

  async sendEmail(to: string, subject: string, html: string, text?: string): Promise<void> {
    if (this.devMode) {
      this.logger.log(`[DEV EMAIL] To: ${to} | Subject: ${subject}`);
      this.logger.debug(`[DEV EMAIL BODY]: ${text ?? html.replace(/<[^>]+>/g, '')}`);
      return;
    }

    try {
      await this.transporter!.sendMail({
        from: this.from,
        to,
        subject,
        html,
        text: text ?? html.replace(/<[^>]+>/g, ''),
      });
      this.logger.log(`Email sent to ${to}: ${subject}`);
    } catch (err) {
      this.logger.error(`Failed to send email to ${to}: ${err.message}`);
      throw err;
    }
  }

  async sendTemplateEmail(
    to: string,
    templateName: string,
    variables: Record<string, string>,
  ): Promise<void> {
    const template = TEMPLATES[templateName];
    if (!template) {
      this.logger.warn(`Email template "${templateName}" not found`);
      return;
    }

    const interpolate = (str: string): string =>
      str.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] ?? '');

    const subject = interpolate(template.subject);
    const html = interpolate(template.html);

    await this.sendEmail(to, subject, html);
  }
}
