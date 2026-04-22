import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Lead, LeadProduct } from './lead.entity';
import { LeadsService } from './leads.service';
import { LeadsController } from './leads.controller';
import { OpportunitiesModule } from '../opportunities/opportunities.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Lead, LeadProduct]),
    forwardRef(() => OpportunitiesModule),
  ],
  controllers: [LeadsController],
  providers: [LeadsService],
  exports: [LeadsService],
})
export class LeadsModule {}
