import { Request, Response } from 'express';
import { FuelService } from '../services/fuel.service';

const fuelService = new FuelService();

export class FuelController {
  async getAll(req: Request, res: Response) {
    try {
      const data = await fuelService.getAllFuels();
       res.status(200).json(data);
    } catch (err: any) {
       res.status(500).json({ error: err.message });
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data = await fuelService.getFuelById(id);
       res.status(200).json(data);
    } catch (err: any) {
       res.status(404).json({ error: err.message });
    }
  }

  async create(req: any, res: Response) {
    try {
      const actorUsername = req.user?.username || 'admin';
      const data = await fuelService.createFuel(req.body, actorUsername);
       res.status(201).json(data);
    } catch (err: any) {
       res.status(400).json({ error: err.message });
    }
  }

  async update(req: any, res: Response) {
    try {
      const { id } = req.params;
      const actorUsername = req.user?.username || 'admin';
      const data = await fuelService.updateFuel(id, req.body, actorUsername);
       res.status(200).json(data);
    } catch (err: any) {
       res.status(400).json({ error: err.message });
    }
  }

  async delete(req: any, res: Response) {
    try {
      const { id } = req.params;
      const actorUsername = req.user?.username || 'admin';
      await fuelService.deleteFuel(id, actorUsername);
       res.status(204).send();
    } catch (err: any) {
       res.status(400).json({ error: err.message });
    }
  }
}
