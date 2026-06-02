import { prisma } from '../database';
import { AuditLogRepository } from '../repositories/audit.repository';
import { BenzynaMapaFuelPrice, BenzynaMapaFuelPriceProvider, BenzynaMapaStation } from '../providers/benzynaMapaFuelPrice.provider';

type SyncResult = {
  stationId: string;
  stationName: string;
  status: 'updated' | 'skipped' | 'failed';
  updatedCount: number;
  skippedCount: number;
  message?: string;
};

type StationForSync = {
  id: string;
  name: string;
  externalProvider: string | null;
  externalFuelPriceId: string | null;
  fuels: Array<{
    fuelId: string;
    fuel: {
      name: string;
      type: string;
    };
  }>;
};

type ImportStationsOptions = {
  city?: string;
  brand?: string;
  search?: string;
  limit?: number;
  all?: boolean;
};

export class FuelPriceSyncService {
  private readonly provider = new BenzynaMapaFuelPriceProvider();
  private readonly auditRepo = new AuditLogRepository();

  async syncAll(actorUsername: string) {
    const stations = await prisma.station.findMany({
      where: {
        externalProvider: this.provider.name,
        externalFuelPriceId: {
          not: null
        }
      },
      include: {
        fuels: {
          include: {
            fuel: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    const pricesByStationId = await this.provider.fetchPrices();
    const results: SyncResult[] = [];
    for (const station of stations) {
      results.push(await this.syncStationPrices(
        station,
        pricesByStationId.get(station.externalFuelPriceId || '') || [],
        actorUsername,
        false
      ));
    }

    await this.auditRepo.create(
      actorUsername,
      'FUEL_PRICE_SYNC',
      `Synchronizacja cen BenzynaMAPA dla ${stations.length} stacji: zaktualizowano ${results.filter(result => result.status === 'updated').length}, błędy ${results.filter(result => result.status === 'failed').length}.`
    );

    return {
      provider: this.provider.name,
      configured: this.provider.isConfigured(),
      stationCount: stations.length,
      updatedStationCount: results.filter(result => result.status === 'updated').length,
      results
    };
  }

  async syncStation(stationId: string, actorUsername: string): Promise<SyncResult> {
    const station = await prisma.station.findUnique({
      where: { id: stationId },
      include: {
        fuels: {
          include: {
            fuel: true
          }
        }
      }
    });

    if (!station) {
      throw new Error('Stacja paliw o podanym ID nie istnieje');
    }

    if (station.externalProvider !== this.provider.name || !station.externalFuelPriceId) {
      return {
        stationId: station.id,
        stationName: station.name,
        status: 'skipped',
        updatedCount: 0,
        skippedCount: station.fuels.length,
        message: `Stacja nie ma skonfigurowanego externalProvider="${this.provider.name}" oraz externalFuelPriceId.`
      };
    }

    try {
      const externalPrices = await this.provider.fetchPricesByStationId(station.externalFuelPriceId);
      return await this.syncStationPrices(station, externalPrices, actorUsername, true);
    } catch (error: any) {
      await this.auditRepo.create(
        actorUsername,
        'FUEL_PRICE_SYNC_FAILED',
        `Błąd synchronizacji cen BenzynaMAPA dla stacji ${station.name}: ${error.message}`
      );

      return {
        stationId: station.id,
        stationName: station.name,
        status: 'failed',
        updatedCount: 0,
        skippedCount: station.fuels.length,
        message: error.message
      };
    }
  }

  async importStations(actorUsername: string, options: ImportStationsOptions = {}) {
    const stations = await this.provider.fetchStations();
    const pricesByStationId = await this.provider.fetchPrices();
    const selectedStations = this.filterStations(stations, options);
    const selectedStationIds = selectedStations.map(station => this.toLocalStationId(station.id));
    const existingStationIds = new Set((await prisma.station.findMany({
      where: {
        id: {
          in: selectedStationIds
        }
      },
      select: {
        id: true
      }
    })).map(station => station.id));
    const fuels = await prisma.fuel.findMany();
    const fuelByExternalType = new Map([
      ['pb95', fuels.find(fuel => this.matchesFuelCatalog(fuel.name, fuel.type, 'pb95'))],
      ['pb98', fuels.find(fuel => this.matchesFuelCatalog(fuel.name, fuel.type, 'pb98'))],
      ['on', fuels.find(fuel => this.matchesFuelCatalog(fuel.name, fuel.type, 'on'))],
      ['lpg', fuels.find(fuel => this.matchesFuelCatalog(fuel.name, fuel.type, 'lpg'))]
    ]);

    let createdCount = 0;
    let updatedCount = 0;
    let stationFuelCount = 0;
    const imported: Array<{ id: string; externalFuelPriceId: string; name: string; city: string }> = [];

    for (const station of selectedStations) {
      const id = this.toLocalStationId(station.id);
      const isExisting = existingStationIds.has(id);

      await prisma.$transaction(async (tx) => {
        const saved = await tx.station.upsert({
          where: { id },
          create: {
            id,
            name: this.toLocalStationName(station),
            address: station.address || `${station.lat || ''}, ${station.lng || ''}`.trim() || 'Brak danych',
            city: station.city || 'Brak danych',
            workingHours: station.opening_hours || 'Brak danych',
            status: this.isClosed(station) ? 'nieczynna' : 'czynna',
            lat: station.lat,
            lng: station.lng,
            createdAt: new Date(),
            externalProvider: this.provider.name,
            externalFuelPriceId: station.id,
            latitude: station.lat,
            longitude: station.lng,
            brand: station.brand || station.name
          },
          update: {
            name: this.toLocalStationName(station),
            address: station.address || `${station.lat || ''}, ${station.lng || ''}`.trim() || 'Brak danych',
            city: station.city || 'Brak danych',
            workingHours: station.opening_hours || 'Brak danych',
            status: this.isClosed(station) ? 'nieczynna' : 'czynna',
            lat: station.lat,
            lng: station.lng,
            externalProvider: this.provider.name,
            externalFuelPriceId: station.id,
            latitude: station.lat,
            longitude: station.lng,
            brand: station.brand || station.name
          }
        });

        imported.push({
          id: saved.id,
          externalFuelPriceId: station.id,
          name: saved.name,
          city: saved.city
        });

        const externalPrices = this.stationFuelTypes(station, pricesByStationId.get(station.id));
        await tx.stationFuel.deleteMany({
          where: {
            stationId: saved.id,
            priceSource: this.provider.name,
            externalFuelType: {
              notIn: externalPrices.map(price => price.externalFuelType)
            }
          }
        });

        for (const externalPrice of externalPrices) {
          const externalFuelType = externalPrice.externalFuelType;
          const fuel = fuelByExternalType.get(externalFuelType);
          if (!fuel) {
            continue;
          }

          await tx.stationFuel.upsert({
            where: {
              stationId_fuelId: {
                stationId: saved.id,
                fuelId: fuel.id
              }
            },
            create: {
              stationId: saved.id,
              fuelId: fuel.id,
              pricePerLiter: externalPrice.pricePerLiter,
              availableQuantity: 0,
              priceSource: this.provider.name,
              priceUpdatedAt: externalPrice.reportedAt || new Date(),
              priceCurrency: 'PLN',
              priceVolumeUnit: 'liter',
              externalFuelType,
              isEstimated: externalPrice.source === 'estimate'
            },
            update: {
              pricePerLiter: externalPrice.pricePerLiter,
              priceUpdatedAt: externalPrice.reportedAt || new Date(),
              externalFuelType,
              priceSource: this.provider.name,
              priceCurrency: 'PLN',
              priceVolumeUnit: 'liter',
              isEstimated: externalPrice.source === 'estimate'
            }
          });
          stationFuelCount += 1;
        }
      });

      isExisting ? updatedCount += 1 : createdCount += 1;
    }

    await this.auditRepo.create(
      actorUsername,
      'BENZYNAMAPA_STATION_IMPORT',
      `Import stacji BenzynaMAPA: dodano ${createdCount}, zaktualizowano ${updatedCount}, paliwa ${stationFuelCount}.`
    );

    return {
      provider: this.provider.name,
      totalSourceStationCount: stations.length,
      importedStationCount: imported.length,
      createdCount,
      updatedCount,
      stationFuelCount,
      imported
    };
  }

  private async syncStationPrices(
    station: StationForSync,
    externalPrices: BenzynaMapaFuelPrice[],
    actorUsername: string,
    auditSingleStation: boolean
  ): Promise<SyncResult> {
    try {
      if (externalPrices.length === 0) {
        const result: SyncResult = {
          stationId: station.id,
          stationName: station.name,
          status: 'skipped',
          updatedCount: 0,
          skippedCount: station.fuels.length,
          message: 'Brak cen dla stacji w danych BenzynaMAPA.'
        };

        if (auditSingleStation) {
          await this.auditRepo.create(
            actorUsername,
            'FUEL_PRICE_SYNC',
            `Synchronizacja cen BenzynaMAPA dla stacji ${station.name}: brak cen w danych zewnętrznych.`
          );
        }

        return result;
      }

      let updatedCount = 0;
      let skippedCount = 0;
      const catalogFuels = await prisma.fuel.findMany();

      for (const externalPrice of externalPrices) {
        const stationFuel = station.fuels.find(candidate => this.matchesLocalFuel(externalPrice, candidate.fuel.name, candidate.fuel.type));
        const catalogFuel = stationFuel
          ? null
          : catalogFuels.find(candidate => this.matchesLocalFuel(externalPrice, candidate.name, candidate.type));
        const fuelId = stationFuel?.fuelId ?? catalogFuel?.id;

        if (!fuelId) {
          skippedCount += 1;
          continue;
        }

        await prisma.stationFuel.upsert({
          where: {
            stationId_fuelId: {
              stationId: station.id,
              fuelId
            }
          },
          create: {
            stationId: station.id,
            fuelId,
            pricePerLiter: externalPrice.pricePerLiter,
            availableQuantity: 0,
            priceSource: this.provider.name,
            priceUpdatedAt: externalPrice.reportedAt || new Date(),
            priceCurrency: 'PLN',
            priceVolumeUnit: 'liter',
            externalFuelType: externalPrice.externalFuelType,
            isEstimated: externalPrice.source === 'estimate'
          },
          update: {
            pricePerLiter: externalPrice.pricePerLiter,
            priceSource: this.provider.name,
            priceUpdatedAt: externalPrice.reportedAt || new Date(),
            priceCurrency: 'PLN',
            priceVolumeUnit: 'liter',
            externalFuelType: externalPrice.externalFuelType,
            isEstimated: externalPrice.source === 'estimate'
          }
        });

        updatedCount += 1;
      }

      const result: SyncResult = {
        stationId: station.id,
        stationName: station.name,
        status: updatedCount > 0 ? 'updated' : 'skipped',
        updatedCount,
        skippedCount
      };

      if (auditSingleStation) {
        await this.auditRepo.create(
          actorUsername,
          'FUEL_PRICE_SYNC',
          `Synchronizacja cen BenzynaMAPA dla stacji ${station.name}: zaktualizowano ${updatedCount}, pominięto ${skippedCount}.`
        );
      }

      return result;
    } catch (error: any) {
      if (auditSingleStation) {
        await this.auditRepo.create(
          actorUsername,
          'FUEL_PRICE_SYNC_FAILED',
          `Błąd synchronizacji cen BenzynaMAPA dla stacji ${station.name}: ${error.message}`
        );
      }

      return {
        stationId: station.id,
        stationName: station.name,
        status: 'failed',
        updatedCount: 0,
        skippedCount: station.fuels.length,
        message: error.message
      };
    }
  }

  getStatus() {
    return {
      provider: this.provider.name,
      configured: this.provider.isConfigured(),
      pricesEndpoint: this.provider.getPricesEndpoint(),
      stationsEndpoint: this.provider.getStationsEndpoint(),
      requiredEnv: null
    };
  }

  private filterStations(stations: BenzynaMapaStation[], options: ImportStationsOptions) {
    const city = this.normalize(options.city || '');
    const brand = this.normalize(options.brand || '');
    const search = this.normalize(options.search || '');
    const limit = options.all ? stations.length : Math.min(Math.max(Number(options.limit || 100), 1), 10000);

    return stations
      .filter(station => !city || this.normalize(station.city || '') === city)
      .filter(station => !brand || this.normalize(station.brand || station.name || '').includes(brand))
      .filter(station => {
        if (!search) {
          return true;
        }

        return this.normalize([
          station.name,
          station.brand,
          station.address,
          station.city,
          station.id
        ].filter(Boolean).join(' ')).includes(search);
      })
      .slice(0, limit);
  }

  private stationFuelTypes(station: BenzynaMapaStation, prices?: BenzynaMapaFuelPrice[]): BenzynaMapaFuelPrice[] {
    if (prices && prices.length > 0) {
      return prices;
    }

    return [];
  }

  private matchesFuelCatalog(localName: string, localType: string, externalFuelType: string) {
    return this.matchesLocalFuel(
      { externalFuelType: externalFuelType as BenzynaMapaFuelPrice['externalFuelType'], pricePerLiter: 0, source: 'catalog' },
      localName,
      localType
    );
  }

  private toLocalStationId(externalId: string) {
    return `bm_${Buffer.from(externalId, 'utf8').toString('base64url')}`;
  }

  private toLocalStationName(station: BenzynaMapaStation) {
    const label = station.brand || station.name || 'Stacja paliw';
    const location = [station.city, station.address].filter(Boolean).join(', ');
    return `${label}${location ? ` - ${location}` : ''} [${station.id}]`;
  }

  private isClosed(station: BenzynaMapaStation) {
    return this.normalize(`${station.name} ${station.opening_hours || ''}`).includes('zamknieta');
  }

  private matchesLocalFuel(externalPrice: BenzynaMapaFuelPrice, localName: string, localType: string) {
    const external = this.normalize(externalPrice.externalFuelType);
    const name = this.normalize(localName);
    const type = this.normalize(localType);

    if (name.includes('adblue')) {
      return false;
    }

    if (name.includes('pb98') || (name.includes('98') && !name.includes('95'))) {
      return external === 'pb98';
    }

    if (name.includes('pb95') || (name.includes('95') && !name.includes('98')) || name.includes('super')) {
      return external === 'pb95';
    }

    if (type.includes('diesel') || name.includes('ekodiesel') || name.includes('eurodiesel') || name === 'on') {
      return external === 'on';
    }

    if (type.includes('lpg') || name.includes('lpg')) {
      return external === 'lpg';
    }

    return external.includes(name) || external.includes(type);
  }

  private normalize(value: string) {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');
  }
}
