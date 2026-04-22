import { Global, Module } from '@nestjs/common';
import { EmailSenderService } from './email-sender.service';

@Global()
@Module({
  providers: [EmailSenderService],
  exports: [EmailSenderService],
})
export class EmailSenderModule {}
