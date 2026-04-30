import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeliveredProject } from './delivered-project.entity';
import { DeliveredProjectsService } from './delivered-projects.service';
import { DeliveredProjectsController } from './delivered-projects.controller';

@Module({
  imports: [TypeOrmModule.forFeature([DeliveredProject])],
  controllers: [DeliveredProjectsController],
  providers: [DeliveredProjectsService],
  exports: [DeliveredProjectsService],
})
export class DeliveredProjectsModule {}
