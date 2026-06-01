import { Router } from 'express';
import { UserController } from './controllers/user.controller';
import { FuelController } from './controllers/fuel.controller';
import { StationController } from './controllers/station.controller';
import { TransactionController } from './controllers/transaction.controller';
import { AuditLogController } from './controllers/audit.controller';
import { requireAuth, requireAdmin } from './middlewares/auth.middleware';

export const apiRouter = Router();

const userController = new UserController();
const fuelController = new FuelController();
const stationController = new StationController();
const transactionController = new TransactionController();
const auditController = new AuditLogController();

// Auth Endpoints
apiRouter.post('/auth/login', (req, res) => userController.login(req, res));
apiRouter.post('/api/auth/login', (req, res) => userController.login(req, res));

// User Endpoints (admin only)
apiRouter.get('/users', requireAdmin, (req, res) => userController.getAll(req, res));
apiRouter.get('/api/users', requireAdmin, (req, res) => userController.getAll(req, res));
apiRouter.get('/users/:id', requireAdmin, (req, res) => userController.getById(req, res));
apiRouter.get('/api/users/:id', requireAdmin, (req, res) => userController.getById(req, res));
apiRouter.post('/users', requireAdmin, (req, res) => userController.create(req, res));
apiRouter.post('/api/users', requireAdmin, (req, res) => userController.create(req, res));
apiRouter.put('/users/:id', requireAdmin, (req, res) => userController.update(req, res));
apiRouter.put('/api/users/:id', requireAdmin, (req, res) => userController.update(req, res));
apiRouter.delete('/users/:id', requireAdmin, (req, res) => userController.delete(req, res));
apiRouter.delete('/api/users/:id', requireAdmin, (req, res) => userController.delete(req, res));

// Fuel Endpoints
apiRouter.get('/fuels', (req, res) => fuelController.getAll(req, res));
apiRouter.get('/api/fuels', (req, res) => fuelController.getAll(req, res));
apiRouter.get('/fuels/:id', (req, res) => fuelController.getById(req, res));
apiRouter.get('/api/fuels/:id', (req, res) => fuelController.getById(req, res));
apiRouter.post('/fuels', requireAdmin, (req, res) => fuelController.create(req, res));
apiRouter.post('/api/fuels', requireAdmin, (req, res) => fuelController.create(req, res));
apiRouter.put('/fuels/:id', requireAdmin, (req, res) => fuelController.update(req, res));
apiRouter.put('/api/fuels/:id', requireAdmin, (req, res) => fuelController.update(req, res));
apiRouter.delete('/fuels/:id', requireAdmin, (req, res) => fuelController.delete(req, res));
apiRouter.delete('/api/fuels/:id', requireAdmin, (req, res) => fuelController.delete(req, res));

// Station Endpoints
apiRouter.get('/stations', (req, res) => stationController.getAll(req, res));
apiRouter.get('/api/stations', (req, res) => stationController.getAll(req, res));
apiRouter.get('/stations/:id', (req, res) => stationController.getById(req, res));
apiRouter.get('/api/stations/:id', (req, res) => stationController.getById(req, res));
apiRouter.post('/stations', requireAdmin, (req, res) => stationController.create(req, res));
apiRouter.post('/api/stations', requireAdmin, (req, res) => stationController.create(req, res));
apiRouter.put('/stations/:id', requireAdmin, (req, res) => stationController.update(req, res));
apiRouter.put('/api/stations/:id', requireAdmin, (req, res) => stationController.update(req, res));
apiRouter.delete('/stations/:id', requireAdmin, (req, res) => stationController.delete(req, res));
apiRouter.delete('/api/stations/:id', requireAdmin, (req, res) => stationController.delete(req, res));

// Transaction Endpoints
apiRouter.post('/stations/:id/transactions', requireAuth, (req, res) => transactionController.create(req, res));
apiRouter.post('/api/stations/:id/transactions', requireAuth, (req, res) => transactionController.create(req, res));
apiRouter.get('/stations/:id/transactions', (req, res) => transactionController.getByStation(req, res));
apiRouter.get('/api/stations/:id/transactions', (req, res) => transactionController.getByStation(req, res));
apiRouter.get('/transactions', (req, res) => transactionController.getAll(req, res));
apiRouter.get('/api/transactions', (req, res) => transactionController.getAll(req, res));

// Audit Logs (admin only)
apiRouter.get('/api/logs', requireAdmin, (req, res) => auditController.getLogs(req, res));
