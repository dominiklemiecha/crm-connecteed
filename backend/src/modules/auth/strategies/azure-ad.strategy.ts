import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';

/**
 * Azure AD / Microsoft SSO Strategy.
 *
 * When AZURE_AD_CLIENT_ID, AZURE_AD_CLIENT_SECRET, and AZURE_AD_TENANT_ID
 * are configured, this strategy validates the id_token returned by Azure AD
 * after the OAuth2 authorization code flow.
 *
 * If not configured, it registers as a no-op that always rejects
 * (the controller simply won't route to it).
 */
@Injectable()
export class AzureAdStrategy extends PassportStrategy(Strategy, 'azure-ad') {
  private readonly logger = new Logger(AzureAdStrategy.name);
  private readonly configured: boolean;

  constructor(private readonly config: ConfigService) {
    const clientId = config.get<string>('AZURE_AD_CLIENT_ID');
    const tenantId = config.get<string>('AZURE_AD_TENANT_ID');

    // When Azure AD is configured, validate the JWT id_token issued by Azure AD
    // The token comes as a Bearer token after the callback flow processes it
    const isConfigured = !!(clientId && tenantId);

    super({
      jwtFromRequest: (req: any) => {
        // Extract token from query param (callback) or authorization header
        return req?.query?.id_token || req?.headers?.authorization?.replace('Bearer ', '') || null;
      },
      ignoreExpiration: false,
      // Azure AD public key endpoint for token validation
      secretOrKey: config.get<string>('AZURE_AD_CLIENT_SECRET') || 'azure-ad-not-configured',
      // In a full implementation, you would use jwksUri from Microsoft's OIDC discovery:
      // https://login.microsoftonline.com/{tenantId}/discovery/v2.0/keys
    });

    this.configured = isConfigured;

    if (!isConfigured) {
      this.logger.warn(
        'Azure AD SSO not configured — AZURE_AD_CLIENT_ID, AZURE_AD_CLIENT_SECRET, AZURE_AD_TENANT_ID missing',
      );
    } else {
      this.logger.log('Azure AD SSO strategy registered');
    }
  }

  async validate(payload: any) {
    if (!this.configured) {
      return null;
    }

    // The payload from an Azure AD id_token contains:
    // oid - the user's object ID in Azure AD
    // preferred_username / email - the user's email
    // name - display name
    return {
      microsoftOid: payload.oid,
      email: payload.preferred_username || payload.email,
      firstName: payload.given_name || '',
      lastName: payload.family_name || '',
    };
  }
}
