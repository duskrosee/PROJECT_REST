import { prisma } from '../database';
import { CreateFuelDto, UpdateFuelDto } from '../dtos/fuel.dto';

export class FuelRepository {
  async findAll() {
    return await prisma.fuel.findMany({
      orderBy: { name: 'asc' }
    });
  }

  async findById(id: string) {
    return await prisma.fuel.findUnique({
      where: { id }
    });
  }

  async findByName(name: string) {
    return await prisma.fuel.findFirst({
      where: {
        name: {
          equals: name
        }
      }
    });
  }

  async create(id: string, data: CreateFuelDto) {
    return await prisma.fuel.create({
      data: {
        id,
        name: data.name,
        type: data.type,
        pricePerLiter: data.pricePerLiter,
        availableQuantity: data.availableQuantity
      }
    });
  }

  async update(id: string, data: UpdateFuelDto) {
    return await prisma.fuel.update({
      where: { id },
      data: {
        name: data.name,
        type: data.type,
        pricePerLiter: data.pricePerLiter,
        availableQuantity: data.availableQuantity
      }
    });
  }

  async delete(id: string) {
    return await prisma.fuel.delete({
      where: { id }
    });
  }
}
