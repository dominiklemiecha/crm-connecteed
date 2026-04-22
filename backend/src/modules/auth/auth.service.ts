import {
  Injectable,
  Logger,
  UnauthorizedException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { User, UserStatus, UserRole, UserType } from './user.entity';
import { LoginDto, RegisterDto, AuthResponse } from './dto/auth.dto';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(tenantId: string, dto: RegisterDto): Promise<AuthResponse> {
    const existing = await this.userRepo.findOne({
      where: { tenantId, email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = this.userRepo.create({
      tenantId,
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
      role: dto.role,
      type: dto.type,
      companyId: dto.companyId,
      status: UserStatus.ACTIVE,
    });

    await this.userRepo.save(user);
    return this.generateTokens(user);
  }

  async login(tenantId: string | undefined, dto: LoginDto): Promise<AuthResponse> {
    // If tenantId provided, search within tenant; otherwise search globally by email
    const user = tenantId
      ? await this.userRepo.findOne({ where: { tenantId, email: dto.email } })
      : await this.userRepo.findOne({ where: { email: dto.email } });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status === UserStatus.BLOCKED) {
      throw new ForbiddenException('Account is blocked');
    }

    // Check lockout
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutesLeft = Math.ceil(
        (user.lockedUntil.getTime() - Date.now()) / 60000,
      );
      throw new ForbiddenException(
        `Account locked. Try again in ${minutesLeft} minutes`,
      );
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      user.failedLoginAttempts += 1;

      if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
        user.lockedUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
        user.failedLoginAttempts = 0;
      }

      await this.userRepo.save(user);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Reset on successful login
    user.failedLoginAttempts = 0;
    user.lockedUntil = null as any;
    user.lastLoginAt = new Date();

    const response = await this.generateTokens(user);

    // Store refresh token hash
    user.refreshTokenHash = await bcrypt.hash(response.refreshToken, 10);
    await this.userRepo.save(user);

    return response;
  }

  async refreshTokens(
    refreshToken: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    let payload: any;
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.userRepo.findOne({
      where: { id: payload.sub },
    });

    if (!user || !user.refreshTokenHash) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const isValid = await bcrypt.compare(refreshToken, user.refreshTokenHash);
    if (!isValid) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokens = await this.generateTokens(user);
    user.refreshTokenHash = await bcrypt.hash(tokens.refreshToken, 10);
    await this.userRepo.save(user);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async logout(userId: string): Promise<void> {
    await this.userRepo.update(userId, { refreshTokenHash: null as any });
  }

  /**
   * Find or create a user from Microsoft SSO data.
   * Searches by microsoftOid first, then by email.
   * If no user exists, creates one with default role.
   */
  async loginOrCreateFromSSO(
    tenantId: string | undefined,
    ssoData: { microsoftOid: string; email: string; firstName: string; lastName: string },
  ): Promise<AuthResponse> {
    // First try to find by microsoftOid
    let user = await this.userRepo.findOne({
      where: tenantId
        ? { tenantId, microsoftOid: ssoData.microsoftOid }
        : { microsoftOid: ssoData.microsoftOid },
    });

    // Fallback: find by email
    if (!user && ssoData.email) {
      user = await this.userRepo.findOne({
        where: tenantId
          ? { tenantId, email: ssoData.email }
          : { email: ssoData.email },
      });

      // Link existing user to Microsoft OID
      if (user && !user.microsoftOid) {
        user.microsoftOid = ssoData.microsoftOid;
        await this.userRepo.save(user);
        this.logger.log(`Linked Microsoft OID ${ssoData.microsoftOid} to existing user ${user.email}`);
      }
    }

    // Create new user if not found
    if (!user) {
      if (!tenantId) {
        throw new UnauthorizedException('Cannot create user without tenant context');
      }

      user = this.userRepo.create({
        tenantId,
        email: ssoData.email,
        firstName: ssoData.firstName || 'SSO',
        lastName: ssoData.lastName || 'User',
        microsoftOid: ssoData.microsoftOid,
        role: UserRole.COMMERCIALE,
        type: UserType.INTERNAL,
        status: UserStatus.ACTIVE,
      });
      await this.userRepo.save(user);
      this.logger.log(`Created new user from Microsoft SSO: ${user.email}`);
    }

    if (user.status === UserStatus.BLOCKED) {
      throw new UnauthorizedException('Account is blocked');
    }

    user.lastLoginAt = new Date();
    const tokens = await this.generateTokens(user);
    user.refreshTokenHash = await bcrypt.hash(tokens.refreshToken, 10);
    await this.userRepo.save(user);

    return tokens;
  }

  private async generateTokens(user: User): Promise<AuthResponse> {
    const payload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role,
      type: user.type,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.config.get('JWT_SECRET'),
      expiresIn: this.config.get('JWT_EXPIRES_IN', '15m'),
    });

    const refreshToken = this.jwtService.sign(
      { sub: user.id },
      {
        secret: this.config.get('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN', '7d'),
      },
    );

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        type: user.type,
        tenantId: user.tenantId,
      },
    };
  }
}
