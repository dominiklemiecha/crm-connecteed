import { Global, Module } from '@nestjs/common';
import { OutlookService } from './outlook.service';

@Global()
@Module({
  providers: [OutlookService],
  exports: [OutlookService],
})
export class OutlookModule {}
