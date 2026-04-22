import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Email, EmailTemplate } from './email.entity';
import { EmailsService } from './emails.service';
import { EmailsController } from './emails.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Email, EmailTemplate])],
  controllers: [EmailsController],
  providers: [EmailsService],
  exports: [EmailsService],
})
export class EmailsModule {}
