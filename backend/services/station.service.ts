import { StationRepository } from '../repositories/station.repository';
import { FuelRepository } from '../repositories/fuel.repository';
import { AuditLogRepository } from '../repositories/audit.repository';
import { CreateStationDto, UpdateStationDto } from '../dtos/station.dto';

export class StationService {
  private stationRepo = new StationRepository();
  private fuelRepo = new FuelRepository();
  private auditRepo = new AuditLogRepository();

  async getAllStations(filters?: {
    city?: string;
    status?: string;
    fuelId?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
  }) {
    return await this.stationRepo.findAll(filters);
  }

  async getStationById(id: string) {
    const station = await this.stationRepo.findById(id);
    if (!station) {
      throw new Error('Stacja o podanym ID nie istnieje');
    }
    return station;
  }

  async createStation(dto: CreateStationDto, actorUsername: string) {
    if (!dto.name || !dto.address || !dto.city || !dto.workingHours) {
      throw new Error('Pola: name, address, city, workingHours są wymagane');
    }

    const id = 'st_' + dto.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const existing = await this.stationRepo.findById(id);
    if (existing) {
      throw new Error('Stacja o podanym ID lub nazwie już istnieje');
    }

    if (dto.fuels && Array.isArray(dto.fuels)) {
      for (const f of dto.fuels) {
        const fuel = await this.fuelRepo.findById(f.fuelId);
        if (!fuel) {
          throw new Error(`Paliwo o ID ${f.fuelId} nie istnieje w katalogu`);
        }
      }
    }

    if (dto.status && !['czynna', 'nieczynna'].includes(dto.status)) {
      throw new Error('Walidacja: Dozwolone statusy stacji to: "czynna", "nieczynna".');
    }

    const station = await this.stationRepo.create(id, dto);
    await this.auditRepo.create(actorUsername, 'STATION_CREATE', `Dodano nową stację benzynową: ${dto.name} w ${dto.city}`);
    return station;
  }

  async updateStation(id: string, dto: UpdateStationDto, actorUsername: string) {
    const station = await this.stationRepo.findById(id);
    if (!station) {
      throw new Error('Stacja paliw o podanym ID nie istnieje');
    }

    if (dto.fuels !== undefined) {
      if (!Array.isArray(dto.fuels)) {
        throw new Error('Paliwo na stacji posiada nieprawidłowy format tablicy');
      }

      for (const f of dto.fuels) {
        const fuel = await this.fuelRepo.findById(f.fuelId);
        if (!fuel) {
          throw new Error(`Paliwo o ID ${f.fuelId} nie istnieje w katalogu`);
        }

        const price = parseFloat(f.pricePerLiter as any);
        const qty = parseFloat(f.availableQuantity as any);

        if (isNaN(price) || price < 0 || isNaN(qty) || qty < 0) {
          throw new Error('Wartości ceny i ilości paliwa muszą być poprawnymi liczbami nieujemnymi');
        }
      }
    }

    if (dto.status !== undefined && !['czynna', 'nieczynna'].includes(dto.status)) {
      throw new Error('Walidacja: Dozwolone statusy stacji to: "czynna", "nieczynna".');
    }

    const updated = await this.stationRepo.update(id, dto);
    await this.auditRepo.create(actorUsername, 'STATION_UPDATE', `Zaktualizowano dane stacji ${station.name}`);
    return updated;
  }

  async deleteStation(id: string, actorUsername: string) {
    const station = await this.stationRepo.findById(id);
    if (!station) {
      throw new Error('Stacja paliw o podanym ID nie istnieje');
    }

    await this.stationRepo.delete(id);
    await this.auditRepo.create(actorUsername, 'STATION_DELETE', `Usunięto stację paliw ${station.name}`);
    return true;
  }
}
