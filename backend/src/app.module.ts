import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { getEnvironmentConfig } from './config/environments';
import { DatabaseModule } from './database/database.module';
import { TenantModule } from './modules/tenant/tenant.module';
import { TenantContextMiddleware } from './common/middleware/tenant-context.middleware';
import { AuthModule } from './modules/auth/auth.module';
import { AuditModule } from './modules/audit/audit.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { ContactsModule } from './modules/contacts/contacts.module';
import { ProductsModule } from './modules/products/products.module';
import { DepartmentsModule } from './modules/departments/departments.module';
import { EmailsModule } from './modules/emails/emails.module';
import { QuotesModule } from './modules/quotes/quotes.module';
import { ApprovalsModule } from './modules/approvals/approvals.module';
import { ContractsModule } from './modules/contracts/contracts.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { FilesModule } from './modules/files/files.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { LeadsModule } from './modules/leads/leads.module';
import { OpportunitiesModule } from './modules/opportunities/opportunities.module';
import { TicketsModule } from './modules/tickets/tickets.module';
import { PortalModule } from './modules/portal/portal.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { ChangeRequestsModule } from './modules/change-requests/change-requests.module';
import { SchedulerModule } from './modules/scheduler/scheduler.module';
import { UsersModule } from './modules/users/users.module';
import { ReportsModule } from './modules/reports/reports.module';
import { TimeTrackingModule } from './modules/time-tracking/time-tracking.module';
import { PdfModule } from './modules/pdf/pdf.module';
import { EmailSenderModule } from './modules/email-sender/email-sender.module';
import { TemplatesModule } from './modules/templates/templates.module';
import { DocuSignModule } from './modules/docusign/docusign.module';
import { FattureCloudModule } from './modules/fatture-cloud/fatture-cloud.module';
import { OutlookModule } from './modules/outlook/outlook.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../.env',
    }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const envConfig = getEnvironmentConfig();
        return {
          type: 'postgres' as const,
          host: config.get('DB_HOST', 'localhost'),
          port: config.get<number>('DB_PORT', 5432),
          username: config.get('DB_USERNAME', 'connecteed'),
          password: config.get('DB_PASSWORD', 'connecteed_secret'),
          database: config.get<string>('DB_DATABASE', 'crm_connecteed'),
          autoLoadEntities: true,
          synchronize: envConfig.syncDatabase || process.env.FORCE_DB_SYNC === 'true',
          dropSchema: false,
          logging: envConfig.logging,
        };
      },
    }),

    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
        },
      }),
    }),

    DatabaseModule,
    TenantModule,
    AuthModule,
    AuditModule,
    CompaniesModule,
    ContactsModule,
    ProductsModule,
    DepartmentsModule,
    LeadsModule,
    OpportunitiesModule,
    TicketsModule,
    EmailsModule,
    QuotesModule,
    ApprovalsModule,
    ContractsModule,
    InvoicesModule,
    ProjectsModule,
    FilesModule,
    NotificationsModule,
    PortalModule,
    DashboardModule,
    ChangeRequestsModule,
    SchedulerModule,
    UsersModule,
    ReportsModule,
    TimeTrackingModule,
    PdfModule,
    EmailSenderModule,
    TemplatesModule,
    DocuSignModule,
    FattureCloudModule,
    OutlookModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantContextMiddleware).forRoutes('*');
  }
}
