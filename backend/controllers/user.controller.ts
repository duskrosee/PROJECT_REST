import { Request, Response } from 'express';
import { UserService } from '../services/user.service';

const userService = new UserService();

export class UserController {
  async login(req: Request, res: Response) {
    try {
      const { username, password } = req.body;
      const result = await userService.login(username, password);
       res.status(200).json(result);
    } catch (err: any) {
       res.status(401).json({ error: err.message });
    }
  }

  async getAll(req: Request, res: Response) {
    try {
      const data = await userService.getAllUsers();
       res.status(200).json(data);
    } catch (err: any) {
       res.status(500).json({ error: err.message });
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data = await userService.getUserById(id);
       res.status(200).json(data);
    } catch (err: any) {
       res.status(404).json({ error: err.message });
    }
  }

  async create(req: Request, res: Response) {
    try {
      const data = await userService.createUser(req.body);
       res.status(201).json(data);
    } catch (err: any) {
       res.status(400).json({ error: err.message });
    }
  }

  async update(req: any, res: Response) {
    try {
      const { id } = req.params;
      const actorUsername = req.user?.username || 'admin';
      const data = await userService.updateUser(id, req.body, actorUsername);
       res.status(200).json(data);
    } catch (err: any) {
       res.status(400).json({ error: err.message });
    }
  }

  async delete(req: any, res: Response) {
    try {
      const { id } = req.params;
      const actorUsername = req.user?.username || 'admin';
      await userService.deleteUser(id, actorUsername);
       res.status(204).send();
    } catch (err: any) {
       res.status(400).json({ error: err.message });
    }
  }
}
