import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FattureCloudService {
  private readonly logger = new Logger(FattureCloudService.name);
  private readonly apiKey: string | undefined;
  private readonly apiUid: string | undefined;
  private readonly companyId: string | undefined;
  private readonly baseUrl = 'https://api-v2.fattureincloud.it';
  private readonly simulationMode: boolean;

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>('FATTURE_CLOUD_API_KEY');
    this.apiUid = this.config.get<string>('FATTURE_CLOUD_API_UID');
    this.companyId = this.config.get<string>('FATTURE_CLOUD_COMPANY_ID');

    this.simulationMode = !this.apiKey || !this.apiUid || !this.companyId;

    if (this.simulationMode) {
      this.logger.warn(
        'Fatture in Cloud running in SIMULATION MODE — env vars FATTURE_CLOUD_API_KEY, FATTURE_CLOUD_API_UID, FATTURE_CLOUD_COMPANY_ID not fully configured',
      );
    } else {
      this.logger.log('Fatture in Cloud integration configured and active');
    }
  }

  /**
   * Sync an invoice to Fatture in Cloud.
   * Creates the document via their REST API and returns the remote ID.
   */
  async syncInvoice(invoice: any): Promise<{ fattureCloudId: string }> {
    if (this.simulationMode) {
      const mockId = `SIM-FC-${Date.now()}`;
      this.logger.log(
        `[SIMULATION] syncInvoice → invoiceNumber=${invoice.invoiceNumber}, fattureCloudId=${mockId}`,
      );
      return { fattureCloudId: mockId };
    }

    const url = `${this.baseUrl}/c/${this.companyId}/issued_documents`;

    // Map CRM invoice to Fatture in Cloud issued_document payload
    const payload = {
      data: {
        type: 'invoice',
        number: invoice.invoiceNumber ? parseInt(invoice.invoiceNumber.replace(/\D/g, ''), 10) : 1,
        date: invoice.createdAt
          ? new Date(invoice.createdAt).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0],
        currency: { id: 'EUR' },
        items_list: (invoice.items || []).map((item: any) => ({
          name: item.description || 'Servizio',
          net_price: Number(item.unitPriceCents || 0) / 100,
          qty: Number(item.quantity || 1),
          vat: { id: 0, value: Number(item.taxRate || 22) },
        })),
        payment_method: { id: 0 },
        notes: invoice.notes || '',
      },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `Fatture in Cloud syncInvoice failed (${response.status}): ${text}`,
      );
    }

    const data = (await response.json()) as { data: { id: number } };
    const fattureCloudId = String(data.data.id);
    this.logger.log(
      `Invoice synced to Fatture in Cloud: fattureCloudId=${fattureCloudId}`,
    );
    return { fattureCloudId };
  }

  /**
   * Check payment status of a document on Fatture in Cloud.
   */
  async checkPaymentStatus(
    fattureCloudId: string,
  ): Promise<{ status: string; paidAt?: Date }> {
    if (this.simulationMode) {
      this.logger.log(
        `[SIMULATION] checkPaymentStatus → fattureCloudId=${fattureCloudId}, returning "not_paid"`,
      );
      return { status: 'not_paid' };
    }

    const url = `${this.baseUrl}/c/${this.companyId}/issued_documents/${fattureCloudId}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `Fatture in Cloud checkPaymentStatus failed (${response.status}): ${text}`,
      );
    }

    const data = (await response.json()) as {
      data: {
        is_marked: boolean;
        payment_method?: { id: number };
        next_due_date?: string;
      };
    };

    // Fatture in Cloud marks documents as "marked" when paid
    const isPaid = data.data.is_marked;
    return {
      status: isPaid ? 'paid' : 'not_paid',
      paidAt: isPaid ? new Date() : undefined,
    };
  }
}
