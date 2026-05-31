import { FuelRepository } from '../repositories/fuel.repository';
import { AuditLogRepository } from '../repositories/audit.repository';
import { CreateFuelDto, UpdateFuelDto } from '../dtos/fuel.dto';

export class FuelService {
  private fuelRepo = new FuelRepository();
  private auditRepo = new AuditLogRepository();

  async getAllFuels() {
    return await this.fuelRepo.findAll();
  }

  async getFuelById(id: string) {
    const fuel = await this.fuelRepo.findById(id);
    if (!fuel) {
      throw new Error('Paliwo o podanym ID nie istnieje');
    }
    return fuel;
  }

  async createFuel(dto: CreateFuelDto, actorUsername: string) {
    if (!dto.name || !dto.type || dto.pricePerLiter === undefined || dto.availableQuantity === undefined) {
      throw new Error('Pola: name, type, pricePerLiter i availableQuantity są wymagane.');
    }

    if (!['benzyna', 'diesel', 'LPG', 'inne'].includes(dto.type)) {
      throw new Error('Prawidłowe typy paliwa to: benzyna, diesel, LPG, lub inne.');
    }

    const price = parseFloat(dto.pricePerLiter as any);
    const qty = parseFloat(dto.availableQuantity as any);

    if (isNaN(price) || price <= 0) {
      throw new Error('Cena paliwa musi być większa od zera');
    }

    if (isNaN(qty) || qty < 0) {
      throw new Error('Ilość paliwa musi być liczbą nieujemną.');
    }

    const existingFuel = await this.fuelRepo.findByName(dto.name);
    if (existingFuel) {
      throw new Error(`Paliwo o nazwie '${dto.name}' już istnieje.`);
    }

    const id = 'fuel_' + dto.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const fuel = await this.fuelRepo.create(id, {
      ...dto,
      pricePerLiter: price,
      availableQuantity: qty
    });

    await this.auditRepo.create(actorUsername, 'FUEL_CREATE', `Dodano paliwo ${dto.name} (${dto.type})`);
    return fuel;
  }

  async updateFuel(id: string, dto: UpdateFuelDto, actorUsername: string) {
    const fuel = await this.fuelRepo.findById(id);
    if (!fuel) {
      throw new Error('Paliwo o podanym ID nie istnieje');
    }

    if (dto.name) {
      const existing = await this.fuelRepo.findByName(dto.name);
      if (existing && existing.id !== id) {
        throw new Error(`Paliwo o nazwie '${dto.name}' już istnieje.`);
      }
    }

    if (dto.type && !['benzyna', 'diesel', 'LPG', 'inne'].includes(dto.type)) {
      throw new Error('Niepoprawny typ paliwa');
    }

    let price = dto.pricePerLiter;
    if (price !== undefined) {
      price = parseFloat(price as any);
      if (isNaN(price) || price <= 0) {
        throw new Error('Nieprawidłowa cena');
      }
    }

    let qty = dto.availableQuantity;
    if (qty !== undefined) {
      qty = parseFloat(qty as any);
      if (isNaN(qty) || qty < 0) {
        throw new Error('Nieprawidłowa ilość');
      }
    }

    const updated = await this.fuelRepo.update(id, {
      ...dto,
      pricePerLiter: price,
      availableQuantity: qty
    });

    await this.auditRepo.create(actorUsername, 'FUEL_UPDATE', `Zaktualizowano paliwo o ID: ${id}`);
    return updated;
  }

  async deleteFuel(id: string, actorUsername: string) {
    const fuel = await this.fuelRepo.findById(id);
    if (!fuel) {
      throw new Error('Paliwo o podanym ID nie istnieje');
    }

    await this.fuelRepo.delete(id);
    await this.auditRepo.create(actorUsername, 'FUEL_DELETE', `Usunięto paliwo ${fuel.name} oraz odczepiono je ze wszystkich stacji.`);
    return true;
  }
}
