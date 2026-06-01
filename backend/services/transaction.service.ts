import { TransactionRepository } from '../repositories/transaction.repository';
import { StationRepository } from '../repositories/station.repository';
import { AuditLogRepository } from '../repositories/audit.repository';
import { prisma } from '../database';

export class TransactionService {
  private transactionRepo = new TransactionRepository();
  private stationRepo = new StationRepository();
  private auditRepo = new AuditLogRepository();

  async getTransactions(stationId?: string) {
    return await this.transactionRepo.findAll({ stationId });
  }

  async createTransaction(
    stationId: string,
    fuelId: string,
    liters: number,
    buyerName: string,
    worker?: string,
    paymentMethod?: string,
    status: string = "opłacona",
    calcType: string = "liters",
    amountPLN?: number
  ) {
    // 1. Load and verify station early to resolve fuel pricing if calcType is 'price'
    const station = await this.stationRepo.findById(stationId);
    if (!station) {
      throw new Error('Stacja paliw o podanym ID nie istnieje w systemie.');
    }

    // 2. Block transaction if station status is "nieczynna"
    if (station.status === 'nieczynna') {
      throw new Error('Odrzucono: Transakcja została zablokowana. Stacja paliw jest obecnie nieczynna.');
    }

    // 3. Verify stock relationship and catalog association
    const stationFuelMatch = station.fuels.find(f => f.fuelId === fuelId);
    if (!stationFuelMatch) {
      throw new Error('Odrzucono: Wybrana stacja nie oferuje tego asortymentu paliw.');
    }

    // 4. Calculate liters if calcType is 'price' and amountPLN is provided
    let finalLiters = liters;
    if (calcType === 'price' && amountPLN !== undefined && amountPLN > 0) {
      finalLiters = parseFloat((amountPLN / stationFuelMatch.pricePerLiter).toFixed(4));
    }

    // 5. Validation of essential input bounds
    if (!fuelId || !buyerName) {
      throw new Error('Walidacja: Identyfikator paliwa (fuelId) oraz nazwa nabywcy (buyerName) są wymagane.');
    }

    if (isNaN(finalLiters) || finalLiters <= 0) {
      throw new Error('Walidacja: Ilość litrów musi być liczbą większą od zera.');
    }

    // 6. Block transaction if quantity exceeds stock and status is successful ("opłacona")
    if (status === 'opłacona' && finalLiters > stationFuelMatch.availableQuantity) {
      throw new Error(`Odrzucono: Brak odpowiednich zapasów. Maksymalna dostępna ilość na stacji to ${stationFuelMatch.availableQuantity} litrów, próba zakupu: ${finalLiters.toFixed(2)} litrów.`);
    }

    // 7. Look up the fuel's name from directory catalog
    const fuelCatalog = await prisma.fuel.findUnique({
      where: { id: fuelId }
    });
    const fuelName = fuelCatalog ? fuelCatalog.name : 'Paliwo';

    // 8. Calculate calculations
    const pricePerLiter = stationFuelMatch.pricePerLiter;
    const totalPrice = calcType === 'price' && amountPLN !== undefined ? amountPLN : parseFloat((pricePerLiter * finalLiters).toFixed(2));

    // 9. Execute atomic persistence
    const receipt = await this.transactionRepo.createTransaction(
      stationId,
      fuelId,
      fuelName,
      finalLiters,
      pricePerLiter,
      totalPrice,
      buyerName,
      worker,
      paymentMethod,
      status,
      calcType
    );

    // 10. Document auditing
    await this.auditRepo.create(
      buyerName || 'KLIENT',
      'FUEL_PURCHASE',
      `Zakupowano ${finalLiters.toFixed(2)}l ${fuelName} na stacji ${station.name} za sumę ${totalPrice} zł (Status: ${status}, Pracownik: ${worker || 'Brak'}, Płatność: ${paymentMethod || 'Brak'})`
    );

    return receipt;
  }
}
