import { prisma } from '../database';

export class TransactionRepository {
  async findAll(filters: { stationId?: string } = {}) {
    const where: any = {};
    if (filters.stationId) {
      where.stationId = filters.stationId;
    }

    return await prisma.transaction.findMany({
      where,
      orderBy: { timestamp: 'desc' }
    });
  }

  async findById(id: string) {
    return await prisma.transaction.findUnique({
      where: { id }
    });
  }

  async findByCheckoutToken(checkoutToken: string) {
    return await prisma.transaction.findUnique({
      where: { checkoutToken }
    });
  }

  async createTransaction(
      stationId: string,
      fuelId: string,
      fuelName: string,
      liters: number,
      pricePerLiter: number,
      totalPrice: number,
      buyerName: string,
      worker?: string,
      paymentMethod?: string,
      status: string = "opłacona",
      calcType: string = "liters",
      extra: {
        originalPrice?: number;
        discountApplied?: number;
        couponCode?: string;
        checkoutToken?: string;
      } = {}
  ) {
    return await prisma.$transaction(async (tx) => {
      const txRecord = await tx.transaction.create({
        data: {
          stationId,
          fuelId,
          fuelName,
          liters,
          pricePerLiter,
          totalPrice,
          buyerName,
          worker,
          paymentMethod,
          status,
          calcType,
          timestamp: new Date(),
          originalPrice: extra.originalPrice,
          discountApplied: extra.discountApplied ?? 0,
          couponCode: extra.couponCode,
          checkoutToken: extra.checkoutToken,
        }
      });

      if (status === 'opłacona') {
        await tx.stationFuel.update({
          where: {
            stationId_fuelId: {
              stationId,
              fuelId
            }
          },
          data: {
            availableQuantity: {
              decrement: liters
            }
          }
        });
      }

      return txRecord;
    });
  }
}
