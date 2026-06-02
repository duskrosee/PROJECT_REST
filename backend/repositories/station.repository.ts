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
      externalProvider: st.externalProvider,
      externalFuelPriceId: st.externalFuelPriceId,
      latitude: st.latitude,
      longitude: st.longitude,
      brand: st.brand,
      fuels: st.fuels.map(f => ({
        fuelId: f.fuelId,
        pricePerLiter: f.pricePerLiter,
        availableQuantity: f.availableQuantity,
        priceSource: f.priceSource,
        priceUpdatedAt: f.priceUpdatedAt ? f.priceUpdatedAt.toISOString() : null,
        priceCurrency: f.priceCurrency,
        priceVolumeUnit: f.priceVolumeUnit,
        externalFuelType: f.externalFuelType,
        isEstimated: f.isEstimated
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
      externalProvider: st.externalProvider,
      externalFuelPriceId: st.externalFuelPriceId,
      latitude: st.latitude,
      longitude: st.longitude,
      brand: st.brand,
      fuels: st.fuels.map(f => ({
        fuelId: f.fuelId,
        pricePerLiter: f.pricePerLiter,
        availableQuantity: f.availableQuantity,
        priceSource: f.priceSource,
        priceUpdatedAt: f.priceUpdatedAt ? f.priceUpdatedAt.toISOString() : null,
        priceCurrency: f.priceCurrency,
        priceVolumeUnit: f.priceVolumeUnit,
        externalFuelType: f.externalFuelType,
        isEstimated: f.isEstimated
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
        lat: this.toOptionalNumber(data.lat ?? data.latitude) ?? null,
        lng: this.toOptionalNumber(data.lng ?? data.longitude) ?? null,
        createdAt: new Date(),
        externalProvider: data.externalProvider,
        externalFuelPriceId: data.externalFuelPriceId,
        latitude: this.toOptionalNumber(data.latitude ?? data.lat),
        longitude: this.toOptionalNumber(data.longitude ?? data.lng),
        brand: data.brand
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
    const lat = data.lat !== undefined ? this.toOptionalNumber(data.lat) : undefined;
    const lng = data.lng !== undefined ? this.toOptionalNumber(data.lng) : undefined;

    await prisma.station.update({
      where: { id },
      data: {
        name: data.name,
        address: data.address,
        city: data.city,
        workingHours: data.workingHours,
        status: data.status,
        ...(lat !== undefined ? { lat, latitude: lat } : {}),
        ...(lng !== undefined ? { lng, longitude: lng } : {}),
        externalProvider: data.externalProvider,
        externalFuelPriceId: data.externalFuelPriceId,
        brand: data.brand
      }
    });

    if (data.fuels !== undefined) {
      const existingFuels = await prisma.stationFuel.findMany({
        where: { stationId: id }
      });
      const existingByFuelId = new Map(existingFuels.map(fuel => [fuel.fuelId, fuel]));
      const incomingFuelIds = data.fuels.map(f => f.fuelId);

      await prisma.stationFuel.deleteMany({
        where: {
          stationId: id,
          fuelId: { notIn: incomingFuelIds }
        }
      });

      for (const fuelInput of data.fuels) {
        const previous = existingByFuelId.get(fuelInput.fuelId);

        await prisma.stationFuel.upsert({
          where: {
            stationId_fuelId: {
              stationId: id,
              fuelId: fuelInput.fuelId
            }
          },
          create: {
            stationId: id,
            fuelId: fuelInput.fuelId,
            pricePerLiter: fuelInput.pricePerLiter,
            availableQuantity: fuelInput.availableQuantity,
            priceSource: previous?.priceSource,
            priceUpdatedAt: previous?.priceUpdatedAt,
            priceCurrency: previous?.priceCurrency,
            priceVolumeUnit: previous?.priceVolumeUnit,
            externalFuelType: previous?.externalFuelType,
            isEstimated: previous?.isEstimated ?? false
          },
          update: {
            pricePerLiter: fuelInput.pricePerLiter,
            availableQuantity: fuelInput.availableQuantity
          }
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

  private toOptionalNumber(value?: number | null) {
    if (value === undefined || value === null) {
      return undefined;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
}
