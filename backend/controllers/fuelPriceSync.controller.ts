import { Response } from 'express';
import { FuelPriceSyncService } from '../services/fuelPriceSync.service';

const fuelPriceSyncService = new FuelPriceSyncService();

export class FuelPriceSyncController {
  async getStatus(req: any, res: Response) {
    try {
      res.status(200).json(fuelPriceSyncService.getStatus());
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  async syncAll(req: any, res: Response) {
    try {
      const actorUsername = req.user?.username || 'admin';
      const data = await fuelPriceSyncService.syncAll(actorUsername);
      res.status(200).json(data);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  async importStations(req: any, res: Response) {
    try {
      const actorUsername = req.user?.username || 'admin';
      const data = await fuelPriceSyncService.importStations(actorUsername, {
        city: req.query.city as string,
        brand: req.query.brand as string,
        search: req.query.search as string,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
        all: req.query.all === 'true'
      });
      res.status(200).json(data);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  async syncStation(req: any, res: Response) {
    try {
      const { id } = req.params;
      const actorUsername = req.user?.username || 'admin';
      const data = await fuelPriceSyncService.syncStation(id, actorUsername);
      res.status(200).json(data);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
}
