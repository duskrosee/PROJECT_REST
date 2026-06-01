import { prisma } from '../database';
import { CreateStationDto, UpdateStationDto } from '../dtos/station.dto';

export class StationRepository {
  async findAll(filters: {
    city?: string;
    status?: string;
    fuelId?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
  } = {}) {
    const where: any = {};

    if (filters.city) {
      where.city = { contains: filters.city };
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.fuelId) {
      where.fuels = {
        some: {
          fuelId: filters.fuelId
        }
      };
    }

    // Pagination
    const limit = filters.limit ? parseInt(filters.limit as any, 10) : undefined;
    const page = filters.page ? parseInt(filters.page as any, 10) : 1;
    const skip = limit ? (page - 1) * limit : undefined;

    // Sorting
    let orderBy: any = { name: 'asc' };
    if (filters.sortBy) {
      if (['name', 'city', 'createdAt', 'status'].includes(filters.sortBy)) {
        orderBy = { [filters.sortBy]: 'asc' };
      }
    }

    const stations = await prisma.station.findMany({
      where,
      include: {
        fuels: true
      },
      orderBy,
      take: limit,
      skip: skip
    });

    return stations.map(st => ({
      id: st.id,
      name: st.name,
      address: st.address,
      city: st.city,
      workingHours: st.workingHours,
      status: st.status,
      lat: st.lat ?? null,
      lng: st.lng ?? null,
      createdAt: st.createdAt.toISOString(),
      fuels: st.fuels.map(f => ({
        fuelId: f.fuelId,
        pricePerLiter: f.pricePerLiter,
        availableQuantity: f.availableQuantity
      }))
    }));
  }

  async findById(id: string) {
    const st = await prisma.station.findUnique({
      where: { id },
      include: {
        fuels: true
      }
    });

    if (!st) return null;

    return {
      id: st.id,
      name: st.name,
      address: st.address,
      city: st.city,
      workingHours: st.workingHours,
      status: st.status,
      lat: st.lat ?? null,
      lng: st.lng ?? null,
      createdAt: st.createdAt.toISOString(),
      fuels: st.fuels.map(f => ({
        fuelId: f.fuelId,
        pricePerLiter: f.pricePerLiter,
        availableQuantity: f.availableQuantity
      }))
    };
  }

  async create(id: string, data: CreateStationDto) {
    const station = await prisma.station.create({
      data: {
        id,
        name: data.name,
        address: data.address,
        city: data.city,
        workingHours: data.workingHours,
        status: data.status || 'czynna',
        lat: data.lat ?? null,
        lng: data.lng ?? null,
        createdAt: new Date()
      }
    });

    if (data.fuels && data.fuels.length > 0) {
      const fuelsToCreate = data.fuels.map(f => ({
        stationId: id,
        fuelId: f.fuelId,
        pricePerLiter: f.pricePerLiter,
        availableQuantity: f.availableQuantity
      }));

      await prisma.stationFuel.createMany({
        data: fuelsToCreate
      });
    }

    return await this.findById(id);
  }

  async update(id: string, data: UpdateStationDto) {
    await prisma.station.update({
      where: { id },
      data: {
        name: data.name,
        address: data.address,
        city: data.city,
        workingHours: data.workingHours,
        status: data.status,
        ...(data.lat !== undefined ? { lat: data.lat } : {}),
        ...(data.lng !== undefined ? { lng: data.lng } : {})
      }
    });

    if (data.fuels !== undefined) {
      await prisma.stationFuel.deleteMany({
        where: { stationId: id }
      });

      if (data.fuels.length > 0) {
        const fuelsToCreate = data.fuels.map(f => ({
          stationId: id,
          fuelId: f.fuelId,
          pricePerLiter: f.pricePerLiter,
          availableQuantity: f.availableQuantity
        }));

        await prisma.stationFuel.createMany({
          data: fuelsToCreate
        });
      }
    }

    return await this.findById(id);
  }

  async delete(id: string) {
    return await prisma.station.delete({
      where: { id }
    });
  }
}
