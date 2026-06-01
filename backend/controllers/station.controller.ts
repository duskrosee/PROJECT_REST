import { Request, Response } from 'express';
import { StationService } from '../services/station.service';

const stationService = new StationService();

export class StationController {
  async getAll(req: Request, res: Response) {
    try {
      const { city, status, fuelId, page, limit, sortBy } = req.query;
      const data = await stationService.getAllStations({
        city: city as string,
        status: status as string,
        fuelId: fuelId as string,
        page: page ? parseInt(page as string, 10) : undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
        sortBy: sortBy as string
      });
       res.status(200).json(data);
    } catch (err: any) {
       res.status(500).json({ error: err.message });
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data = await stationService.getStationById(id);
       res.status(200).json(data);
    } catch (err: any) {
       res.status(404).json({ error: err.message });
    }
  }

  async create(req: any, res: Response) {
    try {
      const actorUsername = req.user?.username || 'admin';
      const data = await stationService.createStation(req.body, actorUsername);
       res.status(201).json(data);
    } catch (err: any) {
       res.status(400).json({ error: err.message });
    }
  }

  async update(req: any, res: Response) {
    try {
      const { id } = req.params;
      const actorUsername = req.user?.username || 'admin';
      const data = await stationService.updateStation(id, req.body, actorUsername);
       res.status(200).json(data);
    } catch (err: any) {
       res.status(400).json({ error: err.message });
    }
  }

  async delete(req: any, res: Response) {
    try {
      const { id } = req.params;
      const actorUsername = req.user?.username || 'admin';
      await stationService.deleteStation(id, actorUsername);
       res.status(204).send();
    } catch (err: any) {
       res.status(400).json({ error: err.message });
    }
  }
}
