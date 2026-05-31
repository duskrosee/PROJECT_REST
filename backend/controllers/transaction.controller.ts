import { Request, Response } from 'express';
import { TransactionService } from '../services/transaction.service';

const transactionService = new TransactionService();

export class TransactionController {
  async getByStation(req: Request, res: Response) {
    try {
      const { stationId } = req.query;
      const data = await transactionService.getTransactions(stationId as string);
       res.status(200).json(data);
    } catch (err: any) {
       res.status(500).json({ error: err.message });
    }
  }

  async getAll(req: Request, res: Response) {
    try {
      const data = await transactionService.getTransactions();
       res.status(200).json(data);
    } catch (err: any) {
       res.status(500).json({ error: err.message });
    }
  }

  async create(req: Request, res: Response) {
    try {
      const { id } = req.params; // stationId
      const { fuelId, liters, buyerName, worker, paymentMethod, status, calcType, amountPLN } = req.body;

      if (!fuelId) {
         res.status(400).json({ error: 'Dane wejściowe są nieprawidłowe. Wymagane: fuelId.' });
         return;
      }

      // If user provided a price-based amount, we can resolve it inside createTransaction
      const inputLiters = liters !== undefined ? parseFloat(liters) : 0;

      const receipt = await transactionService.createTransaction(
        id,
        fuelId,
        inputLiters,
        buyerName || 'Klient Anonimowy',
        worker || 'Pracownik 1',
        paymentMethod || 'Gotówka',
        status || 'opłacona',
        calcType || 'liters',
        amountPLN !== undefined ? parseFloat(amountPLN) : undefined
      );

       res.status(201).json(receipt);
    } catch (err: any) {
      if (err.message.includes('nie istnieje') || err.message.includes('Brak stacji')) {
         res.status(404).json({ error: err.message });
      } else {
         res.status(400).json({ error: err.message });
      }
    }
  }
}
