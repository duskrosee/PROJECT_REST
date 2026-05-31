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
    calcType: string = "liters"
  ) {
    // We execute this as a Prisma transaction to decrement inventory (if successful) and create the purchase receipt atomically
    return await prisma.$transaction(async (tx) => {
      // 1. Create transaction log
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
          timestamp: new Date()
        }
      });

      // 2. Decrement the inventory from the station fuel stock ONLY if the payment status is successful ("opłacona")
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
