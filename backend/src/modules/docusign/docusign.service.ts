import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DocuSignService {
  private readonly logger = new Logger(DocuSignService.name);
  private readonly integrationKey: string | undefined;
  private readonly secretKey: string | undefined;
  private readonly accountId: string | undefined;
  private readonly baseUrl: string;
  private readonly simulationMode: boolean;

  constructor(private readonly config: ConfigService) {
    this.integrationKey = this.config.get<string>('DOCUSIGN_INTEGRATION_KEY');
    this.secretKey = this.config.get<string>('DOCUSIGN_SECRET_KEY');
    this.accountId = this.config.get<string>('DOCUSIGN_ACCOUNT_ID');
    this.baseUrl = this.config.get<string>(
      'DOCUSIGN_BASE_URL',
      'https://demo.docusign.net/restapi/v2.1',
    );

    this.simulationMode =
      !this.integrationKey || !this.secretKey || !this.accountId;

    if (this.simulationMode) {
      this.logger.warn(
        'DocuSign running in SIMULATION MODE — env vars DOCUSIGN_INTEGRATION_KEY, DOCUSIGN_SECRET_KEY, DOCUSIGN_ACCOUNT_ID not fully configured',
      );
    } else {
      this.logger.log('DocuSign integration configured and active');
    }
  }

  /**
   * Obtain an access token via JWT Grant flow.
   * In production you would cache this token until it expires.
   */
  private async getAccessToken(): Promise<string> {
    // For a real implementation you would POST to /oauth/token
    // using the integration key + secret key (client credentials or JWT grant).
    // Simplified: we use basic auth header with integration key:secret.
    const url = this.baseUrl.replace('/restapi/v2.1', '/oauth/token');
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      scope: 'signature',
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization:
          'Basic ' +
          Buffer.from(`${this.integrationKey}:${this.secretKey}`).toString(
            'base64',
          ),
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`DocuSign auth failed (${response.status}): ${text}`);
    }

    const data = (await response.json()) as { access_token: string };
    return data.access_token;
  }

  /**
   * Create a DocuSign envelope from a contract PDF buffer.
   */
  async createEnvelope(
    contractPdfBuffer: Buffer,
    signerEmail: string,
    signerName: string,
    subject: string,
  ): Promise<{ envelopeId: string }> {
    if (this.simulationMode) {
      const mockId = `SIM-ENV-${Date.now()}`;
      this.logger.log(
        `[SIMULATION] createEnvelope → signer=${signerEmail}, subject="${subject}", envelopeId=${mockId}`,
      );
      return { envelopeId: mockId };
    }

    const accessToken = await this.getAccessToken();
    const envelopeDefinition = {
      emailSubject: subject,
      documents: [
        {
          documentBase64: contractPdfBuffer.toString('base64'),
          name: 'Contract',
          fileExtension: 'pdf',
          documentId: '1',
        },
      ],
      recipients: {
        signers: [
          {
            email: signerEmail,
            name: signerName,
            recipientId: '1',
            routingOrder: '1',
            tabs: {
              signHereTabs: [
                {
                  documentId: '1',
                  pageNumber: '1',
                  xPosition: '100',
                  yPosition: '700',
                },
              ],
            },
          },
        ],
      },
      status: 'sent',
    };

    const url = `${this.baseUrl}/accounts/${this.accountId}/envelopes`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(envelopeDefinition),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `DocuSign createEnvelope failed (${response.status}): ${text}`,
      );
    }

    const data = (await response.json()) as { envelopeId: string };
    this.logger.log(`DocuSign envelope created: ${data.envelopeId}`);
    return { envelopeId: data.envelopeId };
  }

  /**
   * Handle a DocuSign Connect webhook notification.
   * DocuSign sends XML or JSON payloads when envelope status changes.
   */
  async handleWebhook(
    payload: any,
  ): Promise<{ contractId?: string; status: string }> {
    if (this.simulationMode) {
      this.logger.log(
        `[SIMULATION] handleWebhook → payload keys: ${Object.keys(payload).join(', ')}`,
      );
      return { status: 'simulated' };
    }

    // DocuSign Connect sends the envelope status in the payload.
    // The exact shape depends on your Connect configuration (JSON vs XML).
    const envelopeId =
      payload?.envelopeId ||
      payload?.EnvelopeStatus?.EnvelopeID ||
      payload?.data?.envelopeId;
    const envelopeStatus =
      payload?.status ||
      payload?.EnvelopeStatus?.Status ||
      payload?.data?.envelopeSummary?.status ||
      'unknown';

    this.logger.log(
      `DocuSign webhook received: envelopeId=${envelopeId}, status=${envelopeStatus}`,
    );

    // The caller (controller) is responsible for looking up the contract by envelopeId
    // and updating its status accordingly.
    return {
      contractId: undefined, // resolved by the controller / contracts service
      status: String(envelopeStatus).toLowerCase(),
    };
  }

  /**
   * Get the current status of a DocuSign envelope.
   */
  async getEnvelopeStatus(
    envelopeId: string,
  ): Promise<{ status: string }> {
    if (this.simulationMode) {
      this.logger.log(
        `[SIMULATION] getEnvelopeStatus → envelopeId=${envelopeId}, returning "sent"`,
      );
      return { status: 'sent' };
    }

    const accessToken = await this.getAccessToken();
    const url = `${this.baseUrl}/accounts/${this.accountId}/envelopes/${envelopeId}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `DocuSign getEnvelopeStatus failed (${response.status}): ${text}`,
      );
    }

    const data = (await response.json()) as { status: string };
    return { status: data.status };
  }
}
