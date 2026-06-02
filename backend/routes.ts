import { Router } from 'express';
import { UserController } from './controllers/user.controller';
import { FuelController } from './controllers/fuel.controller';
import { StationController } from './controllers/station.controller';
import { TransactionController } from './controllers/transaction.controller';
import { AuditLogController } from './controllers/audit.controller';
import { authorizeJwt } from './middlewares/auth.middleware';
import { CouponService } from './services/coupon.service';
import { CheckoutService } from './services/checkout.service';
import { TransactionService } from './services/transaction.service';

export const apiRouter = Router();

const userController = new UserController();
const fuelController = new FuelController();
const stationController = new StationController();
const transactionController = new TransactionController();
const auditController = new AuditLogController();

const couponService = new CouponService();
const checkoutService = new CheckoutService();
const transactionService = new TransactionService();

// 1. Проверка купона (Preview discount)
apiRouter.post('/api/coupons/validate', async (req, res) => {
    try {
        const coupon = await couponService.validate(req.body.code);
        res.json({ code: coupon!.code, discountPercent: coupon!.discountPercent });
    } catch (e: any) {
        res.status(400).json({ error: e.message });
    }
});

// 2. Создание платежной сессии (Create payment session)
apiRouter.post('/api/checkout/create', async (req, res) => {
    try {
        const { stationId, fuelId, liters, buyerName, worker, couponCode, calcType } = req.body;

        if (couponCode) {
            await couponService.validate(couponCode);
        }

        const token = checkoutService.create({
            stationId, fuelId, liters, buyerName, worker, couponCode, calcType,
        });

        res.json({ token });
    } catch (e: any) {
        res.status(400).json({ error: e.message });
    }
});

// 3. Подтверждение оплаты (Finalize payment)
apiRouter.post('/api/checkout/:token/confirm', async (req, res) => {
    try {
        const session = checkoutService.consume(req.params.token);
        const { paymentMethod } = req.body;

        const receipt = await transactionService.createTransaction(
            session.stationId,
            session.fuelId,
            session.liters,
            session.buyerName,
            session.worker,
            paymentMethod,
            'opłacona',
            session.calcType,
            undefined,
            session.couponCode,
            session.token
        );

        res.json(receipt);
    } catch (e: any) {
        res.status(400).json({ error: e.message });
    }
});

// Auth Endpoints
apiRouter.post('/auth/login', (req, res) => userController.login(req, res));
apiRouter.post('/api/auth/login', (req, res) => userController.login(req, res));

// User Endpoints
apiRouter.get('/users', (req, res) => userController.getAll(req, res));
apiRouter.get('/api/users', (req, res) => userController.getAll(req, res));
apiRouter.get('/users/:id', (req, res) => userController.getById(req, res));
apiRouter.get('/api/users/:id', (req, res) => userController.getById(req, res));
apiRouter.post('/users', (req, res) => userController.create(req, res));
apiRouter.post('/api/users', (req, res) => userController.create(req, res));
apiRouter.put('/users/:id', authorizeJwt(['admin', 'manager']), (req, res) => userController.update(req, res));
apiRouter.put('/api/users/:id', authorizeJwt(['admin', 'manager']), (req, res) => userController.update(req, res));
apiRouter.delete('/users/:id', authorizeJwt(['admin']), (req, res) => userController.delete(req, res));
apiRouter.delete('/api/users/:id', authorizeJwt(['admin']), (req, res) => userController.delete(req, res));

// Fuel Endpoints
apiRouter.get('/fuels', (req, res) => fuelController.getAll(req, res));
apiRouter.get('/api/fuels', (req, res) => fuelController.getAll(req, res));
apiRouter.get('/fuels/:id', (req, res) => fuelController.getById(req, res));
apiRouter.get('/api/fuels/:id', (req, res) => fuelController.getById(req, res));
apiRouter.post('/fuels', authorizeJwt(['admin', 'manager']), (req, res) => fuelController.create(req, res));
apiRouter.post('/api/fuels', authorizeJwt(['admin', 'manager']), (req, res) => fuelController.create(req, res));
apiRouter.put('/fuels/:id', authorizeJwt(['admin', 'manager']), (req, res) => fuelController.update(req, res));
apiRouter.put('/api/fuels/:id', authorizeJwt(['admin', 'manager']), (req, res) => fuelController.update(req, res));
apiRouter.delete('/fuels/:id', authorizeJwt(['admin']), (req, res) => fuelController.delete(req, res));
apiRouter.delete('/api/fuels/:id', authorizeJwt(['admin']), (req, res) => fuelController.delete(req, res));

// Station Endpoints
apiRouter.get('/stations', (req, res) => stationController.getAll(req, res));
apiRouter.get('/api/stations', (req, res) => stationController.getAll(req, res));
apiRouter.get('/stations/:id', (req, res) => stationController.getById(req, res));
apiRouter.get('/api/stations/:id', (req, res) => stationController.getById(req, res));
apiRouter.post('/stations', authorizeJwt(['admin', 'manager']), (req, res) => stationController.create(req, res));
apiRouter.post('/api/stations', authorizeJwt(['admin', 'manager']), (req, res) => stationController.create(req, res));
apiRouter.put('/stations/:id', authorizeJwt(['admin', 'manager', 'operator']), (req, res) => stationController.update(req, res));
apiRouter.put('/api/stations/:id', authorizeJwt(['admin', 'manager', 'operator']), (req, res) => stationController.update(req, res));
apiRouter.delete('/stations/:id', authorizeJwt(['admin']), (req, res) => stationController.delete(req, res));
apiRouter.delete('/api/stations/:id', authorizeJwt(['admin']), (req, res) => stationController.delete(req, res));

// Transaction Endpoints
apiRouter.post('/stations/:id/transactions', (req, res) => transactionController.create(req, res));
apiRouter.post('/api/stations/:id/transactions', (req, res) => transactionController.create(req, res));
apiRouter.get('/stations/:id/transactions', (req, res) => transactionController.getByStation(req, res));
apiRouter.get('/api/stations/:id/transactions', (req, res) => transactionController.getByStation(req, res));
apiRouter.get('/transactions', (req, res) => transactionController.getAll(req, res));
apiRouter.get('/api/transactions', (req, res) => transactionController.getAll(req, res));

// Audit Logs
apiRouter.get('/api/logs', (req, res) => auditController.getLogs(req, res));
