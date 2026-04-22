import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Quote, QuoteVersion, QuoteItem, QuoteTextLibrary } from './quote.entity';
import { QuotesService } from './quotes.service';
import { QuotesController } from './quotes.controller';
import { Opportunity } from '../opportunities/opportunity.entity';
import { Contract } from '../contracts/contract.entity';
import { PdfModule } from '../pdf/pdf.module';

@Module({
  imports: [TypeOrmModule.forFeature([Quote, QuoteVersion, QuoteItem, QuoteTextLibrary, Opportunity, Contract]), PdfModule],
  controllers: [QuotesController],
  providers: [QuotesService],
  exports: [QuotesService],
})
export class QuotesModule {}
