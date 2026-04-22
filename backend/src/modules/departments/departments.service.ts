import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Department } from './department.entity';

@Injectable()
export class DepartmentsService {
  constructor(
    @InjectRepository(Department)
    private readonly deptRepo: Repository<Department>,
  ) {}

  async create(tenantId: string, dto: Partial<Department>): Promise<Department> {
    const dept = this.deptRepo.create({ ...dto, tenantId });
    return this.deptRepo.save(dept);
  }

  async findAll(tenantId: string): Promise<Department[]> {
    return this.deptRepo.find({ where: { tenantId }, order: { name: 'ASC' } });
  }

  async findById(tenantId: string, id: string): Promise<Department> {
    const dept = await this.deptRepo.findOne({ where: { id, tenantId } });
    if (!dept) throw new NotFoundException('Department not found');
    return dept;
  }

  async update(tenantId: string, id: string, dto: Partial<Department>): Promise<Department> {
    const dept = await this.findById(tenantId, id);
    Object.assign(dept, dto);
    return this.deptRepo.save(dept);
  }

  async remove(tenantId: string, id: string): Promise<void> {
    const dept = await this.findById(tenantId, id);
    await this.deptRepo.remove(dept);
  }
}
