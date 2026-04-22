import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Product } from './product.entity';
import { PaginationDto, PaginatedResult } from '../../common/dto/pagination.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
  ) {}

  async create(tenantId: string, dto: Partial<Product>): Promise<Product> {
    const product = this.productRepo.create({ ...dto, tenantId });
    return this.productRepo.save(product);
  }

  async findAll(tenantId: string, pagination: PaginationDto): Promise<PaginatedResult<Product>> {
    const where: any = { tenantId };
    if (pagination.search) where.name = ILike(`%${pagination.search}%`);

    const [data, total] = await this.productRepo.findAndCount({
      where, order: { createdAt: 'DESC' },
      skip: ((pagination.page || 1) - 1) * (pagination.limit || 20),
      take: pagination.limit || 20,
    });
    return new PaginatedResult(data, total, pagination.page || 1, pagination.limit || 20);
  }

  async findById(tenantId: string, id: string): Promise<Product> {
    const product = await this.productRepo.findOne({ where: { id, tenantId } });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async update(tenantId: string, id: string, dto: Partial<Product>): Promise<Product> {
    const product = await this.findById(tenantId, id);
    Object.assign(product, dto);
    return this.productRepo.save(product);
  }

  async remove(tenantId: string, id: string): Promise<void> {
    const product = await this.findById(tenantId, id);
    await this.productRepo.remove(product);
  }
}
