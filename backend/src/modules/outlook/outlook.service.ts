import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class OutlookService {
  private readonly logger = new Logger(OutlookService.name);
  private readonly graphClientId: string | undefined;
  private readonly graphClientSecret: string | undefined;
  private readonly graphTenantId: string | undefined;
  private readonly simulationMode: boolean;

  private readonly graphBaseUrl = 'https://graph.microsoft.com/v1.0';

  constructor(private readonly config: ConfigService) {
    this.graphClientId = this.config.get<string>('MICROSOFT_GRAPH_CLIENT_ID');
    this.graphClientSecret = this.config.get<string>('MICROSOFT_GRAPH_CLIENT_SECRET');
    this.graphTenantId = this.config.get<string>('MICROSOFT_GRAPH_TENANT_ID');

    this.simulationMode =
      !this.graphClientId || !this.graphClientSecret || !this.graphTenantId;

    if (this.simulationMode) {
      this.logger.warn(
        'Outlook/Graph running in SIMULATION MODE — env vars MICROSOFT_GRAPH_CLIENT_ID, MICROSOFT_GRAPH_CLIENT_SECRET, MICROSOFT_GRAPH_TENANT_ID not fully configured',
      );
    } else {
      this.logger.log('Outlook/Microsoft Graph integration configured and active');
    }
  }

  /**
   * Sync recent emails for a user via Microsoft Graph API.
   * Requires a delegated access token obtained via OAuth2 on behalf of the user.
   */
  async syncEmails(
    userId: string,
    accessToken: string,
  ): Promise<{ synced: number; emails: any[] }> {
    if (this.simulationMode) {
      this.logger.log(
        `[SIMULATION] syncEmails → userId=${userId}, returning mock data`,
      );
      return {
        synced: 2,
        emails: [
          {
            id: 'sim-email-1',
            subject: '[Simulation] Test email 1',
            from: 'test@example.com',
            receivedDateTime: new Date().toISOString(),
            bodyPreview: 'This is a simulated email for development.',
          },
          {
            id: 'sim-email-2',
            subject: '[Simulation] Test email 2',
            from: 'client@example.com',
            receivedDateTime: new Date().toISOString(),
            bodyPreview: 'Another simulated email.',
          },
        ],
      };
    }

    const url = `${this.graphBaseUrl}/me/messages?$top=50&$orderby=receivedDateTime desc&$select=id,subject,from,receivedDateTime,bodyPreview,isRead`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `Microsoft Graph syncEmails failed (${response.status}): ${text}`,
      );
    }

    const data = (await response.json()) as { value: any[] };
    this.logger.log(`Synced ${data.value.length} emails for user ${userId}`);
    return { synced: data.value.length, emails: data.value };
  }

  /**
   * Send an email on behalf of a user via Microsoft Graph API.
   */
  async sendEmail(
    userId: string,
    accessToken: string,
    to: string,
    subject: string,
    body: string,
  ): Promise<{ success: boolean; messageId?: string }> {
    if (this.simulationMode) {
      this.logger.log(
        `[SIMULATION] sendEmail → userId=${userId}, to=${to}, subject="${subject}"`,
      );
      return { success: true, messageId: `SIM-MSG-${Date.now()}` };
    }

    const url = `${this.graphBaseUrl}/me/sendMail`;
    const payload = {
      message: {
        subject,
        body: {
          contentType: 'HTML',
          content: body,
        },
        toRecipients: [
          {
            emailAddress: {
              address: to,
            },
          },
        ],
      },
      saveToSentItems: true,
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `Microsoft Graph sendEmail failed (${response.status}): ${text}`,
      );
    }

    this.logger.log(`Email sent via Graph API to ${to}`);
    return { success: true };
  }
}
