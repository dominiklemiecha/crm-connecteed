import { Global, Module } from '@nestjs/common';
import { DocuSignService } from './docusign.service';
import { DocuSignController } from './docusign.controller';

@Global()
@Module({
  controllers: [DocuSignController],
  providers: [DocuSignService],
  exports: [DocuSignService],
})
export class DocuSignModule {}
