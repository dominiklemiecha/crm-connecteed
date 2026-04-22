import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  Headers,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto, RefreshTokenDto } from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Post('register')
  async register(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: RegisterDto,
  ) {
    return this.authService.register(tenantId, dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: LoginDto,
  ) {
    return this.authService.login(tenantId, dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshTokens(dto.refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@CurrentUser() user: any) {
    await this.authService.logout(user.id);
    return { message: 'Logged out successfully' };
  }

  // ─── Microsoft SSO ────────────────────────────────────────────────────────

  /**
   * Redirect user to Microsoft Azure AD login page.
   * If Azure AD is not configured, returns a 400 error.
   */
  @Get('sso/microsoft')
  async ssoMicrosoftRedirect(@Res() res: Response) {
    const clientId = this.config.get<string>('AZURE_AD_CLIENT_ID');
    const tenantId = this.config.get<string>('AZURE_AD_TENANT_ID');
    const redirectUri = this.config.get<string>(
      'AZURE_AD_REDIRECT_URI',
      'http://localhost:3000/auth/sso/microsoft/callback',
    );

    if (!clientId || !tenantId) {
      throw new BadRequestException(
        'Microsoft SSO not configured. Set AZURE_AD_CLIENT_ID and AZURE_AD_TENANT_ID.',
      );
    }

    const authUrl =
      `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?` +
      `client_id=${encodeURIComponent(clientId)}` +
      `&response_type=code` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_mode=query` +
      `&scope=${encodeURIComponent('openid profile email')}` +
      `&state=crm_sso`;

    this.logger.log('Redirecting to Microsoft SSO login');
    res.redirect(authUrl);
  }

  /**
   * Handle the callback from Azure AD.
   * Exchanges the authorization code for tokens, finds or creates the user,
   * and returns JWT tokens.
   */
  @Get('sso/microsoft/callback')
  async ssoMicrosoftCallback(
    @Query('code') code: string,
    @Query('error') error: string,
    @Query('error_description') errorDescription: string,
    @Headers('x-tenant-id') tenantId: string,
  ) {
    if (error) {
      throw new BadRequestException(
        `Microsoft SSO error: ${error} - ${errorDescription}`,
      );
    }

    if (!code) {
      throw new BadRequestException('No authorization code received from Microsoft');
    }

    const clientId = this.config.get<string>('AZURE_AD_CLIENT_ID');
    const clientSecret = this.config.get<string>('AZURE_AD_CLIENT_SECRET');
    const azureTenantId = this.config.get<string>('AZURE_AD_TENANT_ID');
    const redirectUri = this.config.get<string>(
      'AZURE_AD_REDIRECT_URI',
      'http://localhost:3000/auth/sso/microsoft/callback',
    );

    if (!clientId || !clientSecret || !azureTenantId) {
      throw new BadRequestException('Microsoft SSO not fully configured');
    }

    // Exchange authorization code for tokens
    const tokenUrl = `https://login.microsoftonline.com/${azureTenantId}/oauth2/v2.0/token`;
    const tokenBody = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
      scope: 'openid profile email',
    });

    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenBody.toString(),
    });

    if (!tokenResponse.ok) {
      const text = await tokenResponse.text();
      this.logger.error(`Microsoft token exchange failed: ${text}`);
      throw new BadRequestException('Failed to exchange authorization code');
    }

    const tokenData = (await tokenResponse.json()) as {
      id_token: string;
      access_token: string;
    };

    // Decode the id_token to get user info (JWT payload is base64url)
    const idTokenParts = tokenData.id_token.split('.');
    const idTokenPayload = JSON.parse(
      Buffer.from(idTokenParts[1], 'base64url').toString('utf-8'),
    );

    const microsoftOid = idTokenPayload.oid;
    const email = idTokenPayload.preferred_username || idTokenPayload.email;
    const firstName = idTokenPayload.given_name || '';
    const lastName = idTokenPayload.family_name || '';

    this.logger.log(`Microsoft SSO callback: oid=${microsoftOid}, email=${email}`);

    // Delegate to auth service to find or create user
    return this.authService.loginOrCreateFromSSO(tenantId, {
      microsoftOid,
      email,
      firstName,
      lastName,
    });
  }
}
