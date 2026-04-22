import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant } from './tenant.entity';
import { TenantService } from './tenant.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Tenant])],
  providers: [TenantService],
  exports: [TenantService],
})
export class TenantModule {}
