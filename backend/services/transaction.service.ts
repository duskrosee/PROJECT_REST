import { TransactionRepository } from '../repositories/transaction.repository';
import { StationRepository } from '../repositories/station.repository';
import { AuditLogRepository } from '../repositories/audit.repository';
import { CouponService } from './coupon.service';
import { prisma } from '../database';

export class TransactionService {
  private transactionRepo = new TransactionRepository();
  private stationRepo = new StationRepository();
  private auditRepo = new AuditLogRepository();
  private couponService = new CouponService();

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
      status: string = 'opłacona',
      calcType: string = 'liters',
      amountPLN?: number,
      couponCode?: string,
      checkoutToken?: string
  ) {
    const station = await this.stationRepo.findById(stationId);
    if (!station) {
      throw new Error('Stacja paliw o podanym ID nie istnieje w systemie.');
    }

    if (station.status === 'nieczynna') {
      throw new Error('Odrzucono: Transakcja została zablokowana. Stacja paliw jest obecnie nieczynna.');
    }

    const stationFuelMatch = station.fuels.find((f) => f.fuelId === fuelId);
    if (!stationFuelMatch) {
      throw new Error('Odrzucono: Wybrana stacja nie oferuje tego asortymentu paliw.');
    }

    const pricePerLiter = stationFuelMatch.pricePerLiter;

    let finalLiters = liters;
    if (calcType === 'price' && amountPLN !== undefined && amountPLN > 0) {
      finalLiters = parseFloat((amountPLN / pricePerLiter).toFixed(4));
    }

    if (!fuelId || !buyerName) {
      throw new Error('Walidacja: Identyfikator paliwa (fuelId) oraz nazwa nabywcy (buyerName) są wymagane.');
    }

    if (isNaN(finalLiters) || finalLiters <= 0) {
      throw new Error('Walidacja: Ilość litrów musi być liczbą większą od zera.');
    }

    if (status === 'opłacona' && finalLiters > stationFuelMatch.availableQuantity) {
      throw new Error(
          `Odrzucono: Brak odpowiednich zapasów. Maksymalna dostępna ilość na stacji to ${stationFuelMatch.availableQuantity} litrów, próba zakupu: ${finalLiters.toFixed(2)} litrów.`
      );
    }

    const fuelCatalog = await prisma.fuel.findUnique({ where: { id: fuelId } });
    const fuelName = fuelCatalog ? fuelCatalog.name : 'Paliwo';

    const originalPrice =
        calcType === 'price' && amountPLN !== undefined
            ? parseFloat(amountPLN.toFixed(2))
            : parseFloat((pricePerLiter * finalLiters).toFixed(2));

    let discountApplied = 0;
    let appliedCouponCode: string | null = null;

    if (couponCode && couponCode.trim().length > 0) {
      const coupon = await this.couponService.validate(couponCode.trim());
      if (!coupon) {
        throw new Error('Odrzucono: Podany kupon jest nieprawidłowy lub wygasł.');
      }
      discountApplied = parseFloat(
          ((originalPrice * coupon.discountPercent) / 100).toFixed(2)
      );
      appliedCouponCode = coupon.code;
    }

    const totalPrice = parseFloat((originalPrice - discountApplied).toFixed(2));

    if (totalPrice < 0) {
      throw new Error('Walidacja: Wyliczona kwota końcowa jest nieprawidłowa.');
    }

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
        calcType,
        {
          originalPrice,
          discountApplied,
          couponCode: appliedCouponCode,
          checkoutToken: checkoutToken ?? null,
        }
    );

    const discountInfo =
        discountApplied > 0
            ? ` (rabat: ${discountApplied} zł, kupon: ${appliedCouponCode})`
            : '';

    await this.auditRepo.create(
        buyerName || 'KLIENT',
        'FUEL_PURCHASE',
        `Zakupowano ${finalLiters.toFixed(2)}l ${fuelName} na stacji ${station.name} za sumę ${totalPrice} zł${discountInfo} (Status: ${status}, Pracownik: ${worker || 'Brak'}, Płatność: ${paymentMethod || 'Brak'})`
    );

    return receipt;
  }
}
