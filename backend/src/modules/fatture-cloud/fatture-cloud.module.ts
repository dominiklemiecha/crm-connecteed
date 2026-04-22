import { Global, Module } from '@nestjs/common';
import { FattureCloudService } from './fatture-cloud.service';

@Global()
@Module({
  providers: [FattureCloudService],
  exports: [FattureCloudService],
})
export class FattureCloudModule {}
