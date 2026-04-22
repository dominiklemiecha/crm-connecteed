import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { PortalController } from './portal.controller';
import { Project, GanttTask } from '../projects/project.entity';
import { Ticket, TicketMessage } from '../tickets/ticket.entity';
import { FileRecord } from '../files/file.entity';
import { Quote, QuoteVersion } from '../quotes/quote.entity';
import { QuotesModule } from '../quotes/quotes.module';
import { FilesModule } from '../files/files.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Project, GanttTask, Ticket, TicketMessage, FileRecord, Quote, QuoteVersion]),
    MulterModule.register({ storage: undefined }),
    forwardRef(() => QuotesModule),
    FilesModule,
  ],
  controllers: [PortalController],
})
export class PortalModule {}
