import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentTemplate } from './document-template.entity';
import { TemplatesService } from './templates.service';
import { TemplatesController } from './templates.controller';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([DocumentTemplate])],
  controllers: [TemplatesController],
  providers: [TemplatesService],
  exports: [TemplatesService],
})
export class TemplatesModule {}
