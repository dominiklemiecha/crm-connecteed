import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Contract, ContractSignature } from './contract.entity';
import { ContractsService } from './contracts.service';
import { ContractsController } from './contracts.controller';
import { Invoice } from '../invoices/invoice.entity';
import { PdfModule } from '../pdf/pdf.module';

@Module({
  imports: [TypeOrmModule.forFeature([Contract, ContractSignature, Invoice]), PdfModule],
  controllers: [ContractsController],
  providers: [ContractsService],
  exports: [ContractsService],
})
export class ContractsModule {}
